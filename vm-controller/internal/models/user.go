package models

import (
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User 구조체는 시스템에 등록된 사용자를 나타냅니다. PK Column name : id
type User struct {
	gorm.Model
	Username      string           `gorm:"column:username;uniqueIndex;not null"`        // 사용자 고유 ID (유니크)
	UserStudentId string           `gorm:"column:user_student_id;uniqueIndex;not null"` // 학생 ID (유니크)
	PasswordHash  string           `gorm:"column:password_hash;not null"`               // 암호화된 비밀번호 해시
	VMs           []VirtualMachine // 사용자가 소유한 VM 목록
	Deployments   []Deployment     // 사용자가 배포한 웹 서비스 목록
	Namespace     string           `gorm:"column:namespace;not null"` // K8s 네임스페이스 무조건 있음...
	Email         string           `gorm:"column:email;not null"`
	Allowed       bool             `gorm:"column:allowed;default:false;not null"` // VM 생성 허용 여부
}

// HashPassword 함수는 평문 비밀번호를 bcrypt 알고리즘을 사용하여 해시화합니다.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword 함수는 입력된 비밀번호가 저장된 해시와 일치하는지 확인합니다.
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}
