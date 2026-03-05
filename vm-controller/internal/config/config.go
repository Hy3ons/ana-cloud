package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config 구조체는 애플리케이션 설정을 저장합니다.
type Config struct {
	Port     string // 서버가 실행될 포트
	GinMode  string // Gin 모드 (debug/release)
	HostName string // 호스트 이름

	DB_Name     string // 데이터베이스 이름
	DB_User     string // 데이터베이스 사용자
	DB_Password string // 데이터베이스 비밀번호
	DB_Host     string // 데이터베이스 호스트
	DB_Port     string // 데이터베이스 포트
}

// Load 함수는 환경 변수에서 설정을 읽어 Config 구조체를 반환합니다.
func Load() *Config {
	// .env 파일 로드 (로컬 개발 환경용)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found (로컬 .env 파일 없음 - 환경 변수 사용)")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 기본값 8080
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "release" // 기본값 release
	}

	hostName := os.Getenv("HOST_NAME")
	if hostName == "" {
		hostName = "localhost" // 기본값 localhost
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "postgres" // 기본값 postgres
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres" // 기본값 postgres
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "postgres" // 기본값 postgres
	}

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost" // 기본값 localhost
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432" // 기본값 5432
	}

	return &Config{
		Port:        port,
		GinMode:     ginMode,
		HostName:    hostName,
		DB_Name:     dbName,
		DB_User:     dbUser,
		DB_Password: dbPassword,
		DB_Host:     dbHost,
		DB_Port:     dbPort,
	}
}
