import React, { useState } from 'react';
import { LiteraryReview, TravelPlace } from '../types/travel';
import { Feather, RefreshCw, Utensils, Coffee, Sparkles, BookOpen, ExternalLink, Quote, Share2, Check } from 'lucide-react';
import { generatePoeticReview } from '../services/poetryService';

interface PoeticReviewSectionProps {
  reviews: LiteraryReview[];
  culinaryPlaces?: TravelPlace[];
  onReviewsUpdated?: (updated: LiteraryReview[]) => void;
}

export const PoeticReviewSection: React.FC<PoeticReviewSectionProps> = ({
  reviews: initialReviews,
  culinaryPlaces = [],
  onReviewsUpdated
}) => {
  const [reviews, setReviews] = useState<LiteraryReview[]>(initialReviews);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [copiedReviewId, setCopiedReviewId] = useState<string | null>(null);

  const handleRegenerate = async (review: LiteraryReview) => {
    setRegeneratingId(review.placeId);
    try {
      const targetPlace = culinaryPlaces.find(p => p.id === review.placeId) || {
        id: review.placeId,
        name: review.placeName,
        category: review.category,
        categoryLabel: review.category === 'CAFE' ? '감성 카페' : '향토 식당',
        description: review.foodOrDrink,
        timeSlot: '12:00 - 13:00',
        address: '대한민국 명소',
        lat: 36.5,
        lng: 127.5,
        estimatedCost: 15000,
        recommendedBy: '미식가'
      };

      const newReview = await generatePoeticReview(targetPlace);
      const updated = reviews.map(r => r.placeId === review.placeId ? newReview : r);
      setReviews(updated);
      if (onReviewsUpdated) {
        onReviewsUpdated(updated);
      }
    } catch (err) {
      console.error('Failed to regenerate review:', err);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleCopyReview = (review: LiteraryReview) => {
    const text = `[길벗 AI 여행사 · 풍류시객 기행문]\n\n📍 ${review.placeName} (${review.foodOrDrink})\n\n✍️ [감성 수필]\n${review.essay}\n\n📜 [시 한 수: ${review.poemTitle}]\n${review.poemVerses.join('\n')}\n\n- 풍류 큐레이터 '풍류시객' 헌정 -`;
    navigator.clipboard.writeText(text);
    setCopiedReviewId(review.placeId);
    setTimeout(() => setCopiedReviewId(null), 2500);
  };

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-b from-stone-50 to-amber-50/30 rounded-2xl p-5 sm:p-7 border border-amber-200/70 shadow-sm space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center shadow-sm">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/60">
                에이전트 풍류시객 특별 헌정
              </span>
              <span className="text-xs text-stone-500 font-serif">
                문학적 기행문 & 감성 서정시
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 font-serif mt-0.5">
              미식 & 카페 방문 후기: 수필과 시(詩) 한 수
            </h3>
          </div>
        </div>

        <p className="text-xs text-stone-600 max-w-md sm:text-right">
          일정에 포함된 식당과 카페의 정취를 오감으로 상상하여, 3~4문장의 단아한 수필과 서정시로 기록한 여행 기행문입니다.
        </p>
      </div>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reviews.map(review => {
          const isCafe = review.category === 'CAFE';
          const isRegen = regeneratingId === review.placeId;

          return (
            <div
              key={review.placeId}
              className="bg-white rounded-xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Decorative accent top bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isCafe ? 'bg-amber-500' : 'bg-stone-700'
                }`}
              />

              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
                      {isCafe ? (
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <Utensils className="w-3.5 h-3.5 text-stone-700" />
                      )}
                      <span className="font-semibold text-stone-700">{review.foodOrDrink}</span>
                    </div>
                    <h4 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
                      {review.placeName}
                    </h4>
                  </div>

                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent(review.placeName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                    title="네이버 지도로 장소 확인"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Short Essay Box */}
                <div className="bg-stone-50/80 rounded-lg p-3.5 border border-stone-100 mb-4 text-xs sm:text-sm text-stone-700 leading-relaxed font-serif relative">
                  <Quote className="w-4 h-4 text-stone-300 absolute -top-1 -left-1" />
                  <p className="indent-2 pl-2 italic">
                    "{review.essay}"
                  </p>
                </div>

                {/* Poem Box */}
                <div className="bg-gradient-to-br from-amber-50/50 to-stone-50 rounded-lg p-4 border border-amber-100/80 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-900 font-serif flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                      {review.poemTitle}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      詩 한 수
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs sm:text-sm font-serif text-stone-800 leading-relaxed py-1 border-l-2 border-amber-300 pl-3">
                    {review.poemVerses.map((line, idx) => (
                      <p key={idx} className="text-stone-700">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-stone-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  작성: {review.authorAgent}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyReview(review)}
                    className="px-2.5 py-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1 text-xs"
                    title="수필과 시 복사하기"
                  >
                    {copiedReviewId === review.placeId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3 h-3" />
                        <span>시 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleRegenerate(review)}
                    disabled={isRegen}
                    className="px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors flex items-center gap-1 text-xs font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRegen ? 'animate-spin' : ''}`} />
                    <span>{isRegen ? '새로 짓는 중...' : '후기 다시 쓰기'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
