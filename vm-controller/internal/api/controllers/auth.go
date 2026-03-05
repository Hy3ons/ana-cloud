package controllers

import (
	time "time"
	userservice "vm-controller/internal/services/user_service"

	"net/http"

	os "os"

	sync "sync"

	gin "github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v5"
)

type AuthController struct {
	userService *userservice.UserService
}

var (
	authController *AuthController
	once           sync.Once
)

func GetAuthController() *AuthController {
	once.Do(func() {
		authController = &AuthController{
			userService: &userservice.UserService{},
		}
	})

	return authController
}

func (authController *AuthController) RegisterRoutes(r *gin.RouterGroup) {
	auth := r.Group("/auth")
	auth.POST("/login", authController.Login)
}

type LoginParams struct {
	StudentId string `json:"student_id"`
	Password  string `json:"password"`
}

func (authController *AuthController) Login(c *gin.Context) {
	var loginParams LoginParams

	if err := c.ShouldBindJSON(&loginParams); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "로그인 정보를 정확하게 전달하세요."})
		return
	}

	user, err := authController.userService.AuthenticateUser(loginParams.StudentId, loginParams.Password)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "인증 실패"})
		return
	}

	tokenString, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	}).SignedString([]byte(os.Getenv("JWT_SECRET")))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "토큰 생성 실패"})
		return
	}

	c.SetCookie("authorization", "Bearer "+tokenString, 86400, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "로그인 성공"})
}

type CreateAccountParams struct {
	StudentId string `json:"student_id"`
	Password  string `json:"password"`
	Name      string `json:"name"`
	Email     string `json:"email"`
}

func (a *AuthController) CreateAccount(c *gin.Context) {
	var createAccountParams CreateAccountParams

	if err := c.ShouldBindJSON(&createAccountParams); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "계정 생성 정보를 정확하게 전달하세요."})
		return
	}

	user, err := a.userService.CreateUser(userservice.CreateUserParams{
		StudentId: createAccountParams.StudentId,
		Password:  createAccountParams.Password,
		Name:      createAccountParams.Name,
		Email:     createAccountParams.Email,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "계정 생성 실패"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "계정 생성 성공", "user": user})
}
