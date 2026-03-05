import client from './client';

export interface HealthResponse {
  status: string;
  k8s_connectivity: string;
  active_vms?: number;
}

export const getHealth = async (): Promise<HealthResponse> => {
  const response = await client.get<HealthResponse>('/health');
  return response.data;
};
