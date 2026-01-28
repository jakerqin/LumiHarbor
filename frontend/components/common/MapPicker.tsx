'use client';

import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { X, MapPin, Loader2, Search } from 'lucide-react';

export interface LocationData {
  latitude: number;
  longitude: number;
  poi?: string;
  formatted?: string;
  country?: string;
  province?: string;
  city?: string;
  district?: string;
}

interface MapPickerProps {
  open: boolean;
  defaultCenter?: [number, number]; // [纬度, 经度]
  onConfirm: (location: LocationData) => void;
  onClose: () => void;
}

export function MapPicker({ open, defaultCenter = [31.2304, 121.4737], onConfirm, onClose }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 搜索防抖 timeout
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ lng: number; lat: number } | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [autoComplete, setAutoComplete] = useState<any>(null);

  // 初始化地图
  useEffect(() => {
    if (!open || !mapRef.current) return;

    const initMap = async () => {
      try {
        setMapLoading(true);

        // 配置安全密钥
        (window as any)._AMapSecurityConfig = {
          securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '',
        };

        // 加载高德地图
        const AMap = await AMapLoader.load({
          key: process.env.NEXT_PUBLIC_AMAP_KEY || '',
          version: '2.0',
          plugins: ['AMap.Geocoder', 'AMap.AutoComplete', 'AMap.PlaceSearch'],
        });

        // 创建地图实例
        const mapInstance = new AMap.Map(mapRef.current, {
          zoom: 13,
          center: [defaultCenter[1], defaultCenter[0]], // 高德地图使用 [经度, 纬度]
          viewMode: '3D',
        });

        setMap(mapInstance);
        setMapLoading(false);

        // 创建 AutoComplete 实例
        const autoCompleteInstance = new AMap.AutoComplete({
          city: '全国',
        });
        setAutoComplete(autoCompleteInstance);

        // 监听地图点击事件
        mapInstance.on('click', (e: any) => {
          const { lng, lat } = e.lnglat;
          handleMapClick(lng, lat, mapInstance, AMap);
        });
      } catch (error) {
        console.error('地图加载失败:', error);
        setMapLoading(false);
      }
    };

    initMap();

    // 清理函数
    return () => {
      if (map) {
        map.destroy();
      }
    };
  }, [open]);

  // 处理地图点击
  const handleMapClick = async (lng: number, lat: number, mapInstance: any, AMap: any) => {
    setSelectedPosition({ lng, lat });

    // 添加或更新标记
    if (marker) {
      marker.setPosition([lng, lat]);
    } else {
      const newMarker = new AMap.Marker({
        position: [lng, lat],
        map: mapInstance,
      });
      setMarker(newMarker);
    }

    // 逆地理编码
    await reverseGeocode(lng, lat, AMap);
  };

  // 逆地理编码
  const reverseGeocode = async (lng: number, lat: number, AMap: any) => {
    setLoading(true);
    try {
      const geocoder = new AMap.Geocoder({
        radius: 1000,
        extensions: 'all',
      });

      geocoder.getAddress([lng, lat], (status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK') {
          const addressComponent = result.regeocode.addressComponent;
          const formattedAddress = result.regeocode.formattedAddress;
          const pois = result.regeocode.pois;

          const locationData: LocationData = {
            latitude: lat,
            longitude: lng,
            poi: pois && pois.length > 0 ? pois[0].name : undefined,
            formatted: formattedAddress,
            country: addressComponent.country,
            province: addressComponent.province,
            city: addressComponent.city,
            district: addressComponent.district,
          };

          setLocationData(locationData);
        } else {
          // 失败时保存基本信息
          setLocationData({
            latitude: lat,
            longitude: lng,
          });
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('逆地理编码失败:', error);
      setLocationData({
        latitude: lat,
        longitude: lng,
      });
      setLoading(false);
    }
  };

  // 处理搜索输入（带防抖）
  const handleSearchInput = (value: string) => {
    setSearchKeyword(value);

    // 清除之前的 timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // 设置新的 timeout，600ms 后执行搜索
    searchTimeoutRef.current = setTimeout(() => {
      if (autoComplete) {
        console.log('开始搜索:', value);
        autoComplete.search(value, (status: string, result: any) => {
          console.log('搜索状态:', status);
          console.log('搜索结果:', result);
          if (status === 'complete' && result.tips) {
            // 过滤掉没有 location 的结果
            const validResults = result.tips.filter((item: any) => item.location);
            console.log('有效结果数量:', validResults.length);
            setSearchResults(validResults);
            setShowSearchResults(validResults.length > 0);
          } else {
            console.log('搜索失败或无结果');
            setSearchResults([]);
            setShowSearchResults(false);
          }
        });
      } else {
        console.log('AutoComplete 实例未初始化');
      }
    }, 600);
  };

  // 选择搜索结果
  const handleSelectSearchResult = async (item: any) => {
    if (!map) return;

    const { location, name, district, address } = item;
    if (!location) return;

    const lng = location.lng;
    const lat = location.lat;

    // 地图跳转到选中位置
    map.setCenter([lng, lat]);
    map.setZoom(15);

    // 添加或更新标记
    if (marker) {
      marker.setPosition([lng, lat]);
    } else {
      const AMap = (window as any).AMap;
      const newMarker = new AMap.Marker({
        position: [lng, lat],
        map: map,
      });
      setMarker(newMarker);
    }

    // 设置位置数据
    setSelectedPosition({ lng, lat });

    // 构建位置信息
    const locationData: LocationData = {
      latitude: lat,
      longitude: lng,
      poi: name,
      formatted: address || `${district}${name}`,
    };
    setLocationData(locationData);

    // 清空搜索
    setSearchKeyword('');
    setSearchResults([]);
    setShowSearchResults(false);

    // 执行逆地理编码获取完整地址信息
    const AMap = (window as any).AMap;
    await reverseGeocode(lng, lat, AMap);
  };

  const handleConfirm = () => {
    if (locationData) {
      onConfirm(locationData);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="关闭"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl h-[600px] rounded-2xl bg-background border border-white/10 shadow-2xl overflow-hidden flex flex-col">
          {/* 地图容器 */}
          <div className="flex-1 relative">
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/90 hover:bg-white border border-gray-200 transition-colors shadow-sm"
              aria-label="关闭"
            >
              <X size={18} className="text-gray-700" />
            </button>

            {/* 搜索输入框 */}
            {!mapLoading && (
              <div className="absolute top-4 left-4 z-10">
                <div className="relative w-80">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchResults.length > 0) {
                          handleSelectSearchResult(searchResults[0]);
                        }
                      }}
                      placeholder="搜索位置、公交站、地铁站"
                      className="w-full pl-4 pr-10 py-2.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors shadow-sm"
                    />
                    <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>

                  {/* 搜索结果列表 */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-lg bg-background/95 backdrop-blur-sm border border-white/10 shadow-xl">
                      {searchResults.map((item: any, index: number) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                        >
                          <div className="text-sm font-medium">{item.name}</div>
                          {item.district && (
                            <div className="text-xs text-foreground-secondary mt-1">
                              {item.district}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 地图加载提示 */}
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">加载地图中...</span>
                </div>
              </div>
            )}

            {/* 逆地理编码加载提示 */}
            {loading && !mapLoading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-background-secondary/90 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">获取地点信息...</span>
              </div>
            )}
          </div>

          {/* 底部信息和操作 */}
          <div className="p-5 border-t border-white/10 space-y-4">
            {/* 地点信息 */}
            {locationData && (
              <div className="space-y-2">
                <div className="text-sm text-foreground-secondary">
                  <span className="font-medium">经纬度：</span>
                  {locationData.longitude.toFixed(6)}, {locationData.latitude.toFixed(6)}
                </div>
                {locationData.formatted && (
                  <div className="text-sm text-foreground-secondary">
                    <span className="font-medium">地址：</span>
                    {locationData.formatted}
                  </div>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!locationData || loading}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
