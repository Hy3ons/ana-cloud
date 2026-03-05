package models

import "gorm.io/gorm"

type EnumVmStatus string

const (
	VmStatusProvisioning EnumVmStatus = "Provisioning"
	VmStatusFailed       EnumVmStatus = "Failed"
	VmStatusRunning      EnumVmStatus = "Running"
	VmStatusStopping     EnumVmStatus = "Stopping"
	VmStatusStopped      EnumVmStatus = "Stopped"
	VmStatusDeleted      EnumVmStatus = "Deleted"
)

// VirtualMachine 구조체는 사용자를 위해 프로비저닝된 VM 정보를 추적합니다.
type VirtualMachine struct {
	gorm.Model
	UserID    uint         `gorm:"not null"`                         // 소유한 사용자의 ID
	User      User         `gorm:"foreignKey:UserID"`                // 소유한 사용자 객체
	Name      string       `gorm:"column:name;not null;uniqueIndex"` // VM 이름 (예: my-cloud-vps)
	Namespace string       `gorm:"column:namespace;not null"`        // K8s 네임스페이스
	NodePort  int32        `gorm:"column:node_port;not null"`        // SSH 접근을 위한 NodePort 번호
	Password  string       `gorm:"column:password;not null"`         // Root 계정 비밀번호 (요구사항에 따라 평문 저장, 운영시 암호화 필요)
	Status    EnumVmStatus `gorm:"column:status"`                    // VM 상태 (예: "Provisioned", "Failed")
	Image     string       `gorm:"column:image"`                     // VM 이미지
	IsDeleted bool         `gorm:"column:is_deleted"`                // VM 삭제 여부
}
