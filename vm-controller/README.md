# VM Controller (Cloud Backend)

---

## 🏗️ 아키텍처 및 기술 스택 (Architecture & Tech Stack)
본 프로젝트는 **MSA(Microservices Architecture)** 지향적인 설계를 따르며, 안정성과 확장성을 고려하여 다음과 같은 기술을 채택하였습니다.

### 1. Backend Core
*   **Language**: **Go (Golang) 1.20+** - 고성능 동시성 처리에 최적화된 언어로, 대규모 트래픽과 시스템 리소스 제어에 탁월합니다.
*   **Framework**: **Gin Web Framework** - 경량화된 고성능 HTTP 웹 프레임워크로, 낮은 지연 시간(Latency)을 보장합니다.
*   **Database & ORM**: **PostgreSQL** / **GORM** - 데이터 무결성을 보장하는 관계형 데이터베이스와 객체 매핑을 위한 ORM을 사용합니다.
*   **Authentication**: **JWT (JSON Web Token)** - Stateless한 인증 방식을 통해 확장성 있는 보안 체계를 구축했습니다.

### 2. Infrastructure & Virtualization
*   **Orchestration**: **Kubernetes (K8s) Distro (K3s)** - 컨테이너 오케스트레이션의 표준으로, 서비스의 자동 배포 및 스케일링을 담당합니다.
*   **Virtualization**: **KubeVirt** - Kubernetes 환경 네이티브하게 가상 머신(VM)을 실행하고 관리할 수 있게 해주는 확장(Extension)입니다.
*   **Storage**: **CDI (Containerized Data Importer)** - PVC(Persistent Volume Claim) 기반의 디스크 이미지 프로비저닝을 담당합니다.

---

## 🔑 주요 기능 (Key Features)
*   **VM Lifecycle Management**: 가상 머신의 생성, 조회, 중지, 삭제 및 리소스 크기 조절(Resize).
*   **Web Service Deployment**: 사용자 소스 코드 기반의 웹 애플리케이션 자동 배포 파이프라인.
*   **Resource Isolation**: Namespace 기반의 멀티 테넌시(Multi-tenancy) 환경 제공.
*   **Security**: 비밀번호 해싱(Bcrypt) 및 JWT 기반의 안전한 API 접근 제어.

---

### 사전 요구사항 (Prerequisites)
*   Go 1.20 이상
*   Kubernetes Cluster (K3s 권장)
*   KubeVirt 및 CDI 설치 완료

---

## 📡 API Reference

`/test` 엔드포인트를 제외한 주요 API 명세입니다.

### 1. Health Check
서버 상태 및 Kubernetes 연결 상태를 확인합니다.

*   **URL**: `/health`
*   **Method**: `GET`
*   **Response**:
    ```json
    {
      "status": "ok",
      "k8s_connectivity": "healthy"
    }
    ```

### 2. Authentication (Auth) 
*   **Base URL**: `/api/auth`

#### 로그인 (Login)
*   **URL**: `/login`
*   **Method**: `POST`
*   **Body (JSON)**:
    ```json
    {
      "student_id": "20201234",
      "password": "your_password"
    }
    ```
*   **Response**: `200 OK` (Set-Cookie `authorization`)

### 3. User Management
*   **Base URL**: `/api/users`

#### 회원 가입 (Create User)
*   **URL**: `/create`
*   **Method**: `POST`
*   **Body (JSON)**:
    ```json
    {
      "studentId": "20201234",
      "password": "your_password",
      "name": "홍길동",
      "email": "example@univ.ac.kr"
    }
    ```
*   **Response**: `201 Created`

#### 내 정보 조회 (Get My Info)
*   **URL**: `/me`
*   **Method**: `GET`
*   **Headers**: `Cookie: authorization=Bearer <token>`
*   **Response**: `200 OK`

### 4. Virtual Machine (VM)
VM 생성 및 관리는 인증이 필요합니다.
*   **Base URL**: `/api/vm`
*   **Headers**: `Cookie: authorization=Bearer <token>`

#### VM 생성 (Create VM)
*   **URL**: `/create`
*   **Method**: `POST`
*   **Body (JSON)**:
    ```json
    {
      "vm_name": "my-ubuntu-vm",
      "vm_ssh_password": "ssh_password_123",
      "vm_image": "ubuntu-20.04", 
      "vm_host_prefix": "myvm" 
    }
    ```
    *   `vm_host_prefix`: DNS 서브도메인으로 사용됨 (예: `myvm.cloud.com`).

#### VM 목록 조회 (Fetch User VMs)
*   **URL**: `/fetch`
*   **Method**: `GET`
*   **Response**: 사용자의 VM 목록 반환.

#### VM 시작 (Start VM)
*   **URL**: `/start`
*   **Method**: `POST`
*   **Body (JSON)**:
    ```json
    {
      "vm_name": "my-ubuntu-vm"
    }
    ```

#### VM 중지 (Stop VM)
*   **URL**: `/stop`
*   **Method**: `POST`
*   **Body (JSON)**:
    ```json
    {
      "vm_name": "my-ubuntu-vm"
    }
    ```

#### VM 삭제 (Delete VM)
*   **URL**: `/delete`
*   **Method**: `DELETE`
*   **Body (JSON)**:
    ```json
    {
      "vm_name": "my-ubuntu-vm"
    }
    ```

### 5. Security Interceptor
Traefik 등 Ingress Controller에서 사용하는 내부 보안 검사 API입니다.

*   **Base URL**: `/api`
*   **URL**: `/intercept`
*   **Method**: `GET`
*   **Headers**:
    *   `X-Forwarded-Method`: 원본 요청 메서드
    *   `X-Forwarded-Uri`: 원본 요청 URI
*   **Description**: SQL Injection, XSS, Path Traversal 등의 공격 패턴을 탐지하고 차단합니다.
