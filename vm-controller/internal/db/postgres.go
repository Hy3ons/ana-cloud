package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"vm-controller/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DB *gorm.DB
)

// InitDB는 환경 변수를 사용하여 데이터베이스 연결을 초기화합니다.
// InitDB initializes the database connection using environment variables.
func InitDB() error {
	// 환경 변수 확인
	databaseURL := os.Getenv("DATABASE_URL")
	dbHost := os.Getenv("DB_HOST")
	supabaseProjectID := os.Getenv("SUPABASE_PROJECT_ID")

	if dbHost == "" && supabaseProjectID == "" {
		return fmt.Errorf("no database configuration found (DB 설정이 없습니다)")
	}

	if dbHost != "" && supabaseProjectID != "" {
		return fmt.Errorf("어떤 DataBase를 사용해야하는지 알 수 없습니다. 1개의 데이터베이스만 환경변수에 등록하세요.")
	}

	var dsn string

	// 1순위: DATABASE_URL (직접 연결 문자열 사용)
	// Priority 1: DATABASE_URL (Use direct connection string)
	if databaseURL != "" {
		log.Println("Initializing connection using DATABASE_URL... (DATABASE_URL을 사용하여 연결 초기화 중)")
		dsn = databaseURL
	} else {
		// 2순위: DB_HOST와 SUPABASE_PROJECT_ID 중복 체크
		if dbHost != "" && supabaseProjectID != "" {
			return fmt.Errorf("어떤 DataBase를 사용해야하는지 알 수 없습니다. 1개의 데이터베이스만 환경변수에 등록하세요.")
		}

		if supabaseProjectID != "" {
			// Supabase Direct Connection (IPv6 connection likely)
			log.Println("Initializing Supabase connection... (Supabase 연결 초기화 중)")
			dbPassword := os.Getenv("SUPABASE_PASSWORD")

			targetHost := "aws-1-ap-south-1.pooler.supabase.com"
			userName := fmt.Sprintf("postgres.%s", supabaseProjectID)

			dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=postgres port=5432 sslmode=disable TimeZone=Asia/Seoul",
				targetHost,
				userName,
				dbPassword,
			)
		} else if dbHost != "" {
			// 일반 PostgreSQL 연결 설정
			log.Println("Initializing Standard PostgreSQL connection... (일반 PostgreSQL 연결 초기화 중)")
			dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Seoul",
				dbHost,
				os.Getenv("DB_USER"),
				os.Getenv("DB_PASSWORD"),
				os.Getenv("DB_NAME"),
				os.Getenv("DB_PORT"),
			)
		} else {
			return fmt.Errorf("no database configuration found (DB 설정이 없습니다)")
		}
	}

	var err error
	// 1. GORM을 사용하여 PostgreSQL 드라이버로 연결
	// Connect to PostgreSQL driver using GORM
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database (DB 연결 실패): %w", err)
	}

	// 2. Connection Pool(커넥션 풀) 설정
	// Configure Connection Pool
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get generic database object: %w", err)
	}

	// SetMaxIdleConns: 유휴 상태로 유지할 최대 커넥션 수
	// SetMaxIdleConns: Maximum number of idle connections
	sqlDB.SetMaxIdleConns(10)
	// SetMaxOpenConns: 데이터베이스에 오픈할 수 있는 최대 커넥션 수
	// SetMaxOpenConns: Maximum number of open connections
	sqlDB.SetMaxOpenConns(100)
	// SetConnMaxLifetime: 커넥션이 재사용될 수 있는 최대 시간
	// SetConnMaxLifetime: Maximum amount of time a connection may be reused
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Successfully connected to PostgreSQL database (PostgreSQL 연결 성공)")

	// 3. Auto Migration (자동 마이그레이션)
	// 정의된 모델(struct)을 기반으로 테이블을 자동으로 생성하거나 스키마를 업데이트합니다.
	// Auto Migration: Automatically migrate schema based on defined models
	log.Println("Running AutoMigrate... (테이블 자동 생성 중)")
	err = DB.AutoMigrate(
		&models.User{},
		&models.VirtualMachine{},
		&models.Deployment{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate database schema: %w", err)
	}
	log.Println("Database migration completed (마이그레이션 완료)")

	return nil
}

// GetDB는 데이터베이스 인스턴스를 반환합니다.
// 연결 상태를 확인하고, 연결되어 있지 않으면 InitDB를 사용하여 재연결을 시도합니다.
// 재연결 실패 시 패닉(panic)을 발생시킵니다.
// GetDB returns the database instance.
// It checks the connection status and attempts to reconnect using InitDB if not connected.
// If reconnection fails, it panics.
func GetDB() *gorm.DB {
	// 연결 확인 로직
	// Check connection status
	if DB != nil {
		sqlDB, err := DB.DB()
		if err == nil && sqlDB.Ping() == nil {
			return DB
		}
	}

	// 연결 시도
	// Attempt connection
	log.Println("Database connection lost or not initialized. Attempting to reconnect... (DB 연결 끊김 혹은 미초기화. 재연결 시도 중...)")
	if err := InitDB(); err != nil {
		log.Printf("Critical Error: Failed to reconnect to database: %v (치명적 에러: DB 재연결 실패)", err)
		panic(err)
	}

	return DB
}
