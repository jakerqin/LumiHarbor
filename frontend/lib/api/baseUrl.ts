/**
 * 解析后端 API 根地址。
 * 局域网手机访问时，若仍用 .env 里的 localhost，请求会打到手机本机而失败；
 * 因此非本机 hostname 时改打「当前页面主机:后端端口」。
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLoopback) {
      let port = '8000';
      if (fromEnv) {
        try {
          const parsed = new URL(fromEnv);
          if (parsed.port) port = parsed.port;
        } catch {
          // ignore invalid env
        }
      }
      return `${protocol}//${hostname}:${port}`;
    }
  }

  return fromEnv || 'http://localhost:8000';
}
