package controllers

import (
	"net/http"
	"strings"
	"sync"
	"vm-controller/internal/middleware"
	userservice "vm-controller/internal/services/user_service"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	userService *userservice.UserService
}

var (
	userController *UserController
	userOnce       sync.Once
)

// GetUserController returns the singleton instance of UserController
func GetUserController() *UserController {
	userOnce.Do(func() {
		userController = &UserController{
			userService: userservice.GetUserService(),
		}
	})
	return userController
}

// RegisterRoutes registers the user-related routes
func (c *UserController) RegisterRoutes(group *gin.RouterGroup) {
	// /api/users
	userGroup := group.Group("/users")
	{
		// 회원가입 (Create User)
		userGroup.POST("/create", c.CreateUser)

		// 내 정보 조회 (Get My Info) - Auth 미들웨어 필요하다고 가정
		userGroup.GET("/me", middleware.AuthGuard(), c.GetMe)
	}
}

type CreateUserRequest struct {
	StudentId string `json:"studentId" binding:"required"`
	Password  string `json:"password" binding:"required"`
	Name      string `json:"name" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
}

// CreateUser handles user creation
// @Summary Create a new user (Sign Up)
// @Description Register a new user with student ID, password, name, and email. Auto-generates a K8s namespace.
func (c *UserController) CreateUser(ctx *gin.Context) {
	var req CreateUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "잘못된 요청 형식입니다."})
		return
	}

	params := userservice.CreateUserParams{
		StudentId: req.StudentId,
		Password:  req.Password,
		Name:      req.Name,
		Email:     req.Email,
	}

	user, err := c.userService.CreateUser(params)
	if err != nil {
		// 중복 에러 등 세분화 가능
		if strings.Contains(err.Error(), "duplicate") {
			ctx.JSON(http.StatusConflict, gin.H{"error": "User already exists", "message": "이미 존재하는 학번 또는 ID입니다."})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "message": "유저 생성 실패"})
		return
	}

	// 비밀번호 해시는 이미 서비스에서 지워져서 옴 (user_service.xo:88)
	ctx.JSON(http.StatusCreated, gin.H{
		"message":   "User created successfully",
		"user":      user,
		"namespace": user.Namespace,
	})
}

// GetMe handles fetching the current user's info
// @Summary Get current user info
// @Description Get information of the currently logged-in user.
func (c *UserController) GetMe(ctx *gin.Context) {
	user_id, _ := ctx.Get("user_id")

	user, err := c.userService.FetchUserById(user_id.(string), true)

	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found", "message": "유저를 찾을 수 없습니다."})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"user": user})
}
