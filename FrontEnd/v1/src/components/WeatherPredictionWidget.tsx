import React, { useState, useMemo } from 'react';
import { inferLongTermWeatherAndPacking, WeatherPredictionReport, PackingItem } from '../services/weatherPredictionService';
import { CloudSun, Sun, CloudRain, CloudDrizzle, Cloud, Wind, Thermometer, ShieldCheck, CheckSquare, Square, Plus, Sparkles, TrendingUp, AlertCircle, Copy, Check, Calendar, MapPin, ArrowRight } from 'lucide-react';

interface WeatherPredictionWidgetProps {
  initialDestination?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  onApplyToTripRequest?: (dest: string, start: string, end: string) => void;
  onOpenWeatherStudio?: () => void;
}

export const WeatherPredictionWidget: React.FC<WeatherPredictionWidgetProps> = ({
  initialDestination = '제주',
  initialStartDate = '2026-11-20',
  initialEndDate = '2026-11-23',
  onApplyToTripRequest,
  onOpenWeatherStudio
}) => {
  const [destination, setDestination] = useState(initialDestination);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isInferring, setIsInferring] = useState(false);

  // Run initial prediction report
  const [report, setReport] = useState<WeatherPredictionReport>(() =>
    inferLongTermWeatherAndPacking(initialDestination, initialStartDate, initialEndDate)
  );

  // User interactive checklist state
  const [items, setItems] = useState<PackingItem[]>(report.packingChecklist);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [newItemName, setNewItemName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleRunInference = () => {
    setIsInferring(true);
    setTimeout(() => {
      const newReport = inferLongTermWeatherAndPacking(destination, startDate, endDate);
      setReport(newReport);
      setItems(newReport.packingChecklist);
      setIsInferring(false);
    }, 450);
  };

  const toggleCheck = (id: string) => {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem: PackingItem = {
      id: `custom-${Date.now()}`,
      category: 'OUTDOOR',
      categoryLabel: '사용자 추가',
      name: newItemName.trim(),
      reason: '여행자 직접 등록 물품',
      importance: 'RECOMMENDED',
      checked: false
    };
    setItems([newItem, ...items]);
    setNewItemName('');
  };

  const checkedCount = items.filter(i => i.checked).length;
  const progressPercent = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const filteredItems = activeCategory === 'ALL'
    ? items
    : items.filter(i => i.category === activeCategory);

  const handleCopyChecklist = () => {
    const text = `[길벗 AI 여행사 · ${report.destination} 장기 기상예측 & 준비물 체크리스트]\n\n` +
      `📅 여행 기간: ${report.startDate} ~ ${report.endDate}\n` +
      `🌡️ 예측 기온: ${report.climateHighlights.tempSummary}\n` +
      `📊 추론 신뢰도: ${report.inferenceConfidence}% (${report.historicalDataSpan})\n\n` +
      `[준비물 목록]\n` +
      items.map(i => `${i.checked ? '☑️' : '⬜'} [${i.importance === 'CRITICAL' ? '필수' : '추천'}] ${i.name} (${i.reason})`).join('\n') +
      `\n\n- 10개년 기후 머신러닝/딥러닝 앙상블 모델 추론 -`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'SUNNY': return <Sun className="w-6 h-6 text-amber-500" />;
      case 'PARTLY_CLOUDY': return <CloudSun className="w-6 h-6 text-amber-600" />;
      case 'CLOUDY': return <Cloud className="w-6 h-6 text-stone-400" />;
      case 'RAIN': return <CloudRain className="w-6 h-6 text-blue-500" />;
      case 'SHOWER': return <CloudDrizzle className="w-6 h-6 text-cyan-500" />;
      case 'WINDY': return <Wind className="w-6 h-6 text-teal-600" />;
      default: return <Sun className="w-6 h-6 text-amber-500" />;
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-[#e5e0d8] shadow-sm overflow-hidden space-y-6">
      {/* Top Banner with Model Architecture Tag */}
      <div className="bg-[#064e43] text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-amber-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>10개년 기후 데이터 기반 ML/DL 장기 예보 & 스마트 준비물 엔진</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-200 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {report.modelName} (신뢰도 {report.inferenceConfidence}%)
              </span>
              {onOpenWeatherStudio && (
                <button
                  onClick={onOpenWeatherStudio}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-stone-900" />
                  <span>기상예보 기술 분석 스튜디오</span>
                  <ArrowRight className="w-3 h-3 text-stone-900" />
                </button>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-serif">
              한 달 전에도 미리 아는 기온·날씨 추론 & 맞춤 준비물
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 mt-1 max-w-3xl leading-relaxed">
              기상청 지난 10년간(2015~2025) 종관기상관측 빅데이터를 학습한 시계열 딥러닝 앙상블 모델이
              여행 예정일의 기온 분포와 일교차, 강수확률을 정밀 추론하여 꼭 챙겨야 할 준비물을 사전에 추천합니다.
            </p>
          </div>

          {/* Interactive Input Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-3 bg-white/10 p-3.5 rounded-2xl border border-white/15 text-xs">
            <div className="flex items-center gap-1.5 bg-white text-stone-800 rounded-xl px-3 py-2">
              <MapPin className="w-4 h-4 text-[#064e43]" />
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="bg-transparent font-bold focus:outline-hidden"
              >
                <option value="제주">제주특별자치도</option>
                <option value="강릉">강원도 강릉·속초</option>
                <option value="부산">부산광역시</option>
                <option value="경주">경상북도 경주</option>
                <option value="전주">전북특별자치도 전주</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white text-stone-800 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-[#064e43]" />
              <span className="text-stone-400">출발</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent font-semibold focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white text-stone-800 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-[#064e43]" />
              <span className="text-stone-400">도착</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent font-semibold focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleRunInference}
              disabled={isInferring}
              className="px-5 py-2.5 rounded-xl bg-[#e26a2c] hover:bg-[#d05c20] text-white font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 ml-auto"
            >
              <TrendingUp className={`w-3.5 h-3.5 ${isInferring ? 'animate-spin' : ''}`} />
              <span>{isInferring ? '딥러닝 추론 중...' : '장기 예보 & 준비물 분석'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Narrative & Anomaly Highlights */}
      <div className="px-6 sm:px-8 space-y-4">
        <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e8e4dc] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm text-stone-700">
          <div className="space-y-1">
            <span className="font-bold text-[#064e43] text-xs uppercase tracking-wider block">
              📊 10개년 기후 추론 진단 요약
            </span>
            <p className="leading-relaxed">
              {report.summaryNarrative}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
              {report.climateHighlights.tempSummary}
            </span>
            {report.climateHighlights.diurnalWarning && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold">
                ⚠️ 큰 일교차 주의 (겉옷 필수)
              </span>
            )}
            {report.climateHighlights.rainWarning && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 text-xs font-bold">
                ☂️ 우산 지참 권장
              </span>
            )}
          </div>
        </div>

        {/* Daily Forecast Grid */}
        <div>
          <h3 className="font-bold text-stone-900 text-base mb-3 flex items-center justify-between">
            <span>{report.destination} 일자별 기온 및 기후 추론 ({report.dailyForecast.length}일간)</span>
            <span className="text-xs text-stone-400 font-normal">기준: 기상청 10개년 관측치 정규분포</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {report.dailyForecast.map((day) => (
              <div
                key={day.date}
                className="p-4 rounded-2xl border border-[#e5e0d8] bg-white hover:border-[#064e43]/40 transition-all space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-900">
                      {day.date.slice(5)} ({day.dayOfWeek})
                    </span>
                    <span className="text-[11px] text-stone-400 block">{day.dayNumber}일차</span>
                  </div>
                  <div>
                    {getWeatherIcon(day.condition)}
                  </div>
                </div>

                <div className="py-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-stone-900">
                      {day.maxTemp}°
                    </span>
                    <span className="text-sm font-semibold text-stone-400">
                      / {day.minTemp}°C
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#064e43]">
                    {day.conditionLabel}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>강수확률:</span>
                    <span className="font-bold text-blue-600">{day.precipProbability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>일교차:</span>
                    <span className="font-semibold text-stone-700">{day.diurnalRange}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>10년 평균 대비:</span>
                    <span className="font-medium text-emerald-700">
                      {day.anomalyVs10Yr > 0 ? `+${day.anomalyVs10Yr}°C` : `${day.anomalyVs10Yr}°C`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 10-Year Historical Climate Trend Graph */}
        <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e8e4dc] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#064e43]" />
              {report.destination} 지역 지난 10개년(2016~2026) 동기 평균 기온 변화 추세
            </span>
            <span className="text-[11px] text-stone-500">기후 온난화 계수 (+0.8℃) 반영</span>
          </div>

          <div className="grid grid-cols-6 gap-2 text-center text-xs">
            {report.trendChartData.map((t) => (
              <div key={t.year} className="bg-white p-2.5 rounded-xl border border-stone-200/80 space-y-1">
                <span className="text-[11px] text-stone-400 block font-mono">{t.year}</span>
                <span className="font-black text-stone-800 text-sm">{t.avgTemp}°C</span>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#064e43] h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(10, (t.avgTemp / 30) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Packing Checklist Section */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#064e43]" />
                <h3 className="font-bold text-stone-900 text-base sm:text-lg">
                  기상 추론 기반 맞춤형 여행 준비물 체크리스트
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                예측된 기온과 강수확률, 일교차, 바람에 꼭 맞춘 사전 준비물입니다. 하나씩 챙겨보세요.
              </p>
            </div>

            {/* Checklist Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyChecklist}
                className="px-3.5 py-1.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사 완료' : '체크리스트 복사'}</span>
              </button>

              {onApplyToTripRequest && (
                <button
                  onClick={() => onApplyToTripRequest(report.destination, report.startDate, report.endDate)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#064e43] hover:bg-[#043d34] text-white text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span>이 일정으로 여행 의뢰하기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-[#faf7f2] p-3.5 rounded-xl border border-[#e8e4dc] space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-stone-700">
              <span>준비 진행률 ({checkedCount} / {items.length} 완료)</span>
              <span className="text-[#064e43]">{progressPercent}%</span>
            </div>
            <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#064e43] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: '전체' },
              { id: 'CLOTHING', label: '의류/복장' },
              { id: 'WEATHER_GEAR', label: '날씨 대비' },
              { id: 'OUTDOOR', label: '야외 활동' },
              { id: 'HEALTH', label: '상비약' },
              { id: 'TECH_DOCS', label: '테크 & 필수' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#064e43] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Packing Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  item.checked
                    ? 'bg-emerald-50/60 border-emerald-300 text-stone-500'
                    : 'bg-white border-[#e5e0d8] hover:border-[#064e43]/50 text-stone-800'
                }`}
              >
                <button
                  type="button"
                  className="mt-0.5 text-stone-400 hover:text-stone-700"
                >
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Square className="w-5 h-5 text-stone-300" />
                  )}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-bold ${item.checked ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                      {item.name}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.importance === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                      item.importance === 'RECOMMENDED' ? 'bg-amber-100 text-amber-800' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {item.importance === 'CRITICAL' ? '필수' : item.importance === 'RECOMMENDED' ? '권장' : '선택'}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-snug">
                    {item.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Packing Item */}
          <form onSubmit={handleAddItem} className="pt-2 flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="나만의 준비물 직접 추가 (예: 아이 태블릿 거치대, 모자...)"
              className="flex-1 text-xs border border-[#e5e0d8] rounded-xl px-3.5 py-2.5 bg-[#faf7f2] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#064e43]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </form>
        </div>
      </div>

      <div className="p-4 bg-[#faf7f2] border-t border-[#e8e4dc] text-center text-xs text-stone-500">
        ※ 본 기후 예측 정보는 기상청(KMA) 10개년 종관기상관측 시계열 데이터를 바탕으로 AI 앙상블 모델이 추론한 장기 통계 예측값입니다.
      </div>
    </section>
  );
};
