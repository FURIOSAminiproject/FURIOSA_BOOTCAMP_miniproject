/** 모델·도구·조회 예산은 사용자/모델 인자로 바꿀 수 없다. */
export const REVISION_POLICY = Object.freeze({
  maxGenerations: 5,
  maxToolCalls: 6,
  maxCallsPerTurn: 2,
  maxSearchStages: 2,
  maxCandidates: 80,
  maxNewCandidatesPerStage: 12,
  maxToolResultBytes: 98304,
  maxResponseBytes: 65536,
  deadlineMs: 45000,
  providerTimeoutMs: 15000,
  maxOutputTokens: 4096,
});

export type RevisionExecutionCode =
  | 'TOOL_PROTOCOL_INVALID'
  | 'TOOL_NOT_ALLOWED'
  | 'TOOL_ARGUMENTS_INVALID'
  | 'TOOL_BUDGET_EXCEEDED'
  | 'TOOL_RESULT_TOO_LARGE'
  | 'DEADLINE_EXCEEDED'
  | 'PROVIDER_BUDGET_EXCEEDED'
  | 'CURRENT_ITINERARY_NOT_READ';

/** 원본 도구 인자·예외를 응답이나 로그로 전달하지 않는다. */
export class RevisionExecutionError extends Error {
  constructor(readonly code: RevisionExecutionCode) {
    super(code);
  }
}

export function revisionExecutionReply(error: RevisionExecutionError): string {
  const reasons: Record<RevisionExecutionCode, string> = {
    TOOL_PROTOCOL_INVALID:
      'AI가 올바른 도구 호출 형식으로 응답하지 않아 요청을 실행하지 못했습니다.',
    TOOL_NOT_ALLOWED: 'AI가 허용되지 않은 작업을 요청해 서버가 차단했습니다.',
    TOOL_ARGUMENTS_INVALID:
      'AI가 도구에 전달한 검색 조건이나 일정 조회 조건이 허용된 형식과 맞지 않아 차단했습니다.',
    TOOL_BUDGET_EXCEEDED:
      '이번 요청의 AI·도구 호출 횟수 한도에 도달했습니다. 조건을 좁혀 다시 요청해 주세요.',
    TOOL_RESULT_TOO_LARGE:
      '조회 결과가 한 번에 처리할 수 있는 크기를 넘어 중단했습니다. 더 짧은 일정이나 구체적인 조건으로 요청해 주세요.',
    DEADLINE_EXCEEDED:
      '일정 확인과 장소 탐색의 전체 처리 시간이 초과되어 중단했습니다. 잠시 후 다시 요청해 주세요.',
    PROVIDER_BUDGET_EXCEEDED:
      '서버 전체의 AI 호출 한도에 도달했습니다. 잠시 후 다시 요청해 주세요.',
    CURRENT_ITINERARY_NOT_READ:
      'AI가 현재 일정을 확인하지 않아 수정안을 반영하지 않았습니다.',
  };
  return `현재 화면의 일정은 변경되지 않았습니다.\n${reasons[error.code]}`;
}
