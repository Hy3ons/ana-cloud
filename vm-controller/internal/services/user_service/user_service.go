package userservice

import (
	"errors"
	"fmt"
	"sync"
	"vm-controller/internal/db"
	"vm-controller/internal/models"

	"github.com/google/uuid"
)

type UserService struct {
}

var (
	userService *UserService
	once        sync.Once
)

func GetUserService() *UserService {
	once.Do(func() {
		userService = &UserService{}
	})

	return userService
}

// AuthenticateUser 함수는 학번과 비밀번호를 받아 유저를 인증하고 반환합니다.
func (s *UserService) AuthenticateUser(studentID, password string) (*models.User, error) {
	database := db.GetDB()

	var user models.User
	// 학번으로 유저 찾기
	if err := database.Where("user_student_id = ?", studentID).First(&user).Error; err != nil {
		return nil, err
	}

	// 비밀번호 확인
	if !user.CheckPassword(password) {
		return nil, errors.New("비밀번호가 일치하지 않습니다")
	}

	return &user, nil
}

func (s *UserService) FetchUserById(userId string, concealPassword bool) (*models.User, error) {
	database := db.GetDB()

	var user models.User

	if err := database.Where("id = ?", userId).First(&user).Error; err != nil {
		return nil, err
	}

	if concealPassword {
		user.PasswordHash = ""
	}

	return &user, nil
}

func (s *UserService) FetchUserByStudentId(studentId string) (*models.User, error) {
	database := db.GetDB()

	var user models.User

	if err := database.Where("user_student_id = ?", studentId).First(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

type CreateUserParams struct {
	StudentId string
	Password  string
	Name      string
	Email     string
}

// generateNamespace는 사용자 아이디를 기반으로 무작위 K8s 네임스페이스 이름을 생성합니다.
func (s *UserService) generateNamespace(userId string) string {
	// 간단한 UUID 접미사 생성 (앞 8자리만 사용)
	suffix := uuid.New().String()[:8]
	// 네임스페이스 이름: u-{userId}-{suffix} (소문자, 숫자, 하이픈만 허용)
	return fmt.Sprintf("id-%s-%s", userId, suffix)
}

func (s *UserService) CreateUser(params CreateUserParams) (*models.User, error) {
	database := db.GetDB()

	hashedPassword, err := models.HashPassword(params.Password)

	if err != nil {
		return nil, fmt.Errorf("비밀번호 해싱 실패: %v", err)
	}

	id := database.Create(&models.User{
		Username:      params.Name,
		UserStudentId: params.StudentId,
		PasswordHash:  hashedPassword,
		Email:         params.Email,
		Namespace:     s.generateNamespace(params.StudentId), //학번을 기준으로 namespace를 생성
	})

	if id.Error != nil {
		return nil, fmt.Errorf("유저 생성 실패: %v", id.Error)
	}

	var user *models.User

	if err := database.First(&user, id).Error; err != nil {
		return nil, fmt.Errorf("유저 조회 실패: %v", err)
	}

	user.PasswordHash = ""

	return user, nil
}
