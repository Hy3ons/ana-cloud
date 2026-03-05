package vmservice

import (
	"errors"
	"fmt"
	"sync"
	"vm-controller/internal/db"
	"vm-controller/internal/models"

	"gorm.io/gorm"
)

type VmService struct {
}

var (
	vmService *VmService
	once      sync.Once
)

func GetVmService() *VmService {
	once.Do(func() {
		vmService = &VmService{}
	})

	return vmService
}

func (vmService *VmService) FetchUserVMs(userId string, containPassword bool) ([]models.VirtualMachine, error) {
	db := db.GetDB()

	var vms []models.VirtualMachine

	//유저 ID로 VM 찾기
	if err := db.Where("user_id = ? AND is_deleted = false", userId).Find(&vms).Error; err != nil {
		return nil, err
	}

	if !containPassword {
		for i := range vms {
			vms[i].Password = ""
		}
	}

	return vms, nil
}

func (vmService *VmService) FetchVmName(vmName string, containPassword bool) (*models.VirtualMachine, error) {
	db := db.GetDB()

	var vm models.VirtualMachine

	if err := db.Where("name = ? AND is_deleted = false", vmName).First(&vm).Error; err != nil {
		//하나의 행도 발견 못하면, 다음과 같은 에러를 내뱉음 Gorm
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}

		//그냥 에러 처리.
		return nil, err
	}

	if !containPassword {
		vm.Password = ""
	}

	return &vm, nil
}

func (vmService *VmService) CreateUserVM(params CreateVmParams) (*models.VirtualMachine, error) {
	db := db.GetDB()

	vm := models.VirtualMachine{
		Name:      params.VmName,
		Namespace: params.Namespace,
		Password:  params.VmPassword,
		NodePort:  params.VmSSHPort,
		UserID:    params.UserID,
		Image:     params.VmImage,
		Status:    models.VmStatusProvisioning,
	}

	if err := db.Create(&vm).Error; err != nil {
		return nil, err
	}

	return &vm, nil
}

func (vmService *VmService) UpdateVmStatus(vmName string, status models.EnumVmStatus) error {
	db := db.GetDB()

	if err := db.Model(&models.VirtualMachine{}).Where("name = ? AND is_deleted = false", vmName).Update("status", status).Error; err != nil {
		return err
	}

	return nil
}

func (vmService *VmService) DeleteVm(vmName string) error {
	db := db.GetDB()

	if err := db.Model(&models.VirtualMachine{}).Where("name = ? AND is_deleted = false", vmName).Update("is_deleted", true).Error; err != nil {
		return err
	}

	return nil
}

// GetLowestPort는 사용 가능한 가장 낮은 NodePort를 반환합니다 (30003 ~ 30300).
// GetLowestPort returns the lowest available NodePort (30003 ~ 30300).
func (vmService *VmService) GetAvailablePort() (int, error) {
	db := db.GetDB()

	// 사용 중인 포트 목록 조회
	var usedPorts []int
	if err := db.Model(&models.VirtualMachine{}).
		Where("is_deleted = ?", false).
		Pluck("node_port", &usedPorts).Error; err != nil {
		return 0, err
	}

	// 포트 사용 여부 맵 생성
	portMap := make(map[int]bool)
	for _, port := range usedPorts {
		portMap[port] = true
	}

	// 가장 낮은 가용 포트 탐색 (Find lowest available port)
	for port := 30003; port <= 30300; port++ {
		if !portMap[port] {
			fmt.Println("Available port:", port)
			return port, nil
		}
	}

	return 0, fmt.Errorf("no available ports in range 30003-30300 (가용 포트 없음)")
}

func (vmService *VmService) IsPortAvailable(port int) (bool, error) {
	db := db.GetDB()

	var vm models.VirtualMachine

	if err := db.Where("node_port = ? AND is_deleted = false", port).First(&vm).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return true, nil
		}

		return false, err
	}

	return false, nil
}
