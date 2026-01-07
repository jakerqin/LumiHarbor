"""地理编码服务

提供逆地理编码（Reverse Geocoding）功能，将 GPS 坐标转换为地点信息。

支持的服务商：
- 高德地图 API（中国区域推荐）
- Nominatim（OpenStreetMap，免费）
"""
from typing import Optional, Dict, Tuple
from abc import ABC, abstractmethod
import requests
from functools import lru_cache
from ...tools.utils import get_logger

logger = get_logger(__name__)


class GeocodingProvider(ABC):
    """地理编码服务商抽象基类"""

    @abstractmethod
    def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict]:
        """逆地理编码：坐标 → 地址

        Args:
            latitude: 纬度
            longitude: 经度

        Returns:
            地址信息字典，失败返回 None
            {
                'country': '中国',
                'province': '北京市',
                'city': '北京市',
                'district': '东城区',
                'poi': '故宫博物院',
                'formatted_address': '北京市东城区故宫'
            }
        """
        pass


class AMapGeocodingProvider(GeocodingProvider):
    """高德地图地理编码服务

    特点：
    - 中国区域精准度高
    - 免费额度：每日 30 万次
    - 需要申请 API Key
    """

    def __init__(self, api_key: Optional[str] = None):
        """初始化高德地图服务

        Args:
            api_key: 高德地图 API Key（不提供则跳过）
        """
        self.api_key = api_key
        self.base_url = "https://restapi.amap.com/v3/geocode/regeo"

    def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict]:
        """高德地图逆地理编码"""
        if not self.api_key:
            logger.debug("高德地图 API Key 未配置，跳过")
            return None

        try:
            # 高德地图使用 经度,纬度 的顺序
            location = f"{longitude},{latitude}"

            params = {
                'key': self.api_key,
                'location': location,
                'extensions': 'base',  # base: 基础信息
                'output': 'JSON'
            }

            response = requests.get(self.base_url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()

            if data.get('status') == '1' and data.get('regeocode'):
                addressComponent = data['regeocode']['addressComponent']
                formatted_address = data['regeocode']['formatted_address']

                return {
                    'country': addressComponent.get('country', ''),
                    'province': addressComponent.get('province', ''),
                    'city': addressComponent.get('city', '') or addressComponent.get('province', ''),
                    'district': addressComponent.get('district', ''),
                    'poi': data['regeocode'].get('pois', [{}])[0].get('name', '') if data['regeocode'].get('pois') else '',
                    'formatted_address': formatted_address
                }

            logger.warning(f"高德地图逆地理编码失败: {data.get('info', 'Unknown error')}")
            return None

        except requests.exceptions.Timeout:
            logger.warning(f"高德地图请求超时: ({latitude}, {longitude})")
            return None
        except Exception as e:
            logger.error(f"高德地图逆地理编码异常: {e}")
            return None


class NominatimGeocodingProvider(GeocodingProvider):
    """Nominatim 地理编码服务（OpenStreetMap）

    特点：
    - 完全免费
    - 全球覆盖
    - 国内可能较慢
    - 有请求频率限制（每秒 1 次）
    """

    def __init__(self):
        self.base_url = "https://nominatim.openstreetmap.org/reverse"
        self.user_agent = "LumiHarbor/1.0"

    def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict]:
        """Nominatim 逆地理编码"""
        try:
            params = {
                'lat': latitude,
                'lon': longitude,
                'format': 'json',
                'addressdetails': 1,
                'accept-language': 'zh-CN'
            }

            headers = {
                'User-Agent': self.user_agent
            }

            response = requests.get(
                self.base_url,
                params=params,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            if data and 'address' in data:
                address = data['address']

                return {
                    'country': address.get('country', ''),
                    'province': address.get('state', ''),
                    'city': address.get('city', '') or address.get('town', '') or address.get('village', ''),
                    'district': address.get('suburb', '') or address.get('district', ''),
                    'poi': address.get('tourism', '') or address.get('amenity', ''),
                    'formatted_address': data.get('display_name', '')
                }

            return None

        except requests.exceptions.Timeout:
            logger.warning(f"Nominatim 请求超时: ({latitude}, {longitude})")
            return None
        except Exception as e:
            logger.error(f"Nominatim 逆地理编码异常: {e}")
            return None


class LocationService:
    """地理位置服务

    特点：
    - 支持多个地理编码服务商
    - 自动降级（主服务失败时尝试备选）
    - LRU 缓存（避免重复请求）
    """

    def __init__(self, amap_api_key: Optional[str] = None):
        """初始化地理位置服务

        Args:
            amap_api_key: 高德地图 API Key（可选）
        """
        self.providers = []

        # 添加高德地图（中国区域推荐）
        if amap_api_key:
            self.providers.append(AMapGeocodingProvider(amap_api_key))
            logger.info("已启用高德地图逆地理编码服务")

        # 添加 Nominatim（备选）
        self.providers.append(NominatimGeocodingProvider())
        logger.info("已启用 Nominatim 逆地理编码服务（备选）")

    @lru_cache(maxsize=1000)
    def get_location_info(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[Dict[str, str]]:
        """获取位置信息（带缓存）

        Args:
            latitude: 纬度
            longitude: 经度

        Returns:
            地址信息字典，失败返回 None
        """
        # 验证坐标有效性
        if not self._validate_coordinates(latitude, longitude):
            logger.warning(f"无效的坐标: ({latitude}, {longitude})")
            return None

        # 依次尝试各个服务商
        for provider in self.providers:
            result = provider.reverse_geocode(latitude, longitude)
            if result:
                logger.debug(
                    f"成功获取位置信息: ({latitude}, {longitude}) → "
                    f"{result.get('formatted_address', '')}"
                )
                return result

        logger.warning(f"所有地理编码服务均失败: ({latitude}, {longitude})")
        return None

    def extract_location_tags(
        self,
        latitude: float,
        longitude: float
    ) -> Dict[str, str]:
        """提取位置标签（用于保存到 asset_tags）

        Args:
            latitude: 纬度
            longitude: 经度

        Returns:
            标签字典 {tag_key: tag_value}
        """
        location_info = self.get_location_info(latitude, longitude)

        if not location_info:
            return {}

        return {
            'location_country': location_info.get('country', ''),
            'location_province': location_info.get('province', ''),
            'location_city': location_info.get('city', ''),
            'location_district': location_info.get('district', ''),
            'location_poi': location_info.get('poi', ''),
            'location_formatted': location_info.get('formatted_address', '')
        }

    @staticmethod
    def _validate_coordinates(latitude: float, longitude: float) -> bool:
        """验证坐标有效性"""
        return -90 <= latitude <= 90 and -180 <= longitude <= 180
