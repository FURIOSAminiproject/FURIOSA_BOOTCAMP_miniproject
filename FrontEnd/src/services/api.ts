export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch('/api' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) {
    let message = '서버 요청에 실패했습니다. (' + response.status + ')';
    try {
      const error = await response.json();
      if (Array.isArray(error.message)) message = error.message.join(', ');
      else if (typeof error.message === 'string') message = error.message;
    } catch { /* Use the status message for non-JSON responses. */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
