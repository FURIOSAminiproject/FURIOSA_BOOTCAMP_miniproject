import React, { useState } from 'react';
import { FullTravelPlan, TravelStatus } from '../types/travel';
import { ShieldCheck, CheckCircle2, RotateCcw, XCircle, AlertTriangle, UserCheck, MessageSquare, DollarSign, Calendar, MapPin, X } from 'lucide-react';

interface AdminApprovalModalProps {
  plan: FullTravelPlan;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (adminName: string, note?: string) => void;
  onRevisionRequest: (feedback: string) => void;
  onReject: (reason: string) => void;
}

export const AdminApprovalModal: React.FC<AdminApprovalModalProps> = ({
  plan,
  isOpen,
  onClose,
  onApprove,
  onRevisionRequest,
  onReject
}) => {
  const [adminName, setAdminName] = useState('여행총괄 박진우 실장');
  const [adminNote, setAdminNote] = useState('');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [mode, setMode] = useState<'REVIEW' | 'REVISION_INPUT' | 'REJECT_INPUT'>('REVIEW');

  if (!isOpen) return null;

  const { request, costs, agentAuditReport } = plan;

  const handleApproveSubmit = () => {
    onApprove(adminName, adminNote || 'AI 다중 에이전트 설계안 승인 적격 판정. 고객 확약서 발급.');
    onClose();
  };

  const handleRevisionSubmit = () => {
    if (!revisionFeedback.trim()) return;
    onRevisionRequest(revisionFeedback);
    onClose();
  };

  const handleRejectSubmit = () => {
    if (!adminNote.trim()) return;
    onReject(adminNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                여행사 총괄 관리자 결심(인가) 센터
              </span>
              <h3 className="text-lg font-bold text-stone-900 mt-0.5">
                AI 여행 설계안 최종 인가 심사
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 flex-1">
          {/* Summary Box */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">{request.clientName} 고객님</span>
                <span className="text-xs text-stone-500">({request.clientContact})</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                request.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                request.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {request.status === 'APPROVED' ? '승인 완료' :
                 request.status === 'PENDING_APPROVAL' ? '인가(승인) 대기 중' : '수정/재조율 중'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">목적지</span>
                <span className="font-semibold text-stone-900">{request.destination}</span>
              </div>
              <div>
                <span className="text-stone-500 block">여행 일정</span>
                <span className="font-semibold text-stone-900">{request.startDate} ~ {request.endDate}</span>
              </div>
              <div>
                <span className="text-stone-500 block">참가 인원</span>
                <span className="font-semibold text-stone-900">성인 {request.adultCount}명 {request.childCount > 0 ? `/ 아동 ${request.childCount}명` : ''}</span>
              </div>
              <div>
                <span className="text-stone-500 block">고객 희망 예산</span>
                <span className="font-semibold text-stone-900">{(request.budget / 10000).toLocaleString()}만원</span>
              </div>
              <div>
                <span className="text-stone-500 block">AI 산출 총경비</span>
                <span className="font-bold text-blue-700">{(costs.totalCost / 10000).toLocaleString()}만원</span>
              </div>
              <div>
                <span className="text-stone-500 block">예산 부합도</span>
                <span className="font-semibold text-emerald-600">
                  {request.budget >= costs.totalCost ? `+${((request.budget - costs.totalCost) / 10000).toLocaleString()}만원 절감` : '초과 없음'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Auditor Evaluation */}
          <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-rose-900">
                  에이전트 [감수관] 종합 품질 진단서
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="text-emerald-700">안전성 {agentAuditReport.safetyScore}점</span>
                <span className="text-blue-700">예산율 {agentAuditReport.budgetMatchScore}점</span>
                <span className="text-purple-700">동선효율 {agentAuditReport.routeEfficiencyScore}점</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              "{agentAuditReport.finalOpinion}"
            </p>

            <div className="text-xs bg-white rounded-lg p-2.5 border border-rose-100 flex items-center justify-between">
              <span className="text-stone-500">AI 추천 조치:</span>
              <span className="font-bold text-rose-700">{agentAuditReport.adminActionRecommendation}</span>
            </div>
          </div>

          {/* Mode Switchers */}
          {mode === 'REVIEW' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  인가 승인 담당자 서명
                </label>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    placeholder="담당자 직함 및 성명"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  고객 통보용 관리자 코멘트 (선택)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  className="w-full text-xs sm:text-sm border border-stone-200 rounded-lg p-3 focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
                  placeholder="예: 고객님의 요청에 따라 오션뷰 룸 및 렌터카 사전 배정이 확정되었습니다. 편안한 여행 되십시오."
                />
              </div>
            </div>
          )}

          {mode === 'REVISION_INPUT' && (
            <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                <RotateCcw className="w-4 h-4" />
                AI 멀티에이전트 수정 지시 메모 작성
              </div>
              <p className="text-xs text-stone-600">
                관리자가 수정을 지시하면 7인의 AI 에이전트가 해당 요청사항을 분석하여 즉시 일정을 재조율합니다.
              </p>
              <textarea
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                rows={3}
                className="w-full text-xs sm:text-sm border border-amber-300 rounded-lg p-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="예: 둘째 날 점심은 해산물 대신 한우 떡갈비로 교체하고, 총 예산을 5만원 낮춰 재조율해주세요."
              />
            </div>
          )}

          {mode === 'REJECT_INPUT' && (
            <div className="space-y-3 p-4 bg-rose-50 rounded-xl border border-rose-200">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                접수 반려 사유 입력
              </div>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="w-full text-xs sm:text-sm border border-rose-300 rounded-lg p-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
                placeholder="반려 사유를 입력하세요 (예: 해당 일정 예약 만료 또는 지역 기상 악화 주의보)"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          {mode === 'REVIEW' ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('REVISION_INPUT')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  AI 수정 지시
                </button>
                <button
                  onClick={() => setMode('REJECT_INPUT')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  반려
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
                >
                  닫기
                </button>
                <button
                  onClick={handleApproveSubmit}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  최종 승인 및 고객 확정 발행
                </button>
              </div>
            </>
          ) : mode === 'REVISION_INPUT' ? (
            <>
              <button
                onClick={() => setMode('REVIEW')}
                className="px-4 py-2 text-xs font-medium text-stone-600"
              >
                뒤로가기
              </button>
              <button
                onClick={handleRevisionSubmit}
                disabled={!revisionFeedback.trim()}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                AI 에이전트 재조율 시작
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode('REVIEW')}
                className="px-4 py-2 text-xs font-medium text-stone-600"
              >
                뒤로가기
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!adminNote.trim()}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                반려 처리 확정
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
