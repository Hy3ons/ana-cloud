package routes

import (
	"os"
	controllers "vm-controller/internal/api/controllers"

	gin "github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// API Group
	api := r.Group("/api")
	controllers.GetHealthController().RegisterRoutes(api)
	controllers.GetAuthController().RegisterRoutes(api)
	controllers.GetVirtualMachineController().RegisterRoutes(api)
	controllers.GetUserController().RegisterRoutes(api)

	if os.Getenv("GIN_MODE") == "debug" {
		controllers.GetTestController().RegisterRoutes(api)
	}

	controllers.GetInterceptor().RegisterRoutes(api)

	return r
}
