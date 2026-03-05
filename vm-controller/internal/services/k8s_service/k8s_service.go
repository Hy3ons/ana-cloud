package k8s_service

import (
	"context"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
	"vm-controller/internal/models"
	vmservice "vm-controller/internal/services/vm_service"

	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
)

// Policy:
// K8sService 는 최상위 서비스로 간주합니다. 로직상 제일 편하고 깔끔해짐
// 다른 서비스는 K8sService를 의존성으로 사용할 수 없습니다.
// 순환의존성 방지
type K8sService struct {
	dynamicClient dynamic.Interface
	mapper        meta.RESTMapper
}

var (
	instance *K8sService
	once     sync.Once
)

// params for deployment
type DeploymentParams struct {
	UserNamespace string
	NodePort      int32
}

// 싱글톤 인스턴스 반환 함수
func GetK8sService() (*K8sService, error) {
	var err error
	once.Do(func() {
		var config *rest.Config

		// 1. Custom Secret Mounting Logic (User Request)
		// 사용자가 지정한 로직: /mnt/secrets의 토큰과 CA 인증서를 사용하여 Config 생성
		tokenPath := "/mnt/secrets/token"
		caPath := "/mnt/secrets/ca.crt"

		if _, errStat := os.Stat(tokenPath); errStat == nil {
			// API 서버 주소 설정 (기본값: 10.43.0.1)
			host := os.Getenv("KUBERNETES_SERVICE_HOST")
			if host == "" {
				host = "10.43.0.1"
			}
			port := os.Getenv("KUBERNETES_SERVICE_PORT")
			if port == "" {
				port = "443"
			}

			token, errRead := os.ReadFile(tokenPath)
			if errRead == nil {
				config = &rest.Config{
					Host: "https://" + net.JoinHostPort(host, port),
					TLSClientConfig: rest.TLSClientConfig{
						CAFile: caPath,
					},
					BearerToken: string(token),
				}
				fmt.Printf("Using Custom K8s Config from %s with Host %s\n", tokenPath, config.Host)
			} else {
				fmt.Printf("Failed to read token from %s: %v\n", tokenPath, errRead)
			}
		}

		// 2. 만약 Custom Config가 생성되지 않았다면 기존 로직 시도 (InCluster -> fallback)
		if config == nil {
			config, err = rest.InClusterConfig()
			if err != nil {
				// fallback to standard kubeconfig loading (KUBECONFIG env or ~/.kube/config)
				loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
				configOverrides := &clientcmd.ConfigOverrides{}
				kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
				config, err = kubeConfig.ClientConfig()
			}
		}

		if err != nil {
			// 마지막으로 fallback 메시지만 남김
			err = fmt.Errorf("failed to get k8s config: %v", err)
			return
		}

		// 2. Dynamic Client 생성
		dynClient, errDyn := dynamic.NewForConfig(config)
		if errDyn != nil {
			err = fmt.Errorf("failed to create dynamic client: %v", errDyn)
			return
		}

		// 3. Discovery Client & Mapper 생성 (GVR 매핑용)
		dc, errDisc := discovery.NewDiscoveryClientForConfig(config)
		if errDisc != nil {
			err = fmt.Errorf("failed to create discovery client: %v", errDisc)
			return
		}
		mapper := restmapper.NewDeferredDiscoveryRESTMapper(memory.NewMemCacheClient(dc))

		instance = &K8sService{
			dynamicClient: dynClient,
			mapper:        mapper,
		}
	})

	if err != nil {
		return nil, err
	}
	return instance, nil
}

func (s *K8sService) CheckConnectivity() (string, error) {
	// 간단한 연결 테스트 (System Namespaces 조회 시도)
	// GVR for Namespaces: v1, Namespace
	gvr, err := s.mapper.ResourceFor(schema.GroupVersionResource{Resource: "namespaces"})
	if err != nil {
		return "unhealthy", err
	}
	_, err = s.dynamicClient.Resource(gvr).List(context.Background(), metav1.ListOptions{Limit: 1})
	if err != nil {
		return "unhealthy", err
	}
	return "healthy", nil
}

