import client from './client';

// VM 정보 인터페이스
export interface VM {
  Name: string;
  Namespace: string;
  UserID: number;
  Status: string; // 예: "Running", "Stopped"
  NodePort: number;
}

// VM 목록 조회 응답 DTO
interface FetchVMsResponse {
  vms: VM[];
}

// VM 생성 요청 파라미터 DTO
interface CreateVMParams {
  vm_name: string;
  vm_ssh_password: string;
  vm_image: string;
  vm_host: string;
}

/**
 * 사용자의 모든 VM 목록을 조회합니다.
 */
export const fetchVMs = async (): Promise<FetchVMsResponse> => {
  // 문서상 /vm/fetch
  const response = await client.get<FetchVMsResponse>('/vm/fetch');
  return response.data;
};

/**
 * 특정 VM을 중지시킵니다.
 * @param vmName 중지할 VM의 이름
 */
export const stopVM = async (vmName: string): Promise<unknown> => {
  const response = await client.post('/vm/stop', { vm_name: vmName });
  return response.data;
};

/**
 * 특정 VM을 시작시킵니다.
 * @param vmName 시작할 VM의 이름
 */
export const startVM = async (vmName: string): Promise<unknown> => {
  const response = await client.post('/vm/start', { vm_name: vmName });
  return response.data;
};

/**
 * 특정 VM을 삭제합니다.
 * @param vmName 삭제할 VM의 이름
 */
export const deleteVM = async (vmName: string): Promise<unknown> => {
  // Delete 요청의 Body에 데이터를 실어 보냅니다.
  const response = await client.delete('/vm/delete', { data: { vm_name: vmName } });
  return response.data;
};

/**
 * 새로운 VM을 생성합니다.
 * @param params VM 생성에 필요한 정보 (이름, 비밀번호, 이미지, 호스트 접두사)
 */
export const createVM = async (params: CreateVMParams): Promise<unknown> => {
  const response = await client.post('/vm/create', params);
  return response.data;
}
