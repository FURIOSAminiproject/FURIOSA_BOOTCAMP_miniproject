/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { CheckSquare, Square, Plus, Copy, Check, Sparkles, Thermometer, CloudRain, Wind, ShieldCheck, Activity, Download, ListFilter } from 'lucide-react';
import { FullTravelPlan } from '../types/travel';

interface SmartPackingChecklistModalProps {
  plan: FullTravelPlan;
  isOpen: boolean;
  onClose: () => void;
}

export interface SmartChecklistItem {
  id: string;
  category: 'CLOTHING' | 'WEATHER' | 'ACTIVITY' | 'HEALTH' | 'TECH';
  categoryLabel: string;
  name: string;
  reason: string;
  importance: 'CRITICAL' | 'RECOMMENDED' | 'OPTIONAL';
  checked: boolean;
}

export const SmartPackingChecklistModal: React.FC<SmartPackingChecklistModalProps> = ({
  plan,
  isOpen,
  onClose
}) => {
  // Activity Intensity & Weather Deduction
  const analysis = useMemo(() => {
    const places = plan.days.flatMap(d => d.places);
    const dayCount = plan.days.length;

    // Check activities
    const hasTrekking = places.some(p => p.name.includes('산책') || p.name.includes('숲') || p.name.includes('오름') || p.name.includes('봉'));
    const hasWater = places.some(p => p.name.includes('해변') || p.name.includes('바다') || p.name.includes('항') || p.name.includes('포구') || p.name.includes('몽돌'));
    const hasGourmet = places.some(p => p.category === 'RESTAURANT' || p.category === 'CAFE');

    // Weather from weather report or default
    const weatherRep = plan.weatherAgentReport;
    const avgMinTemp = weatherRep?.fusedDailyList[0]?.finalPredictedTemp?.min || 11;
    const avgMaxTemp = weatherRep?.fusedDailyList[0]?.finalPredictedTemp?.max || 21;
    const diurnal = avgMaxTemp - avgMinTemp;
    const rainChance = weatherRep?.fusedDailyList[0]?.rainProbability || 25;
    const windSpeed = weatherRep?.fusedDailyList[0]?.windSpeed || 4.2;

    const items: SmartChecklistItem[] = [];

    // 1. Clothing (Based on Weather & Temperature)
    items.push({
      id: 'c1',
      category: 'CLOTHING',
      categoryLabel: '기온 맞춤 의류',
      name: `활동성 좋은 긴팔/반팔 셔츠 (${dayCount}일치)`,
      reason: `예상 기온 ${avgMinTemp}~${avgMaxTemp}℃의 온화한 낮 활동에 최적화`,
      importance: 'CRITICAL',
      checked: false
    });

    if (diurnal >= 8) {
      items.push({
        id: 'c2',
        category: 'CLOTHING',
        categoryLabel: '기온 맞춤 의류',
        name: '레이어드용 카디건 또는 경량 자켓 1벌',
        reason: `아침·저녁 일교차 ${diurnal}℃ 급변 대비 보온용`,
        importance: 'CRITICAL',
        checked: false
      });
    }

    if (windSpeed >= 3.5 || hasWater) {
      items.push({
        id: 'c3',
        category: 'CLOTHING',
        categoryLabel: '기온 맞춤 의류',
        name: '방풍 윈드브레이커(바람막이) 또는 아우터',
        reason: `해안가 및 야외 관람 시 찬 바닷바람(풍속 ${windSpeed}m/s) 차단`,
        importance: 'CRITICAL',
        checked: false
      });
    }

    // 2. Weather & Outdoors
    if (rainChance >= 20) {
      items.push({
        id: 'w1',
        category: 'WEATHER',
        categoryLabel: '기상/환경 대비',
        name: '가벼운 초경량 접이식 3단 우산',
        reason: `국지성 소나기 및 강수확률(${rainChance}%) 대비`,
        importance: 'RECOMMENDED',
        checked: false
      });
    }

    items.push({
      id: 'w2',
      category: 'WEATHER',
      categoryLabel: '기상/환경 대비',
      name: 'SPF50+ 자외선 차단제 및 챙 있는 모자',
      reason: '야외 활동 시 자외선 지수(UV) 차단 및 피부 보호',
      importance: 'CRITICAL',
      checked: false
    });

    // 3. Activity Specific
    if (hasTrekking) {
      items.push({
        id: 'a1',
        category: 'ACTIVITY',
        categoryLabel: '액티비티 강도 맞춤',
        name: '쿠션감 좋은 트레킹화/접지력 우수한 운동화',
        reason: '비자림/사려니숲길 및 오름 보행 시 발목 피로와 미끄럼 방지',
        importance: 'CRITICAL',
        checked: false
      });
      items.push({
        id: 'a2',
        category: 'ACTIVITY',
        categoryLabel: '액티비티 강도 맞춤',
        name: '휴대용 텀블러 또는 생수 파우치',
        reason: '숲길 및 해안 산책로 도보 시 수분 보충',
        importance: 'RECOMMENDED',
        checked: false
      });
    }

    if (hasWater) {
      items.push({
        id: 'a3',
        category: 'ACTIVITY',
        categoryLabel: '액티비티 강도 맞춤',
        name: '해변 산책용 방수 슈즈 또는 여벌 양말',
        reason: '몽돌해변 자갈 및 모래사장 산책 후 쾌적함 유지',
        importance: 'RECOMMENDED',
        checked: false
      });
    }

    // 4. Health & Medicine
    items.push({
      id: 'h1',
      category: 'HEALTH',
      categoryLabel: '건강/상비약',
      name: '여행용 비상 상비약 (소화제, 두통약, 일회용 밴드)',
      reason: '향토 음식 과식 및 급격한 기온차 대비 안전관리 에이전트 필수 권고',
      importance: 'CRITICAL',
      checked: false
    });

    if (plan.request.transportType === 'RENTAL_CAR' || hasWater) {
      items.push({
        id: 'h2',
        category: 'HEALTH',
        categoryLabel: '건강/상비약',
        name: '멀미약 (유람선/중산간 와인딩 도로 대비)',
        reason: '중산간 굴곡 도로 및 해상 관람선 탑승 시 어지럼증 예방',
        importance: 'OPTIONAL',
        checked: false
      });
    }

    // 5. Tech & Docs
    items.push({
      id: 't1',
      category: 'TECH',
      categoryLabel: '테크 & 필수 서류',
      name: '10,000mAh 이상 대용량 고속 보조배터리',
      reason: '네이버·구글 지도 PUSH 길찾기 및 고화질 사진 촬영 소모 대비',
      importance: 'CRITICAL',
      checked: false
    });

    items.push({
      id: 't2',
      category: 'TECH',
      categoryLabel: '테크 & 필수 서류',
      name: '신분증 (주민등록증/운전면허증) 및 모바일 신분증',
      reason: '항공기 탑승, 렌터카 인수 및 호텔 체크인 필수 서류',
      importance: 'CRITICAL',
      checked: false
    });

    return {
      items,
      hasTrekking,
      hasWater,
      avgMinTemp,
      avgMaxTemp,
      diurnal,
      rainChance,
      windSpeed
    };
  }, [plan]);

  const [items, setItems] = useState<SmartChecklistItem[]>(analysis.items);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [newItemName, setNewItemName] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: SmartChecklistItem = {
      id: `custom-${Date.now()}`,
      category: 'ACTIVITY',
      categoryLabel: '직접 추가한 항목',
      name: newItemName.trim(),
      reason: '여행자 개인 맞춤 등록 물품',
      importance: 'RECOMMENDED',
      checked: false
    };

    setItems([...items, newItem]);
    setNewItemName('');
  };

  const checkedCount = items.filter(i => i.checked).length;
  const progressPercent = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const filteredItems = selectedCategory === 'ALL'
    ? items
    : items.filter(i => i.category === selectedCategory);

  const handleCopyChecklist = () => {
    const text = `[길벗 AI 스마트 패킹 체크리스트 · ${plan.request.destination} ${plan.days.length}일간]\n\n` +
      `📅 일정: ${plan.request.startDate} ~ ${plan.request.endDate}\n` +
      `🌡️ 예상 기온: ${analysis.avgMinTemp}~${analysis.avgMaxTemp}℃ (일교차 ${analysis.diurnal}℃)\n` +
      `🏃 활동 특성: ${analysis.hasTrekking ? '도보/트레킹 포함, ' : ''}${analysis.hasWater ? '해변/수변 관람 포함' : '도심 힐링'}\n\n` +
      `[준비물 목록]\n` +
      items.map(i => `${i.checked ? '☑️' : '⬜'} [${i.importance === 'CRITICAL' ? '필수' : '추천'}] ${i.name} - ${i.reason}`).join('\n') +
      `\n\n- 길벗 AI 날씨 & 안전관리 에이전트 자동 산출 -`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#064e43] to-[#0a6657] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-stone-950 font-extrabold text-[10px]">
                  AI 맞춤 자동 생성
                </span>
                <h3 className="font-bold text-base sm:text-lg">
                  스마트 패킹 체크리스트 (Smart Packing List)
                </h3>
              </div>
              <p className="text-xs text-emerald-100 font-light mt-0.5">
                {plan.request.destination} · {plan.request.startDate} ~ {plan.request.endDate} (날씨·기온·활동강도 정밀 연동)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* AI Factor Analysis Summary Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-stone-700">
              <Thermometer className="w-4 h-4 text-rose-500" />
              <span>기온: <b>{analysis.avgMinTemp}~{analysis.avgMaxTemp}℃</b> (일교차 {analysis.diurnal}℃)</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-700">
              <Wind className="w-4 h-4 text-sky-500" />
              <span>풍속: <b>{analysis.windSpeed}m/s</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-700">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>활동강도: <b>{analysis.hasTrekking ? '보행 트레킹 활발' : '여유로운 힐링'}</b></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyChecklist}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사 완료!' : '체크리스트 복사'}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-white border-b border-stone-100 flex items-center gap-4">
          <div className="flex-1 bg-stone-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#064e43] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-stone-700 font-mono shrink-0">
            {checkedCount} / {items.length}개 준비 ({progressPercent}%)
          </span>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-2.5 bg-stone-50/60 border-b border-stone-200 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'ALL', label: '전체' },
            { id: 'CLOTHING', label: '의류/방한' },
            { id: 'WEATHER', label: '기상/환경' },
            { id: 'ACTIVITY', label: '활동 장비' },
            { id: 'HEALTH', label: '상비약' },
            { id: 'TECH', label: '테크/서류' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-full font-medium transition-all shrink-0 ${
                selectedCategory === c.id
                  ? 'bg-[#064e43] text-white font-bold shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Items Checklist Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-2.5">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                item.checked
                  ? 'bg-stone-50 border-stone-200 opacity-60'
                  : 'bg-white border-[#e8e4dc] hover:border-emerald-500/50 shadow-2xs'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.checked ? (
                  <CheckSquare className="w-5 h-5 text-emerald-700" />
                ) : (
                  <Square className="w-5 h-5 text-stone-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    item.importance === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-700'
                      : item.importance === 'RECOMMENDED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-stone-100 text-stone-600'
                  }`}>
                    {item.importance === 'CRITICAL' ? '필수 지참' : item.importance === 'RECOMMENDED' ? '추천' : '선택'}
                  </span>
                  <span className={`text-xs font-bold text-stone-900 ${item.checked ? 'line-through text-stone-400' : ''}`}>
                    {item.name}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                  {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Custom Item Footer */}
        <form onSubmit={handleAddItem} className="p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-2">
          <input
            type="text"
            placeholder="개인적으로 챙길 물품 추가 (예: 카메라 삼각대, 텀블러...)"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#064e43] bg-white"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#064e43] hover:bg-[#085f52] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>추가</span>
          </button>
        </form>
      </div>
    </div>
  );
};
