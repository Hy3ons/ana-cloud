package models

import "gorm.io/gorm"

// Deployment 구조체는 GitHub 기반의 웹 배포 정보를 추적합니다.
type Deployment struct {
	gorm.Model
	UserID  uint   `gorm:"not null"`          // 소유한 사용자의 ID
	User    User   `gorm:"foreignKey:UserID"` // 소유한 사용자 객체
	RepoURL string `gorm:"not null"`          // GitHub 리포지토리 URL
	Domain  string `gorm:"not null"`          // 연결된 도메인 (예: project.hy3on.site)
	Status  string // 배포 상태 (예: "Building", "Deployed", "Failed")
}
