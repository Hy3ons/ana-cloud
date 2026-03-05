package main

import (
	"fmt"
	"log"

	"vm-controller/internal/api/routes"
	"vm-controller/internal/config"
	"vm-controller/internal/db"
	"vm-controller/internal/services/k8s_service"
)

func main() {
	// 1. 설정 로드 (Configuration)
	config := config.Load()

	// 2. K8s 연결 확인 (K8s Connection Check)
	k8sService, err := k8s_service.GetK8sService()
	if err != nil {
		log.Fatalf("Failed to initialize K8s Service: %v", err)
		panic(err)
	}
	if status, err := k8sService.CheckConnectivity(); err != nil || status != "healthy" {
		log.Fatalf("Failed to connect to Kubernetes cluster: %v (status: %s)", err, status)
		panic(fmt.Errorf("kubernetes connection failed"))
	}
	log.Println("Successfully connected to Kubernetes cluster")

	// 3. 데이터베이스 초기화 (Database Initialization)
	err = db.InitDB()

	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
		log.Fatalf("Please Check Database Connection")
		panic(err)
	}

	// 4. 라우터 설정 (Router)
	r := routes.SetupRouter()

	// 5. 서버 시작 (Start Server)
	log.Printf("Starting server on port %s", config.Port)
	if err := r.Run(fmt.Sprintf(":%s", config.Port)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
