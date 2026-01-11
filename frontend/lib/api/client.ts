import axios from 'axios';

export class ApiError extends Error {
  code?: string;
  status?: number;
  raw?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; raw?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code;
    this.status = options?.status;
    this.raw = options?.raw;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStandardApiResponse(value: unknown): value is { code: string; message: string; result: unknown } {
  if (!isObject(value)) return false;
  return typeof value.code === 'string' && 'result' in value && typeof value.message === 'string';
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data;

    // 仅在命中后端统一响应格式时做解包
    if (isStandardApiResponse(payload)) {
      if (payload.code === '0') {
        return { ...response, data: payload.result };
      }

      return Promise.reject(
        new ApiError(payload.message || '请求失败', {
          code: payload.code,
          status: response.status,
          raw: payload,
        })
      );
    }

    // 非统一格式（例如部分接口直接返回业务对象）保持原样
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }

    const payload = error.response?.data;
    if (isStandardApiResponse(payload)) {
      return Promise.reject(
        new ApiError(payload.message || '请求失败', {
          code: payload.code,
          status: error.response?.status,
          raw: payload,
        })
      );
    }

    return Promise.reject(error);
  }
);
