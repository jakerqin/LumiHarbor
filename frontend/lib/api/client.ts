import axios from 'axios';
import { resolveApiBaseUrl } from './baseUrl';

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
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 每次请求按当前访问主机解析，避免局域网手机仍打 localhost
    config.baseURL = resolveApiBaseUrl();
    // FormData 必须由浏览器自动带 multipart boundary，不能沿用默认 application/json
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete (config.headers as Record<string, unknown>)['Content-Type'];
        delete (config.headers as Record<string, unknown>)['content-type'];
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
