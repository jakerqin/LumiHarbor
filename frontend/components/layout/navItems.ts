import {
  Home,
  Image,
  FolderOpen,
  FileText,
  Map,
  Settings,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

/** Dock / 移动底栏共用，避免两端漂移 */
export const MAIN_NAV: NavItem[] = [
  { href: '/', label: '首页', shortcut: 'H', icon: Home },
  { href: '/assets', label: '素材', shortcut: 'A', icon: Image },
  { href: '/albums', label: '相册', shortcut: 'L', icon: FolderOpen },
  { href: '/notes', label: '笔记', shortcut: 'N', icon: FileText },
  { href: '/map', label: '地图', shortcut: 'M', icon: Map },
  { href: '/settings', label: '设置', shortcut: 'S', icon: Settings },
  { href: '/mobile-upload', label: '快传', shortcut: 'U', icon: UploadCloud },
];

export function isNavActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
