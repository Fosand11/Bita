import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'bita_auth_token';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function buildHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getToken();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await buildHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : undefined);
  console.log('[API DEBUG]', method, path, 'auth header?', Boolean(headers.Authorization));

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonSafe(response);
  console.log('[API DEBUG]', method, path, 'status', response.status);

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string'
        ? (data as any).message
        : null) ?? `Error de red (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),

  /** Sube un archivo (multipart/form-data) a `path` usando la URI local de React Native. */
  async upload<T>(
    path: string,
    file: { uri: string; name: string; type: string }
  ): Promise<T> {
    const headers = await buildHeaders();
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await parseJsonSafe(response);

    if (!response.ok) {
      const message =
        (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string'
          ? (data as any).message
          : null) ?? `Error al subir el archivo (${response.status})`;
      throw new ApiError(message, response.status, data);
    }

    return data as T;
  },
};
