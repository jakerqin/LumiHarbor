'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl';

/**
 * 粒子背景组件的属性配置
 */
interface ParticleBackgroundProps {
  /** 粒子数量，默认 200 */
  particleCount?: number;
  /** 粒子扩散范围，默认 10 */
  particleSpread?: number;
  /** 动画速度，默认 0.1 */
  speed?: number;
  /** 粒子颜色数组（十六进制格式），默认深色主题适配色 */
  particleColors?: string[];
  /** 是否启用鼠标悬停移动效果，默认 false */
  moveParticlesOnHover?: boolean;
  /** 鼠标悬停影响因子，默认 1 */
  particleHoverFactor?: number;
  /** 是否启用透明粒子（圆形渐变），默认 false */
  alphaParticles?: boolean;
  /** 粒子基础大小，默认 100 */
  particleBaseSize?: number;
  /** 粒子大小随机性，0 表示无随机性，默认 1 */
  sizeRandomness?: number;
  /** 相机距离，默认 20 */
  cameraDistance?: number;
  /** 是否禁用旋转，默认 false */
  disableRotation?: boolean;
  /** 像素比率，默认 1 */
  pixelRatio?: number;
}

// 深色主题适配的默认粒子颜色（低饱和度冷色调）
const defaultColors: string[] = [
  '#4a5568', // 深灰蓝
  '#2d3748', // 更深的灰蓝
  '#1a202c', // 接近黑色的深蓝
];

/**
 * 将十六进制颜色转换为 RGB 浮点数组（0-1 范围）
 */
const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

// 顶点着色器：处理粒子的位置、大小和动画
const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    // 将粒子位置按扩散范围缩放
    vec3 pos = position * uSpread;
    pos.z *= 10.0;

    // 应用模型变换
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;

    // 使用正弦波实现粒子的流动动画
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

    // 应用视图变换
    vec4 mvPos = viewMatrix * mPos;

    // 计算粒子大小（考虑距离和随机性）
    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    // 最终位置
    gl_Position = projectionMatrix * mvPos;
  }
`;

// 片段着色器：处理粒子的颜色和形状
const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));

    if(uAlphaParticles < 0.5) {
      // 实心圆形粒子（硬边缘）
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      // 透明渐变圆形粒子（柔和边缘）
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`;

/**
 * 全局背景粒子流组件
 *
 * 使用 OGL (WebGL) 渲染 3D 粒子动画作为页面背景
 * 支持鼠标交互、自定义颜色、动画速度等配置
 */
const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 创建 WebGL 渲染器
    const renderer = new Renderer({
      dpr: pixelRatio,
      depth: false,
      alpha: true,
    });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0); // 透明背景

    // 创建相机
    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    // 处理窗口大小变化
    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener('resize', resize, false);
    resize();

    // 鼠标移动事件处理
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current = { x, y };
    };

    if (moveParticlesOnHover) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    // 生成粒子数据
    const count = particleCount;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    const palette = particleColors && particleColors.length > 0 ? particleColors : defaultColors;

    // 在单位球体内均匀分布粒子
    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number, len: number;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);

      const r = Math.cbrt(Math.random());
      positions.set([x * r, y * r, z * r], i * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);

      const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
      colors.set(col, i * 3);
    }

    // 创建几何体
    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
    });

    // 创建着色器程序
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize * pixelRatio },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
    });

    // 创建粒子网格
    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    let animationFrameId: number;
    let lastTime = performance.now();
    let elapsed = 0;

    // 动画循环
    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update);
      const delta = t - lastTime;
      lastTime = t;
      elapsed += delta * speed;

      program.uniforms.uTime.value = elapsed * 0.001;

      // 鼠标交互
      if (moveParticlesOnHover) {
        particles.position.x = -mouseRef.current.x * particleHoverFactor;
        particles.position.y = -mouseRef.current.y * particleHoverFactor;
      } else {
        particles.position.x = 0;
        particles.position.y = 0;
      }

      // 旋转动画
      if (!disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
        particles.rotation.z += 0.01 * speed;
      }

      renderer.render({ scene: particles, camera });
    };

    animationFrameId = requestAnimationFrame(update);

    // 清理函数
    return () => {
      window.removeEventListener('resize', resize);
      if (moveParticlesOnHover) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }
    };
  }, [
    particleCount,
    particleSpread,
    speed,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
    pixelRatio,
  ]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10"
      aria-hidden="true"
    />
  );
};

export default ParticleBackground;
