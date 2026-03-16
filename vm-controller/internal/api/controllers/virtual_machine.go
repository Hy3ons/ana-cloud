package controllers

import (
	"context"
	"fmt"
	http "net/http"
	sync "sync"
	"time"
	"vm-controller/internal/middleware"
	"vm-controller/internal/models"
	k8s_service "vm-controller/internal/services/k8s_service"
	userservice "vm-controller/internal/services/user_service"
	vm_service "vm-controller/internal/services/vm_service"

	gin "github.com/gin-gonic/gin"
	cast "github.com/spf13/cast"
)

type VirtualMachineController struct {
	k8sService  *k8s_service.K8sService
	userService *userservice.UserService
	vmService   *vm_service.VmService
}

var (
	virtualMachineController *VirtualMachineController
	onceVM                   sync.Once
)

func (vmC *VirtualMachineController) RegisterRoutes(r *gin.RouterGroup) {
	vm := r.Group("/vm", middleware.AuthGuard())

	vm.POST("/create", vmC.CreateVM)
	vm.GET("/fetch", vmC.FetchUserVMs)
	vm.POST("/stop", vmC.StopVM)
	vm.DELETE("/delete", vmC.DeleteVM)
	vm.POST("/start", vmC.StartVM)
}

func GetVirtualMachineController() *VirtualMachineController {
	//Sync Once 는 다른 고루틴이 once.Do를 빠져 나오지 못하도록 설계되어 있음.
	onceVM.Do(func() {
		k8s_service, err := k8s_service.GetK8sService()

		if err != nil {
			// Injection 에러가 일어남.
			panic(err)
		}

		virtualMachineController = &VirtualMachineController{
			k8sService: k8s_service,
		}
	})

	// 무조건 할당되어 있습니다.
	return virtualMachineController
}

type CreateVMParams struct {
	VmName        string `json:"vm_name"`
	VmSSHPassword string `json:"vm_ssh_password"`
	VmHost        string `json:"vm_host"`
	// Image List : ubuntu-2204-gold-source archlinux-latest
	VmImage string `json:"vm_image" binding:"required,oneof=ubuntu-2204-gold-source archlinux-latest"`
}

func (vmC *VirtualMachineController) CreateVM(c *gin.Context) {
	var req CreateVMParams

	user_id, _ := c.Get("user_id")

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	fmt.Printf("VM Requests: %v\n", req)

	user, _ := vmC.userService.FetchUserById(user_id.(string), true)

	if !user.Allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "VM creation is not allowed. Please contact the system administrator for approval."})
		return
	}

	// 사용자가 소유한 현재 VM 개수 확인 (2개 이상이면 제한)
	vms, err := vmC.vmService.FetchUserVMs(user_id.(string), false)

	if err == nil && len(vms) >= 2 {
		c.JSON(http.StatusForbidden, gin.H{"error": "최대 VM 개수(2개)를 초과했습니다. 추가적인 가상 머신이 필요하시다면 운영자에게 문의해 주세요."})
		return
	}

	signed_port, err := vmC.vmService.GetAvailablePort()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get available port"})
		return
	}

	// VmHost가 유효한 도메인 형식(예: example.domain.com)인지 검사합니다.
	// 도메인 네임으로 사용될 것이므로 DNS 규약을 준수해야 합니다.
	// 정규식 설명:
	// ^[a-z0-9] : 시작은 영문 소문자나 숫자
	// ([a-z0-9-]*[a-z0-9])? : 중간에 하이픈 가능하지만 끝은 영문 소문자나 숫자
	// (\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ : 점(.) 뒤에 다시 영문 소문자/숫자 패턴 반복 (최소 1번 이상 점 포함)
	// if matched, _ := regexp.MatchString(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$`, req.VmHost); !matched {
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": "VmHost must be in a valid domain format (e.g., example.domain.com)"})
	// 	return
	// }

	hostname := req.VmHost

	vm, err := vmC.k8sService.CreateUserVM(user.Namespace,
		req.VmName, req.VmSSHPassword, hostname, "yaml-data/client-vm", req.VmImage, cast.ToInt32(signed_port))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create VM on K8s"})
		return
	}

	//database 등록 절차를 가져야함.
	_, err = vmC.vmService.CreateUserVM(vm_service.CreateVmParams{
		VmName:     req.VmName,
		VmPassword: req.VmSSHPassword,
		VmImage:    req.VmImage,
		DnsHost:    hostname,
		Namespace:  user.Namespace,
		UserID:     user.ID,
		VmSSHPort:  cast.ToInt32(signed_port),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create VM info on Database"})
		return
	}

	// 프로비저닝 상태를 감시하는 고루틴 실행
	// Timeout을 설정하여 고루틴 누수(goroutine leak)를 방지합니다. 5분으로 넉넉하게 잡습니다.
	go func(namespace, vmName string) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		err := vmC.k8sService.WaitForVMProvisioning(ctx, namespace, vmName)
		if err == nil {
			// 프로비저닝 완료시 Running 상태로 업데이트
			vmC.vmService.UpdateVmStatus(vmName, models.VmStatusRunning)
		} else {
			// 타임아웃 또는 실패시 Failed 상태로 업데이트
			fmt.Printf("VM %s provisioning failed/timeout: %v\n", vmName, err)
			vmC.vmService.UpdateVmStatus(vmName, models.VmStatusFailed)
		}
	}(user.Namespace, req.VmName)

	c.JSON(http.StatusOK, gin.H{"vm": vm})
}

func (vmC *VirtualMachineController) FetchUserVMs(c *gin.Context) {
	user_id, ok := c.Get("user_id")

	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}

	vms, err := vmC.vmService.FetchUserVMs(user_id.(string), false)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch VMs"})
		return
	}

	// Password Is Not Sent To Client
	c.JSON(http.StatusOK, gin.H{"vms": vms})
}

type StopVMParams struct {
	VmName string `json:"vm_name"`
}

func (vmC *VirtualMachineController) StopVM(c *gin.Context) {
	user_id, _ := c.Get("user_id")

	var req StopVMParams

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	u64, err := cast.ToUintE(user_id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id controller 121:30 Switching Error"})
		return
	}

	vm, _ := vmC.vmService.FetchVmName(req.VmName, false)
	if vm.UserID != u64 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	go vmC.k8sService.StopVM(vm)

	c.JSON(http.StatusOK, gin.H{"vm": vm})
}

type StartVMParams struct {
	VmName string `json:"vm_name"`
}

func (vmC *VirtualMachineController) StartVM(c *gin.Context) {
	user_id, _ := c.Get("user_id")

	var req StartVMParams

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	u64, err := cast.ToUintE(user_id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id controller 155:30 Switching Error"})
		return
	}

	vm, _ := vmC.vmService.FetchVmName(req.VmName, false)
	if vm.UserID != u64 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	go vmC.k8sService.StartVM(vm)

	c.JSON(http.StatusOK, gin.H{"vm": vm})
}

type DeleteVMParams struct {
	VmName string `json:"vm_name"`
}

func (vmC *VirtualMachineController) DeleteVM(c *gin.Context) {
	user_id, _ := c.Get("user_id")

	var req DeleteVMParams

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	u64, err := cast.ToUintE(user_id)

	// 파싱 오류 확인.
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id controller 155:30 Switching Error"})
		return
	}

	vm, _ := vmC.vmService.FetchVmName(req.VmName, false)
	// 소유권 확인.
	if vm.UserID != u64 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	go vmC.k8sService.DeleteVM(vm)

	c.JSON(http.StatusOK, gin.H{"vm": vm})
}
