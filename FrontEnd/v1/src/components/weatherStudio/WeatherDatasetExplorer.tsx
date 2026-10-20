/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Calendar, BarChart3, CloudRain, Wind, Thermometer, Sparkles } from 'lucide-react';

export const WeatherDatasetExplorer: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState('제주');
  const [selectedMonth, setSelectedMonth] = useState(5);

  const regionData: {
    [key: string]: {
      [m: number]: { avg: number; min: number; max: number; rainChance: number; rainfallMm: number; wind: number; humidity: number };
    };
  } = {
    '제주': {
      1: { avg: 6.2, min: 3.5, max: 9.1, rainChance: 35, rainfallMm: 62, wind: 5.6, humidity: 68 },
      2: { avg: 7.1, min: 4.1, max: 10.3, rainChance: 32, rainfallMm: 68, wind: 5.2, humidity: 67 },
      3: { avg: 10.2, min: 6.8, max: 13.8, rainChance: 30, rainfallMm: 88, wind: 4.8, humidity: 66 },
      4: { avg: 14.8, min: 11.2, max: 18.6, rainChance: 28, rainfallMm: 95, wind: 4.4, humidity: 68 },
      5: { avg: 18.7, min: 15.3, max: 22.4, rainChance: 25, rainfallMm: 108, wind: 3.9, humidity: 73 },
      6: { avg: 22.1, min: 19.4, max: 25.4, rainChance: 45, rainfallMm: 215, wind: 3.7, humidity: 82 },
      7: { avg: 26.8, min: 24.2, max: 29.8, rainChance: 40, rainfallMm: 240, wind: 4.1, humidity: 85 },
      8: { avg: 27.5, min: 25.1, max: 30.5, rainChance: 38, rainfallMm: 260, wind: 4.3, humidity: 83 },
      9: { avg: 23.5, min: 20.6, max: 26.8, rainChance: 35, rainfallMm: 195, wind: 4.2, humidity: 77 },
      10: { avg: 18.6, min: 15.1, max: 22.3, rainChance: 22, rainfallMm: 85, wind: 4.5, humidity: 69 },
      11: { avg: 13.4, min: 9.8, max: 17.2, rainChance: 28, rainfallMm: 72, wind: 4.9, humidity: 67 },
      12: { avg: 8.3, min: 5.2, max: 11.6, rainChance: 33, rainfallMm: 55, wind: 5.4, humidity: 68 }
    },
    '강릉': {
      1: { avg: 0.9, min: -3.1, max: 5.3, rainChance: 25, rainfallMm: 48, wind: 3.4, humidity: 50 },
      2: { avg: 2.3, min: -1.8, max: 6.8, rainChance: 28, rainfallMm: 52, wind: 3.5, humidity: 52 },
      3: { avg: 6.9, min: 2.4, max: 11.8, rainChance: 29, rainfallMm: 68, wind: 3.7, humidity: 56 },
      4: { avg: 12.8, min: 7.9, max: 18.2, rainChance: 27, rainfallMm: 78, wind: 3.8, humidity: 58 },
      5: { avg: 17.6, min: 12.9, max: 22.7, rainChance: 28, rainfallMm: 95, wind: 3.4, humidity: 65 },
      6: { avg: 21.2, min: 17.4, max: 25.4, rainChance: 38, rainfallMm: 140, wind: 2.9, humidity: 76 },
      7: { avg: 25.1, min: 21.8, max: 29.1, rainChance: 45, rainfallMm: 245, wind: 2.7, humidity: 80 },
      8: { avg: 25.4, min: 21.9, max: 29.3, rainChance: 46, rainfallMm: 280, wind: 2.8, humidity: 81 },
      9: { avg: 20.8, min: 16.7, max: 25.2, rainChance: 35, rainfallMm: 210, wind: 2.9, humidity: 74 },
      10: { avg: 15.3, min: 10.6, max: 20.5, rainChance: 24, rainfallMm: 95, wind: 3.0, humidity: 63 },
      11: { avg: 9.3, min: 4.8, max: 14.3, rainChance: 26, rainfallMm: 75, wind: 3.2, humidity: 55 },
      12: { avg: 3.2, min: -1.0, max: 7.8, rainChance: 24, rainfallMm: 42, wind: 3.3, humidity: 50 }
    },
    '경주': {
      1: { avg: 0.5, min: -4.8, max: 6.4, rainChance: 22, rainfallMm: 38, wind: 2.8, humidity: 54 },
      2: { avg: 2.5, min: -3.2, max: 8.8, rainChance: 24, rainfallMm: 45, wind: 3.0, humidity: 56 },
      3: { avg: 7.2, min: 1.1, max: 13.9, rainChance: 26, rainfallMm: 62, wind: 3.2, humidity: 58 },
      4: { avg: 13.1, min: 6.7, max: 20.1, rainChance: 25, rainfallMm: 78, wind: 3.1, humidity: 60 },
      5: { avg: 18.2, min: 12.1, max: 25.0, rainChance: 24, rainfallMm: 92, wind: 2.8, humidity: 66 },
      6: { avg: 22.0, min: 17.2, max: 27.5, rainChance: 36, rainfallMm: 160, wind: 2.4, humidity: 77 },
      7: { avg: 25.6, min: 21.8, max: 30.2, rainChance: 42, rainfallMm: 235, wind: 2.3, humidity: 82 },
      8: { avg: 26.0, min: 22.0, max: 30.8, rainChance: 40, rainfallMm: 250, wind: 2.4, humidity: 81 },
      9: { avg: 21.2, min: 16.5, max: 26.6, rainChance: 32, rainfallMm: 175, wind: 2.5, humidity: 76 },
      10: { avg: 15.1, min: 9.2, max: 21.8, rainChance: 20, rainfallMm: 70, wind: 2.6, humidity: 68 },
      11: { avg: 8.6, min: 2.5, max: 15.2, rainChance: 23, rainfallMm: 52, wind: 2.7, humidity: 62 },
      12: { avg: 2.4, min: -3.3, max: 8.7, rainChance: 21, rainfallMm: 32, wind: 2.8, humidity: 57 }
    }
  };

  const curr = regionData[selectedRegion]?.[selectedMonth] || regionData['제주'][5];
  const diurnal = parseFloat((curr.max - curr.min).toFixed(1));

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold mb-2">
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>학생을 위한 딥러닝 시각화 3</span>
          </div>
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <span>10개년 기상청 ASOS 시계열 빅데이터 탐색기 (Dataset Explorer)</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            인공지능 모델이 학습한 2015-2025 10년간의 권역별 정규분포 기후 피처(기온, 강수, 습도, 풍속)를 직접 열람합니다.
          </p>
        </div>

        {/* Region & Month Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="text-xs sm:text-sm font-semibold bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
          >
            <option value="제주">제주도 (ASOS 184)</option>
            <option value="강릉">강릉 (ASOS 105)</option>
            <option value="경주">경주 (ASOS 283)</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-xs sm:text-sm font-semibold bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월 (Month {m})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-400 font-bold uppercase">평균 기온</span>
          <div className="text-lg font-bold font-mono text-emerald-800 mt-0.5">{curr.avg}℃</div>
          <span className="text-[10px] text-stone-500">10년 평균치</span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-400 font-bold uppercase">최고 / 최저</span>
          <div className="text-sm font-bold font-mono text-stone-800 mt-0.5">
            {curr.max}℃ / {curr.min}℃
          </div>
          <span className="text-[10px] text-stone-500">기온 분포 범위</span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-400 font-bold uppercase">일교차 (Diurnal)</span>
          <div className={`text-lg font-bold font-mono mt-0.5 ${diurnal >= 10 ? 'text-rose-600' : 'text-stone-800'}`}>
            {diurnal}℃
          </div>
          <span className="text-[10px] text-stone-500">{diurnal >= 10 ? '주의보 발령선' : '안정권'}</span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-400 font-bold uppercase">강수 확률</span>
          <div className="text-lg font-bold font-mono text-sky-700 mt-0.5">{curr.rainChance}%</div>
          <span className="text-[10px] text-stone-500">월 {curr.rainfallMm}mm</span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-400 font-bold uppercase">평균 풍속</span>
          <div className="text-lg font-bold font-mono text-teal-700 mt-0.5">{curr.wind} m/s</div>
          <span className="text-[10px] text-stone-500">{curr.wind >= 4.0 ? '돌풍 주의' : '온화'}</span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <span className="text-[10px] text-stone-400 font-bold uppercase">상대 습도</span>
          <div className="text-lg font-bold font-mono text-indigo-700 mt-0.5">{curr.humidity}%</div>
          <span className="text-[10px] text-stone-500">쾌적도 지수 연동</span>
        </div>
      </div>

      {/* 12-Month Temperature Profile Bar Graph for Selected Region */}
      <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 text-white space-y-4">
        <div className="flex items-center justify-between text-xs border-b border-stone-800 pb-2">
          <span className="font-bold text-amber-400">
            {selectedRegion} 10개년 연중(1~12월) 평균 기온 프로파일
          </span>
          <span className="text-[11px] font-mono text-stone-400">KMA 2015-2025 Normal Distribution</span>
        </div>

        <div className="grid grid-cols-12 gap-1.5 items-end h-36 pt-4 px-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const data = regionData[selectedRegion]?.[m] || regionData['제주'][m];
            const isSelected = m === selectedMonth;
            // scale 0 to 30 deg
            const heightPct = Math.max(10, Math.min(100, (data.avg / 30) * 100));

            return (
              <div
                key={m}
                onClick={() => setSelectedMonth(m)}
                className="flex flex-col items-center gap-1 group cursor-pointer"
              >
                <span className="text-[10px] font-mono opacity-80">{data.avg}℃</span>
                <div className="w-full bg-stone-800 h-24 rounded-t-lg overflow-hidden flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isSelected
                        ? 'bg-amber-400 shadow-lg ring-2 ring-white/50'
                        : 'bg-emerald-500/80 group-hover:bg-emerald-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    isSelected ? 'text-amber-400' : 'text-stone-400'
                  }`}
                >
                  {m}월
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
