package controllers

import (
	"net/http"
	"sync"
	k8s "vm-controller/internal/services/k8s_service"

	"vm-controller/internal/models"

	"os"

	"github.com/gin-gonic/gin"
)

type TestController struct {
}

var (
	testController *TestController
	onceTest       sync.Once
)

func GetTestController() *TestController {
	onceTest.Do(func() {
		testController = &TestController{}
	})

	return testController
}

func (t *TestController) RegisterRoutes(group *gin.RouterGroup) {
	mode := os.Getenv("GIN_MODE")
	if mode == "release" {
		return
	}

	g := group.Group("/test")
	g.POST("/create-vm", t.TestCreateVM)
	g.POST("/delete-vm", t.TestDeleteVM)
}

type testCreateVMRequest struct {
	UserNamespace string `json:"userNamespace"`
	VmName        string `json:"vmName"`
	Password      string `json:"password"`
	DnsHost       string `json:"dnsHost"`
	VmPort        int32  `json:"vmPort"`
}

func (t *TestController) TestCreateVM(c *gin.Context) {
	var req testCreateVMRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	service, err := k8s.GetK8sService()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	vminfo, err := service.CreateUserVM(req.UserNamespace, req.VmName, req.Password, req.DnsHost, "yaml-data/client-vm", "ubuntu-2204-gold-source", 30005)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"vmInfo": vminfo})
}

func (t *TestController) TestDeleteVM(c *gin.Context) {
	var req testCreateVMRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	service, err := k8s.GetK8sService()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var vm = models.VirtualMachine{
		Name:      req.VmName,
		Namespace: req.UserNamespace,
		UserID:    0,
	}

	err = service.DeleteVM(&vm)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "VM deleted successfully"})
}
