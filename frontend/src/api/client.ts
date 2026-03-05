import axios from 'axios';

const isDev = import.meta.env.DEV;
const domain = import.meta.env.DOMAIN;

// "dev시에는 domain.com으로, dev가 아니면 ./ 상대주소로 설정"
// 프로덕션 환경에서는 같은 도메인의 /api로 요청을 보냅니다.
let baseURL = './api'; 

if (isDev && domain) {
  // 개발 환경에서 도메인이 주어지면 해당 도메인을 사용합니다.
  const protocol = domain.includes('://') ? '' : 'http://';
  baseURL = `${protocol}${domain}/api`;
}

/**
 * Axios 인스턴스 생성
 * withCredentials: true를 설정하여 쿠키(JWT 등)를 자동으로 주고받도록 합니다.
 */
const client = axios.create({
  baseURL: baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;
