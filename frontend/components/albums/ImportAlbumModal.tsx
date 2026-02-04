'use client';

import { useEffect, useState } from 'react';
import { X, FolderInput, Calendar, MapPin } from 'lucide-react';
import { MapPicker, type LocationData } from '@/components/common/MapPicker';
import { SingleDatePicker, type ActiveDatePicker } from '@/components/common/SingleDatePicker';
import { format } from 'date-fns';

export interface ImportAlbumData {
  album_name: string;
  description?: string;
  source_path: string;
  start_time?: string;
  end_time?: string;
  default_gps?: string; // 格式：经度,纬度
}

interface ImportAlbumModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ImportAlbumData) => void;
  loading?: boolean;
}

function formatDate(date?: Date): string | undefined {
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
}

export function ImportAlbumModal({ open, onClose, onSubmit, loading }: ImportAlbumModalProps) {
  const [formData, setFormData] = useState<ImportAlbumData>({
    album_name: '',
    description: '',
    source_path: '',
    start_time: '',
    end_time: '',
    default_gps: '',
  });
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [activePicker, setActivePicker] = useState<ActiveDatePicker>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // 重置表单
  const resetForm = () => {
    setFormData({
      album_name: '',
      description: '',
      source_path: '',
      start_time: '',
      end_time: '',
      default_gps: '',
    });
    setStartDate(undefined);
    setEndDate(undefined);
    setActivePicker(null);
    setSelectedLocation(null);
  };

  // 打开时重置
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: ImportAlbumData = {
      album_name: formData.album_name,
      description: formData.description,
      source_path: formData.source_path,
      start_time: formatDate(startDate),
      end_time: formatDate(endDate),
    };

    if (selectedLocation) {
      submitData.default_gps = `${selectedLocation.longitude},${selectedLocation.latitude}`;
    }

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleMapConfirm = (location: LocationData) => {
    setSelectedLocation(location);
    setMapPickerOpen(false);
  };

  // 显示已选位置
  const displayLocation = selectedLocation
    ? selectedLocation.formatted || selectedLocation.poi || `${selectedLocation.longitude.toFixed(6)}, ${selectedLocation.latitude.toFixed(6)}`
    : '';

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 背景遮罩 */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal 内容 */}
        <div className="relative w-full max-w-lg bg-background-secondary border border-white/10 rounded-2xl shadow-2xl">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <FolderInput size={24} className="text-primary" />
              <h2 className="text-xl font-heading font-bold">从文件夹导入</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-background-tertiary transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* 相册名称 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                相册名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.album_name}
                onChange={(e) => setFormData({ ...formData, album_name: e.target.value })}
                placeholder="例如：2024春节旅行"
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-background-tertiary border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>

            {/* 文件夹路径 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                文件夹路径 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.source_path}
                onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
                placeholder="/Volumes/NAS/Photos/2024"
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-background-tertiary border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-foreground-secondary">
                输入服务器可访问的文件夹路径
              </p>
            </div>

            {/* 拍摄时间范围 */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-foreground-secondary" />
                拍摄时间范围
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-foreground-secondary mb-2">
                    开始时间
                  </label>
                  <SingleDatePicker
                    pickerKey="start"
                    value={startDate}
                    activeKey={activePicker}
                    onActiveChange={setActivePicker}
                    onChange={setStartDate}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground-secondary mb-2">
                    结束时间
                  </label>
                  <SingleDatePicker
                    pickerKey="end"
                    value={endDate}
                    activeKey={activePicker}
                    onActiveChange={setActivePicker}
                    onChange={setEndDate}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 拍摄地点 */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-foreground-secondary" />
                拍摄地点
              </label>
              {selectedLocation ? (
                <div className="relative group">
                  <div className="w-full px-4 py-3 rounded-lg bg-background-tertiary border border-white/10 flex items-center gap-2">
                    <MapPin size={16} className="text-primary flex-shrink-0" />
                    <span className="text-sm truncate">{displayLocation}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                      disabled={loading}
                    >
                      更换
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLocation(null)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                      disabled={loading}
                    >
                      清除
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMapPickerOpen(true)}
                  className="w-full px-4 py-3 rounded-lg bg-background-tertiary border border-white/10 hover:border-primary/30 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-foreground-secondary"
                  disabled={loading}
                >
                  <MapPin size={18} />
                  <span className="text-sm">在地图上选择位置</span>
                </button>
              )}
            </div>

            {/* 相册描述 */}
            <div>
              <label className="block text-sm font-medium mb-2">描述（可选）</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="记录这段旅程的美好回忆..."
                rows={3}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-background-tertiary border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50"
              />
            </div>

            {/* 按钮 */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-background-tertiary hover:bg-background-tertiary/80 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !formData.album_name || !formData.source_path}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '导入中...' : '开始导入'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 地图选择器 */}
      <MapPicker
        open={mapPickerOpen}
        defaultCenter={selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] : undefined}
        onConfirm={handleMapConfirm}
        onClose={() => setMapPickerOpen(false)}
      />
    </>
  );
}
