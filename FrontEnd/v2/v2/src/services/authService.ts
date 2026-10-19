const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

/**
 * Sends user registration data to the NestJS backend API (/auth/register)
 */
export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.message && Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || `서버 오류 (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        '백엔드 서버(http://localhost:3001)에 연결할 수 없습니다. NestJS 서버가 켜져 있는지 확인해주세요.',
      );
    }
    throw err;
  }
}

