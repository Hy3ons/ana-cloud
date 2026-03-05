# ANA Cloud Portal & VM Controller

ANA Cloud Portal은 사용자가 가상 머신(VM)을 간편하게 생성하고 관리할 수 있도록 돕는 웹 기반 클라우드 플랫폼 프론트엔드와 KubeVirt 기반의 백엔드 컨트롤러 프로젝트입니다.

## 🗂️ 프로젝트 구조

이 저장소는 두 개의 주요 컴포넌트로 나뉘어져 있습니다.

- **`frontend/`**: React + TypeScript + Vite 로 구축된 웹 대시보드.
- **`vm-controller/`**: Go (Gin, Gorm, k8s.io/client-go) 로 구현되어 Kubernetes(KubeVirt) 클러스터와 통신하여 VM의 생명주기를 관리하는 백엔드 서버.

---

## 💻 Tech Stack

### Frontend
- **Framework & Library**: React 19, React Router DOM
- **Build Tool**: Vite
- **Language**: TypeScript
- **State & Data Fetching**: Context API, Axios
- **Styling**: Vanilla CSS (Global Styles, Components)

### Backend
- **Language**: Go 1.25
- **Web Framework**: Gin
- **Database ORM**: GORM (PostgreSQL)
- **Authentication**: JWT (JSON Web Tokens), bcrypt
- **Infrastructure SDK**: k8s.io/client-go (Kubernetes Client)

---

## ✨ 주요 기능

1. **사용자 인증 및 권한 관리 (Auth)**
   - 회원가입 (학번 및 네임스페이스 자동 할당)
   - JWT 기반의 로그인 및 세션 관리
   - 관리자(Admin) 승인 여부(`Allowed`)를 통한 VM 생성 권한 제어

2. **단일 가상 머신(VM) 대시보드**
   - 사용자별 할당된 네임스페이스 내의 가상 머신 목록 제공
   - VM 현재 상태 조회 (Running, Stopped, Provisioning 등)
   - 중계 서버(Bastion)를 통한 SSH 접속 안내 UI 지원

3. **VM 프로비저닝 및 생명주기 제어**
   - KubeVirt 연동을 통한 VM 시작, 중지, 삭제 제어
   - 사용자가 직접 CPU, RAM, OS Image, 도메인(기본 또는 커스텀 도메인)을 선택하여 VM 배포 기능

---

## 1. Backend (vm-controller)
데이터베이스 설정(PostgreSQL)과 Kubernetes 클러스터 연결(KubeConfig)이 필요합니다.

#### **Backend 개발 언어 선정 이유: Go**
본 프로젝트의 백엔드는 **Go**로 구현되었습니다. 인프라 제어의 **안정성**과 **효율성**을 위해 다음과 같은 논리적 근거로 선정되었습니다:

1.  **Kubernetes 네이티브 호환성**: k3s와 KubeVirt를 포함한 쿠버네티스 생태계는 Go로 구축되어 있습니다. 공식 `client-go` 라이브러리를 사용함으로써 API 통신의 신뢰성을 확보하고 인프라 리소스를 가장 정확하게 제어할 수 있습니다.
2.  **최소한의 오버헤드**: VM 제어 로직은 시스템 자원을 직접적으로 다루는 작업이 많습니다. Go는 컴파일 언어로서 낮은 메모리 사용량과 빠른 실행 성능을 제공하여, 제어 서버 자체가 가용 리소스를 과도하게 점유하는 것을 방지합니다.
3.  **간결한 시스템 구조**: 고성능 고루틴(Goroutine)을 통해 다수의 VM 상태를 병렬로 모니터링하면서도, 복잡한 비동기 처리 없이 간결한 코드로 안정적인 동시성을 구현할 수 있어 유지보수가 용이합니다.
4.  **운영 편의성**: 단일 정적 바이너리 배포가 가능하여 별도의 런타임 설치 없이 `systemd` 환경에서 즉시 운영이 가능하며, 이는 프로젝트의 "최소한의 운영 오버헤드" 철학과 일치합니다.


## 2. Frontend

#### **Frontend 개발 언어 선정 이유: TypeScript**
본 프로젝트의 프론트엔드는 **TypeScript**로 구현되었습니다. 사용자 경험의 **안정성**과 **개발 생산성**을 위해 다음과 같은 이유로 선정되었습니다:

1.  **타입 안정성**: React 컴포넌트 간의 데이터 흐름과 API 응답 구조를 컴파일 시점에 검증함으로써, 런타임 에러를 획기적으로 줄이고 사용자에게 안정적인 인터페이스를 제공합니다.
2.  **개발 생산성**: 정적 타이핑을 통해 IDE의 자동 완성(Auto-completion) 및 리팩토링 기능이 극대화되어, 복잡한 VM 관리 대시보드의 개발 속도와 유지보수 용이성을 동시에 확보했습니다.
3.  **생태계 호환성**: React 생태계의 주요 라이브러리(Axios, React Router 등)가 TypeScript를 완벽하게 지원하므로, 최신 기술 스택을 활용하면서도 안정적인 통합을 보장합니다.

---

## 배포된 환경
본 프로젝트는 리소스 효율성을 극대화하고 운영 오버헤드를 최소화하기 위해 컨테이너 가상화(Docker) 레이어를 배제한 **Bare-metal 기반의 In-Cluster VM 환경**에서 운영됩니다.

### 운영 아키텍처 및 선정 이유

1.  **최소한의 시스템 오버헤드**: 엔터프라이즈급의 복잡한 오케스트레이션 대신, 시스템 규모에 최적화된 직접 실행 방식을 채택하여 CPU 및 메모리 자원을 핵심 로직에 집중시켰습니다.
2.  **Nginx 직접 서빙 (Frontend)**: Docker 컨테이너를 거치지 않고 Nginx가 빌드된 `dist` 정적 파일을 직접 호스팅함으로써 네트워크 홉을 줄이고 정적 자원 전달 속도를 최적화했습니다.
3.  **Systemd 기반 프로세스 관리 (Backend)**: Go 바이너리를 `systemd` 서비스 유닛으로 관리하여, 프로세스 비정상 종료 시 자동 재시작(Self-healing)을 보장하고 시스템 부팅 시 자동 실행되는 안정적인 백엔드 환경을 구축했습니다.
4.  **In-Cluster 제어 최적화**: KubeVirt가 구동되는 클러스터 내부 VM에서 직접 실행됨으로써, 쿠버네티스 API 서버와의 통신 지연을 최소화하고 인프라 제어의 즉각성을 확보했습니다.
5.  **Virtio 기반 고성능 I/O**: VM 내부의 네트워크 및 디스크 인터페이스에 Virtio 드라이버를 적용하여 가상화로 인한 I/O 병목 현상을 제거하고, 베어메탈 환경에 근접한 데이터 처리 속도와 낮은 지연 시간을 구현했습니다.



## 📝 라이선스
해당 프로젝트는 비공개 내부 시스템 또는 지정된 사용자들을 위한 목적으로 개발되었습니다.
