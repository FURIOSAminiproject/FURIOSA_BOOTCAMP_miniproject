import React, { useState } from 'react';
import { FullTravelPlan } from '../types/travel';
import { Share2, Copy, Check, MessageSquare, Send, X, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  plan: FullTravelPlan;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ plan, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [kakaoSent, setKakaoSent] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://gilbeot-travel.ai';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendKakaoSimulation = () => {
    setKakaoSent(true);
    setTimeout(() => setKakaoSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">일정 공유 및 알림 전송</h3>
              <p className="text-xs text-stone-500">동행자와 일정을 공유하거나 알림톡을 발송합니다</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Plan Preview Card */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs">
            <span className="font-bold text-stone-900 block text-sm">
              {plan.title}
            </span>
            <p className="text-stone-600 line-clamp-2">
              {plan.summary}
            </p>
            <div className="text-stone-500 pt-1 flex justify-between">
              <span>{plan.request.startDate} ~ {plan.request.endDate}</span>
              <span className="font-bold text-blue-700">
                {(plan.costs.totalCost / 10000).toLocaleString()}만원
              </span>
            </div>
          </div>

          {/* Copy Link */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              웹 링크 복사
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 text-xs border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 text-stone-600"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨' : '복사'}</span>
              </button>
            </div>
          </div>

          {/* Kakao Alimtalk Notification Simulation */}
          <div className="p-4 rounded-xl bg-[#FEE500]/15 border border-[#FEE500]/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#3C1E1E] flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#3C1E1E]" />
                카카오 알림톡 전송
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                {plan.request.clientContact}
              </span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              [길벗 AI 여행사] {plan.request.clientName}님, 요청하신 {plan.request.destination} 맞춤 일정이 {plan.request.status === 'APPROVED' ? '관리자 승인 완료되어' : 'AI 설계되어'} 확인 가능합니다.
            </p>

            <button
              onClick={handleSendKakaoSimulation}
              disabled={kakaoSent}
              className="w-full py-2 rounded-lg bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{kakaoSent ? '알림톡 발송 완료! (수신 대기)' : '고객 휴대폰으로 알림톡 발송'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
