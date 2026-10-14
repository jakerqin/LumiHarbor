/** @type {import('next').NextConfig} */

// 媒体文件转发目标：Next 服务端访问后端的地址（同机默认 localhost:8000，Docker 内设为 http://backend:8000）
const mediaBackend = (process.env.MEDIA_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // 后端默认返回相对路径 /media/...，由 Next 转发，手机/其他设备访问前端时图片也能加载。
  // 只转发媒体；API 和上传仍直连后端（Next 代理默认 30s 超时，大文件上传会被切断）
  async rewrites() {
    return [{ source: '/media/:path*', destination: `${mediaBackend}/media/:path*` }];
  },
};

export default nextConfig;
