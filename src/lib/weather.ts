export interface WeatherData {
  temperature: number;
  weatherCode: number;
  condition: string;
}

// Hàm chuyển đổi WMO Weather code sang văn bản mô tả tiếng Việt
const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Trời quang đãng';
  if (code >= 1 && code <= 3) return 'Có mây rải rác';
  if (code >= 45 && code <= 48) return 'Có sương mù';
  if (code >= 51 && code <= 67) return 'Có mưa nhẹ / mưa rào';
  if (code >= 80 && code <= 82) return 'Mưa rào lớn';
  if (code >= 95) return 'Có dông bão';
  return 'Thời tiết bình thường';
};

export const fetchCurrentWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_weather;

    return {
      temperature: current.temperature,
      weatherCode: current.weathercode,
      condition: getWeatherCondition(current.weathercode)
    };
  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu thời tiết:', err);
    return null;
  }
};