// checkInjection validates input parameters to prevent YAML injection and ensure K8s compatibility.
// 입력값 검증 함수: YAML 인젝션 방지 및 쿠버네티스 명명 규칙 준수 여부 확인
func (s *K8sService) checkInjection(userNamespace, vmName, password, dnsHost, manifestDir string, vmPort int32) error {
	// 1. 필수 파라미터 빈 값 체크
	// 모든 값이 설정되어 있어야 안전하게 템플릿 치환이 가능함
	if userNamespace == "" || vmName == "" || password == "" || dnsHost == "" || manifestDir == "" || vmPort == 0 {
		return fmt.Errorf("invalid parameters: empty values not allowed (필수 파라미터 누락)")
	}

	// 2. Port 범위 체크 (NodePort 범위: 30003-32767)
	// 사용자가 할당하려는 포트가 유효한 NodePort 범위 내에 있는지 확인
	if !(30003 <= vmPort && vmPort < 32767) {
		return fmt.Errorf("invalid port: %d (NodePort must be between 30003 and 32767)", vmPort)
	}

	// 3. DNS-1123 호환성 체크 (Namespace, VM Name)
	// 쿠버네티스 리소스 이름은 소문자, 숫자, '-' 만 허용하며, 숫자로 시작할 수 없음.
	// 정규식: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$
	// 여기서는 조금 더 느슨하게 검사하되, 특수문자나 공백, 뉴라인이 포함되지 않도록 함.
	dns1123Regex := regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`)

	if !dns1123Regex.MatchString(userNamespace) {
		return fmt.Errorf("invalid namespace format: %s (must be DNS-1123 compliant)", userNamespace)
	}
	if !dns1123Regex.MatchString(vmName) {
		return fmt.Errorf("invalid vmName format: %s (must be DNS-1123 compliant)", vmName)
	}

	// 4. Password 체크 (보안 및 인젝션 방지)
	// 길이: 최소 8자
	// 허용 문자: 알파벳 대소문자, 숫자, 특수문자 (!@#$%^&*()_+-=[]{}|;:,.<>/?)
	// 금지 문자: 공백, 뉴라인, 따옴표(" '), 역슬래시(\) 등 YAML 파싱에 문제될 수 있는 문자
	// 정규식: ^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>/?]{8,}$
	if len(password) < 8 || len(password) > 16 {
		return fmt.Errorf("invalid password: length must be between 8 and 16 characters")
	}

	// 안전한 문자셋 정의 (YAML Scalar로 안전하게 들어갈 수 있는 범위)
	passwordRegex := regexp.MustCompile(`^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>/?]+$`)
	if !passwordRegex.MatchString(password) {
		return fmt.Errorf("invalid password format: contains invalid characters (allowed: alphanumeric and !@#$%%^&*()_+-=[]{}|;:,.<>/?)")
	}

	// 5. DNS Host 체크 (도메인 형식)
	// 알파벳, 숫자, '.', '-' 만 허용
	// 인젝션을 유발할 수 있는 ;, \n, && 등의 특수문자 차단
	domainRegex := regexp.MustCompile(`^[a-zA-Z0-9.-]+$`)
	if !domainRegex.MatchString(dnsHost) {
		return fmt.Errorf("invalid dnsHost format: %s (contains invalid characters)", dnsHost)
	}

	// 6. Path Traversal 체크
	cleanDir := filepath.Clean(manifestDir)
	if strings.Contains(cleanDir, "..") || strings.HasPrefix(cleanDir, "/") || strings.HasPrefix(cleanDir, "\\") {
		// handle path traversal if needed
		return fmt.Errorf("invalid manifest directory: %s (contains invalid characters)", manifestDir)
	}

	return nil
}

// CreatedResource holds metadata for tracking created objects
type CreatedResource struct {
	Group     string
	Version   string
	Kind      string
	Name      string
	Namespace string
	UID       types.UID
}

// VMInfo encapsulates the details of the created VM and resources
type VMInfo struct {
	Namespace        string
	Name             string
	Port             int32
	Password         string
	DNSHost          string
	CreatedResources []CreatedResource
}

// CreateUserVM creates resources defined in yaml-data/client-vm
func (s *K8sService) CreateUserVM(userNamespace, vmName, password, dnsHost, manifestDir, imageName string, vmPort int32) (*VMInfo, error) {
	// manifestDir := "yaml-data/client-vm" // 실행 위치 기준

	// Yaml에 그대로 넣지만, Injection검사를 시행.
	if err := s.checkInjection(userNamespace, vmName, password, dnsHost, manifestDir, vmPort); err != nil {
		return nil, err
	}

	vmInfo := &VMInfo{
		Namespace: userNamespace,
		Name:      vmName,
		Port:      vmPort,
		Password:  password,
		DNSHost:   dnsHost,
	}

	// 롤백을 위한 성공 여부 플래그
	var success bool = false
	// 이 함수에서 생성한 모든 리소스를 추적 (init + vm)
	var allCreatedResources []CreatedResource

	// defer를 사용하여 작업 실패 시 롤백(삭제) 수행
	defer func() {
		if !success {
			fmt.Println("CreateUserVM failed. Rolling back created resources...")
			// 생성의 역순으로 삭제
			for i := len(allCreatedResources) - 1; i >= 0; i-- {
				res := allCreatedResources[i]
				fmt.Printf("Rolling back resource: %s %s/%s\n", res.Kind, res.Namespace, res.Name)
				if errRaw := s.deleteResource(res); errRaw != nil {
					fmt.Printf("Failed to delete resource %s %s/%s during rollback: %v\n", res.Kind, res.Namespace, res.Name, errRaw)
				}
			}
		}
	}()

	initReplacements := map[string]string{
		"{{NAMESPACE}}": userNamespace,
	}

	initCreated, err := s.applyManifests("yaml-data/client-init", initReplacements, userNamespace, true)
	allCreatedResources = append(allCreatedResources, initCreated...)

	if err != nil {
		// init 과정 실패 시에도 롤백 발동 (여기까지 생성된 것 삭제)
		return nil, fmt.Errorf("failed to apply client-init manifests: %v", err)
	}

	// Next CloudInit Create.
	cloudInitReplacements := map[string]string{
		"{{NAMESPACE}}": userNamespace,
		"{{VM_NAME}}":   vmName,
		"{{PASSWORD}}":  password,
		"{{DNS_HOST}}":  dnsHost,
	}

	targetYaml := fmt.Sprintf("yaml-data/client-vm-cloudinit/%s.yaml", imageName)
	cloudInitCreated, err := s.applyManifests(targetYaml, cloudInitReplacements, userNamespace, true)
	allCreatedResources = append(allCreatedResources, cloudInitCreated...)

	if err != nil {
		// init 과정 실패 시에도 롤백 발동 (여기까지 생성된 것 삭제)
		return nil, fmt.Errorf("failed to apply client-init manifests: %v", err)
	}

	// 2. Client VM Resources (yaml-data/client-vm)
	vmReplacements := map[string]string{
		"{{NAMESPACE}}": userNamespace,
		"{{NODEPORT}}":  fmt.Sprintf("%d", vmPort),
		"{{VM_NAME}}":   vmName,
		"{{DNS_HOST}}":  dnsHost,
		"{{PASSWORD}}":  password,
		"{{VM_IMAGE}}":  imageName,
	}

	vmCreated, err := s.applyManifests("yaml-data/client-vm", vmReplacements, userNamespace, false)
	allCreatedResources = append(allCreatedResources, vmCreated...)

	if err != nil {
		return nil, fmt.Errorf("failed to apply client-vm manifests: %v", err)
	}

	// 성공적으로 완료되었음을 표시 (롤백 방지)
	success = true
	// 최종 VMInfo에는 VM 관련 리소스만 넣을지, Init 포함할지 결정.
	// 사용자의 요청 "적용하는데 성공한 obj 들을 배열에 담아둿다가..."는 롤백 로직을 위한 것이었음.
	// 리턴값은 VM 관련 리소스 정보로 채움.
	vmInfo.CreatedResources = vmCreated

	return vmInfo, nil
}

// applyManifests iterates over yamls in a directory, applies replacements, and creates resources.
// ignoreExists: if true, "already exists" error is ignored and resource is NOT returned as created.
func (s *K8sService) applyManifests(path string, replacements map[string]string, defaultNamespace string, ignoreExists bool) ([]CreatedResource, error) {
	fmt.Println("Applying manifests from path:", path)
	var filePaths []string

	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("failed to stat path %s: %v", path, err)
	}

	if info.IsDir() {
		files, err := os.ReadDir(path)
		if err != nil {
			return nil, fmt.Errorf("failed to read directory %s: %v", path, err)
		}

		for _, file := range files {
			if !file.IsDir() && strings.HasSuffix(file.Name(), ".yaml") {
				filePaths = append(filePaths, filepath.Join(path, file.Name()))
			}
		}
	} else {
		filePaths = append(filePaths, path)
	}

	var created []CreatedResource
	decUnstructured := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme)

	for _, filePath := range filePaths {
		content, err := os.ReadFile(filePath)
		if err != nil {
			return created, fmt.Errorf("failed to read file %s: %v", filepath.Base(filePath), err)
		}

		fileName := filepath.Base(filePath)

		text := string(content)
		for k, v := range replacements {
			text = strings.ReplaceAll(text, k, v)
		}

		docs := strings.Split(text, "\n---\n")
		for _, doc := range docs {
			if strings.TrimSpace(doc) == "" {
				continue
			}

			obj := &unstructured.Unstructured{}
			_, gvk, err := decUnstructured.Decode([]byte(doc), nil, obj)
			if err != nil {
				return created, fmt.Errorf("failed to decode yaml in %s: %v", fileName, err)
			}

			// Namespace 설정 (없는 경우 defaultNamespace 주입)
			if obj.GetNamespace() == "" {
				obj.SetNamespace(defaultNamespace)
			}

			// GVR 매핑
			mapping, err := s.mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
			if err != nil {
				return created, fmt.Errorf("failed to find mapping for %s: %v", gvk.String(), err)
			}

			var dri dynamic.ResourceInterface
			if mapping.Scope.Name() == meta.RESTScopeNameNamespace {
				dri = s.dynamicClient.Resource(mapping.Resource).Namespace(obj.GetNamespace())
			} else {
				dri = s.dynamicClient.Resource(mapping.Resource)
			}

			// Create Resource
			createdObj, err := dri.Create(context.Background(), obj, metav1.CreateOptions{})
			if err != nil {
				if strings.Contains(err.Error(), "already exists") {
					if ignoreExists {
						// 이미 존재하면 무시하고 넘어감 (롤백 대상 아님)
						fmt.Printf("Resource %s %s/%s already exists, skipping.\n", gvk.Kind, obj.GetNamespace(), obj.GetName())
						continue
					} else {
						// VM 생성 시 중복은 에러로 처리하거나, 여기서도 로그만 찍고 넘어갈 수 있음.
						// 기존 로직은 로그 찍고 넘어가는 것이었음. ("already exists, skipping")
						// 하지만 "원자성"을 위해 새로 생성하려던 것이 이미 있으면 실패로 보는게 맞을 수도 있고,
						// 재시도 관점에서는 성공으로 볼 수도 있음.
						// 여기서는 기존 로직(로그 찍고 스킵)을 유지하되, Created 목록에는 넣지 않음 -> 롤백 안함.
						fmt.Printf("Resource %s %s/%s already exists, skipping (not tracking for rollback).\n", gvk.Kind, obj.GetNamespace(), obj.GetName())
						continue
					}
				}
				return created, fmt.Errorf("failed to create resource %s: %v", gvk.Kind, err)
			}

			fmt.Printf("Successfully created %s: %s\n", gvk.Kind, createdObj.GetName())
			created = append(created, CreatedResource{
				Group:     gvk.Group,
				Version:   gvk.Version,
				Kind:      gvk.Kind,
				Name:      createdObj.GetName(),
				Namespace: createdObj.GetNamespace(),
				UID:       createdObj.GetUID(),
			})
		}
	}
	return created, nil
}

// deleteResource deletes a specific resource
func (s *K8sService) deleteResource(res CreatedResource) error {
	gvk := schema.GroupVersionKind{
		Group:   res.Group,
		Version: res.Version,
		Kind:    res.Kind,
	}

	mapping, err := s.mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err != nil {
		return err
	}

	var dri dynamic.ResourceInterface
	if mapping.Scope.Name() == meta.RESTScopeNameNamespace {
		dri = s.dynamicClient.Resource(mapping.Resource).Namespace(res.Namespace)
	} else {
		dri = s.dynamicClient.Resource(mapping.Resource)
	}

	// 백그라운드 삭제 (즉시 반환하지 않고 K8s가 알아서 GC하도록)
	deletePolicy := metav1.DeletePropagationBackground
	return dri.Delete(context.Background(), res.Name, metav1.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	})
}

func (s *K8sService) DeleteVM(vm *models.VirtualMachine) error {
	err := vmservice.GetVmService().DeleteVm(vm.Name)
	if err != nil {
		return err
	}

	// VM 리소스 삭제
	err = s.deleteResource(CreatedResource{
		Version:   "v1",
		Kind:      "Service",
		Name:      "vps-access-" + vm.Name,
		Namespace: vm.Namespace,
	})

	if err != nil {
		return err
	}

	err = s.deleteResource(CreatedResource{
		Group:     "networking.k8s.io",
		Version:   "v1",
		Kind:      "Ingress",
		Name:      "vm-ingress-" + vm.Name,
		Namespace: vm.Namespace,
	})

	if err != nil {
		return err
	}

	err = s.deleteResource(CreatedResource{
		Group:     "kubevirt.io",
		Version:   "v1",
		Kind:      "VirtualMachine",
		Name:      vm.Name,
		Namespace: vm.Namespace,
	})

	if err != nil {
		return err
	}

	err = s.deleteResource(CreatedResource{
		Version:   "v1",
		Kind:      "Secret",
		Name:      vm.Name + "-cloud-init-userdata",
		Namespace: vm.Namespace,
	})

	if err != nil {
		return err
	}

	err = s.deleteResource(CreatedResource{
		Group:     "cdi.kubevirt.io",
		Version:   "v1beta1",
		Kind:      "DataVolume",
		Name:      vm.Name + "-disk",
		Namespace: vm.Namespace,
	})

	if err != nil {
		return err
	}

	err = s.deleteResource(CreatedResource{
		Version:   "v1",
		Kind:      "Service",
		Name:      "vps-web-" + vm.Name,
		Namespace: vm.Namespace,
	})

	if err != nil {
		return err
	}

	return nil
}

// waitForVMStatus는 VM의 상태가 원하는 상태(desiredStatus)가 될 때까지 5초 간격으로 폴링합니다.
// 최대 1분간 대기하며, 시간 내에 상태가 변경되지 않으면 타임아웃 에러를 반환합니다.
func (s *K8sService) waitForVMStatus(namespace, name, desiredStatus string) error {
	ctx := context.Background()
	gvrVM := schema.GroupVersionResource{Group: "kubevirt.io", Version: "v1", Resource: "virtualmachines"}

	// 1분 타임아웃 설정
	timeout := time.After(1 * time.Minute)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-timeout:
			return fmt.Errorf("timeout waiting for VM status to become %s", desiredStatus)
		case <-ticker.C:
			// VM 리소스 조회
			vmObj, err := s.dynamicClient.Resource(gvrVM).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
			if err != nil {
				return fmt.Errorf("failed to get VM status: %v", err)
			}

			// status.printableStatus 필드 확인
			// KubeVirt는 status.printableStatus에 현재 상태를 문자열로 제공함 (e.g. "Running", "Stopped", "Provisioning")
			status, found, err := unstructured.NestedString(vmObj.Object, "status", "printableStatus")
			if !found || err != nil {
				// 아직 status 필드가 없을 수 있음 (초기화 중)
				continue
			}

			if strings.EqualFold(status, desiredStatus) {
				return nil
			}
		}
	}
}

// WaitForVMProvisioning는 VM의 상태가 Running이 될 때까지 폴링합니다.
// 전달받은 context의 라이프사이클을 따르며, 타임아웃 시 에러를 반환합니다.
// Timeout을 통해 고루틴 누수를 방지할 수 있습니다.
func (s *K8sService) WaitForVMProvisioning(ctx context.Context, namespace, name string) error {
	gvrVM := schema.GroupVersionResource{Group: "kubevirt.io", Version: "v1", Resource: "virtualmachines"}

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("context cancelled or timed out waiting for VM %s to be provisioned", name)
		case <-ticker.C:
			// VM 리소스 조회
			vmObj, err := s.dynamicClient.Resource(gvrVM).Namespace(namespace).Get(context.Background(), name, metav1.GetOptions{})
			if err != nil {
				fmt.Printf("Failed to check VM %s status during provisioning: %v\n", name, err)
				continue
			}

			status, found, err := unstructured.NestedString(vmObj.Object, "status", "printableStatus")
			if !found || err != nil {
				// 아직 초기화 중
				continue
			}

			if strings.EqualFold(status, "Running") {
				return nil
			}

			// Failed 등 에러 상태 발생 시 즉시 실패 처리 로직 추가 가능하지만,
			// KubeVirt가 재시도할 수도 있으니 타임아웃까지 대기하는 편이 안전함.
		}
	}
}

// StopVM은 VM을 중지하고 리소스를 삭제합니다.
// 1. DB의 VM 상태를 'Stopping'으로 업데이트합니다.
// 2. K8s 상의 VirtualMachine 리소스만 삭제합니다.
// 3. 삭제가 완료되면 DB의 VM 상태를 'Stopped'로 업데이트합니다.
func (s *K8sService) StopVM(vm *models.VirtualMachine) error {
	ctx := context.Background()

	// 1. 상태 업데이트: Stopping
	if err := vmservice.GetVmService().UpdateVmStatus(vm.Name, models.VmStatusStopping); err != nil {
		return fmt.Errorf("failed to update VM status to Stopping: %v", err)
	}

	// 2. Spec Patch: running = false
	gvrVM := schema.GroupVersionResource{Group: "kubevirt.io", Version: "v1", Resource: "virtualmachines"}
	data := []byte(`{"spec":{"running":false}}`)
	_, err := s.dynamicClient.Resource(gvrVM).Namespace(vm.Namespace).Patch(
		ctx, vm.Name, types.MergePatchType, data, metav1.PatchOptions{})

	if err != nil {
		return fmt.Errorf("failed to patch VM running state: %v", err)
	}

	// 3. Watch: Stopped 상태 대기
	// 5초 간격으로 최대 1분동안 확인
	if err := s.waitForVMStatus(vm.Namespace, vm.Name, "Stopped"); err != nil {
		return fmt.Errorf("failed to wait for VM to stop: %v", err)
	}

	// 4. 상태 업데이트: Stopped
	if err := vmservice.GetVmService().UpdateVmStatus(vm.Name, models.VmStatusStopped); err != nil {
		return fmt.Errorf("failed to update VM status to Stopped: %v", err)
	}

	return nil
}

// StartVM은 VM을 시작(재시작)합니다.
// 1. VM Spec을 Patch하여 running=true로 설정합니다.
// 2. Watch를 통해 VM이 Running 상태가 될 때까지 대기합니다.
// 3. 성공 시 DB의 VM 상태를 Running으로 업데이트합니다.
func (s *K8sService) StartVM(vm *models.VirtualMachine) error {
	ctx := context.Background()

	// 1. Spec Patch: running = true
	gvrVM := schema.GroupVersionResource{Group: "kubevirt.io", Version: "v1", Resource: "virtualmachines"}
	patchData := []byte(`{"spec": {"running": true}}`)
	_, err := s.dynamicClient.Resource(gvrVM).Namespace(vm.Namespace).Patch(ctx, vm.Name, types.MergePatchType, patchData, metav1.PatchOptions{})
	if err != nil {
		return fmt.Errorf("failed to patch VM running state: %v", err)
	}

	// 2. Watch: Running 상태 대기
	// 5초 간격으로 최대 1분동안 확인
	if err := s.waitForVMStatus(vm.Namespace, vm.Name, "Running"); err != nil {
		return fmt.Errorf("failed to wait for VM to start: %v", err)
	}

	// 3. DB Status Update: Running
	if err := vmservice.GetVmService().UpdateVmStatus(vm.Name, models.VmStatusRunning); err != nil {
		return fmt.Errorf("failed to update VM status to Running: %v", err)
	}

	return nil
}

// GetTotalVMs returns the total number of VirtualMachine resources in the cluster.
func (s *K8sService) GetTotalVMs() (int, error) {
	gvr := schema.GroupVersionResource{Group: "kubevirt.io", Version: "v1", Resource: "virtualmachines"}

	list, err := s.dynamicClient.Resource(gvr).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return 0, err
	}

	return len(list.Items), nil
}
