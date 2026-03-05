package controllers

import (
	"net/http"

	"vm-controller/internal/services/k8s_service"

	"github.com/gin-gonic/gin"
)

type HealthController struct {
	K8sService *k8s_service.K8sService
}

// GetHealthController 새로운 HealthController 인스턴스 가져오기 (싱글톤 아님, 단순 생성)
func GetHealthController() *HealthController {
	k8s_service, _ := k8s_service.GetK8sService()
	return &HealthController{
		K8sService: k8s_service,
	}
}

// RegisterRoutes 라우트 등록
// group: 라우트 그룹
func (h *HealthController) RegisterRoutes(group *gin.RouterGroup) {
	group.GET("/health", h.Check)
}

// NewHealthController 의존성 주입을 통한 HealthController 생성
// k8sService: K8s 서비스 인스턴스
func NewHealthController(k8sService *k8s_service.K8sService) *HealthController {
	return &HealthController{
		K8sService: k8sService,
	}
}

// Check 서버 상태 확인 (Health Check)
// c: Gin 컨텍스트
func (h *HealthController) Check(c *gin.Context) {
	status, err := h.K8sService.CheckConnectivity()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": err.Error(),
		})
		return
	}

	// Public Stats: Running VMs count
	// This is a simple implementation to check "how many VMs are running" without login.
	vmCount, err := h.K8sService.GetTotalVMs()
	if err != nil {
		// If getting stats fails, just return specific error or ignore?
		// We will log it and return -1 or similar, but here maybe just omit or show 0.
		// For now, let's respect the "healthy" status priority and just log error but not fail the health check.
		// But let's return it in JSON.
		vmCount = -1
	}

	c.JSON(http.StatusOK, gin.H{
		"status":           "ok",
		"k8s_connectivity": status,
		"active_vms":       vmCount,
	})
}
