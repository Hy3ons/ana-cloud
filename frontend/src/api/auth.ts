import client from './client';

// 사용자 정보 인터페이스 (User Interface)
export interface User {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  UserStudentId: string; // JSON 태그가 없으면 필드명 그대로 (Golang 구조체)
  Username: string;
  Email: string;
  Namespace: string;
}

// 로그인 응답 DTO
interface LoginResponse {
  message: string;
  // 성공 시 쿠키가 설정되므로 토큰을 명시적으로 반환하지 않을 수 있음
}

// 내 정보 조회 응답 DTO
interface GetMeResponse {
  user: User;
}

// 회원가입 요청 DTO
interface RegisterRequest {
  studentId: string; // 문서상 CamelCase
  password: string;
  name: string;
  email: string;
}

/**
 * 로그인 API를 호출합니다.
 * @param studentId 학번
 * @param password 비밀번호
 */
export const login = async (studentId: string, password: string): Promise<LoginResponse> => {
  // 문서상 login은 snake_case: student_id
  const response = await client.post<LoginResponse>('/auth/login', { student_id: studentId, password });
  return response.data;
};

/**
 * 회원가입 API를 호출합니다.
 * @param data 회원가입 정보
 */
export const register = async (data: RegisterRequest): Promise<unknown> => {
  // 문서상 create는 CamelCase: studentId
  const response = await client.post('/users/create', data);
  return response.data;
}

/**
 * 현재 로그인한 사용자의 정보를 가져옵니다.
 * 쿠키에 저장된 토큰을 사용하여 상세 정보를 요청합니다.
 */
export const getMe = async (): Promise<GetMeResponse> => {
  const response = await client.get<GetMeResponse>('/users/me');
  return response.data;
};
