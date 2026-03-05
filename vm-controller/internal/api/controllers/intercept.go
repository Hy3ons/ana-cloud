package controllers

import (
	"fmt"
	"regexp" // Added for regular expressions
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// securityEngine: 보안 검사 엔진 구조체
// 정규식 및 보안 규칙을 관리합니다.
type securityEngine struct {
	sqlInjectionPatterns []*regexp.Regexp
	xssPatterns          []*regexp.Regexp
	pathTraversal        *regexp.Regexp
	obfuscationPatterns  []*regexp.Regexp // 난독화/이상 문자열 패턴
}

type Interceptor struct {
	securityEngine *securityEngine // 보안 엔진 추가
}

var (
	interceptor *Interceptor
	onceInter   sync.Once
)

// GetInterceptor: Interceptor 싱글톤 인스턴스 반환
func GetInterceptor() *Interceptor {
	onceInter.Do(func() {
		interceptor = &Interceptor{
			securityEngine: NewSecurityEngine(), // 보안 엔진 초기화
		}
	})

	return interceptor
}

// NewSecurityEngine: 보안 엔진 초기화 및 규칙 컴파일
func NewSecurityEngine() *securityEngine {
	return &securityEngine{
		// SQL Injection 패턴 (주요 키워드 및 패턴 감지)
		sqlInjectionPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table|update\s+.*\s+set)`),
			regexp.MustCompile(`(?i)(--|\#|\/\*|\*\/|;|'|")`),             // 주석 및 인용부호
			regexp.MustCompile(`(?i)(\b(OR|AND)\b\s+[\w-]+\s*=\s*[\w-])`), // OR 1=1 같은 패턴
		},
		// XSS 패턴 (스크립트 태그 및 이벤트 핸들러)
		xssPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(<script>|<\/script>|<video|<audio|<img|<iframe|<object|<embed)`),
			regexp.MustCompile(`(?i)(javascript:|vbscript:|data:text\/html)`),
			regexp.MustCompile(`(?i)(on\w+\s*=)`), // onload=, onerror= 등
		},
		// Path Traversal 패턴 (상위 디렉토리 접근 시도)
		pathTraversal: regexp.MustCompile(`(\.\.(\/|\\)|\.\.$)`),

		// Obfuscation 패턴 (비정상적인 문자열, 과도한 특수문자 등)
		obfuscationPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(%[0-9a-f]{2}.*%[0-9a-f]{2}.*%[0-9a-f]{2})`),    // 반복적인 URL 인코딩
			regexp.MustCompile(`[^\x20-\x7E]{5,}`),                                  // 연속된 비출력 문자 (5자 이상)
			regexp.MustCompile(`(?i)(base64|eval|exec|system|passthru|shell_exec)`), // 위험한 키워드
			regexp.MustCompile(`([!@#$%^&*()_+={}\[\]:;"'<>,.?/\|\\]{5,})`),         // 특수문자 연속 5회 이상
		},
	}
}

func (i *Interceptor) RegisterRoutes(group *gin.RouterGroup) {
	group.GET("/intercept", i.handleIntercept)
}

// handleIntercept: 트래픽 인터셉트 및 보안 검사 핸들러
// c: Gin 컨텍스트
func (i *Interceptor) handleIntercept(c *gin.Context) {
	// 1. 원본 요청 정보 추출 (Traefik이 채워주는 헤더들)
	origMethod := c.GetHeader("X-Forwarded-Method")
	origPath := c.GetHeader("X-Forwarded-Uri")
	origQuery := c.GetHeader("X-Forwarded-Query") // 쿼리 스트링도 검사 필요
	clientIP := c.ClientIP()
	userAgent := c.Request.UserAgent()

	// 2. 보안 분석 수행
	// 빠르고 효율적인 룰 기반 검사
	isSecure, reason := i.securityEngine.Analyze(origPath, origQuery, origMethod, userAgent)

	// 로그 출력 ( [IP] Method Path -> Result )
	status := "ALLOWED"
	if !isSecure {
		status = "BLOCKED"
	}

	fmt.Printf("\n[Security Audit] %s | IP: %s | %s %s | UA: %s | Result: %s (%s)\n",
		time.Now().Format("2006-01-02 15:04:05"),
		clientIP,
		origMethod,
		origPath,
		userAgent,
		status,
		reason,
	)

	if !isSecure {
		// 3. 차단: 보안 위협 감지됨
		c.Header("X-Block-Reason", reason)
		c.AbortWithStatusJSON(403, gin.H{
			"status": "blocked",
			"reason": reason,
			"ip":     clientIP,
		})
		return
	}

	// 4. 승인: 안전한 트래픽
	c.Status(200)
}

// Analyze: 트래픽 종합 분석
// path: 요청 경로
// query: 쿼리 스트링
// method: HTTP 메서드
// userAgent: 사용자 에이전트
// 반환: 안전 여부(bool), 차단 사유(string)
func (se *securityEngine) Analyze(path, query, method, userAgent string) (bool, string) {
	// A. Path Traversal 검사
	if se.pathTraversal.MatchString(path) {
		return false, "Path Traversal Detected"
	}

	// 검사 대상 문자열 결합 (Path + Query)
	// 대부분의 공격은 URL 파라미터나 경로에 포함됨
	fullInput := path
	if query != "" {
		fullInput += "?" + query
	}

	// B. SQL Injection 검사
	for _, pattern := range se.sqlInjectionPatterns {
		if pattern.MatchString(fullInput) {
			return false, "SQL Injection Detected"
		}
	}

	// C. XSS 검사
	for _, pattern := range se.xssPatterns {
		if pattern.MatchString(fullInput) {
			return false, "XSS Detected"
		}
	}

	// D. 난독화/이상 문자열 탐지
	for _, pattern := range se.obfuscationPatterns {
		if pattern.MatchString(fullInput) {
			return false, "Obfuscated/Suspicious Payload Detected"
		}
	}

	return true, ""
}
