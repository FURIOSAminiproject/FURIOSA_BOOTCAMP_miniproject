const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface RegisterPayload { name: string; email: string; password: string; }
export interface AuthUser { id: string; name: string; email: string | null; provider: string; }
export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: { id: string; name: string; email: string | null; createdAt: string };
}

async function readResponse<T>(response: Response): Promise<T> {
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(message || `서버 오류 (HTTP ${response.status})`);
  }
  return data as T;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      credentials: 'include',
    });
    return await readResponse<RegisterResponse>(response);
  } catch (err: any) {
    if (err instanceof TypeError) throw new Error('백엔드 서버(http://localhost:3001)에 연결할 수 없습니다. NestJS 서버를 확인해주세요.');
    throw err;
  }
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }), credentials: 'include',
  });
  const data = await readResponse<{ user: AuthUser }>(response);
  return data.user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
  const data = await readResponse<{ authenticated: boolean; user: AuthUser | null }>(response);
  return data.authenticated ? data.user : null;
}

export async function logoutUser(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST', credentials: 'include',
  });
  await readResponse<{ success: boolean }>(response);
}

export function startSocialLogin(provider: 'google' | 'kakao' | 'naver'): void {
  window.location.assign(`${API_BASE_URL}/auth/${provider}`);
}
