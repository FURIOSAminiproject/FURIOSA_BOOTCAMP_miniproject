import type { RevisionValidationPosition } from './itinerary-revision';
import type { CandidateSearchSummary } from './revision-candidate-search';

const unchangedNotice = '현재 화면의 일정은 변경되지 않았습니다.';
const kindNames: Record<string, string> = {
  sightseeing: '관광',
  lunch: '점심',
  cafe: '카페',
  dinner: '저녁',
};

/** 재조회 결과는 모델의 설명과 별도로 확인된 범위·개수만 안내한다. */
export function revisionCandidateSearchNote(
  summary: CandidateSearchSummary,
): string {
  const name = { cafe: '카페', food: '음식점', sightseeing: '관광지' }[
    summary.kind
  ];
  if (summary.status === 'failed')
    return '추가 장소 탐색이 실패해 새로운 후보가 있는지 확인하지 못했습니다. 잠시 후 다시 요청해 주세요.';
  const scope = `목적지 반경 ${summary.radiusMeters / 1000}km 안`;
  const result = summary.newCandidateCount
    ? `${scope}에서 요청 조건에 맞는 새 ${name} 후보 ${summary.newCandidateCount}곳을 찾았습니다.`
    : `${scope}을 다시 조사했지만 요청 조건에 맞는 새 ${name} 후보를 확보하지 못했습니다.`;
  return summary.status === 'partial'
    ? `${result} 일부 장소 조회가 실패해 전체 범위의 후보 유무는 확정할 수 없습니다.`
    : result;
}

/** 서버가 확인한 실패 사유와 모델의 무변경 설명을 구분해 전달한다. */
export function revisionUnchangedReply(
  reason: string,
  modelReply: string,
  position: RevisionValidationPosition = {},
): string {
  const visit =
    position.dayIndex === undefined
      ? '수정안의 방문'
      : `${position.dayIndex + 1}일차${position.visitIndex === undefined ? ' 방문' : ` ${position.visitIndex + 1}번째 방문`}`;
  const explanations: Record<string, string> = {
    no_api_key:
      'AI 서비스 연결 설정이 완료되지 않아 수정 요청을 보낼 수 없습니다. 관리자에게 연결 설정 확인을 요청해 주세요.',
    unchanged: '제안된 내용이 현재 일정과 동일해 추가 변경 사항이 없습니다.',
    candidate_search_failed:
      '추가 장소 조회를 완료하지 못해 요청한 후보가 있는지 확인할 수 없습니다. 잠시 후 다시 요청해 주세요.',
    unknown_date:
      'AI가 여행 기간에 없는 날짜를 수정안에 포함해 반영하지 못했습니다. 여행 기간 안의 날짜로 다시 요청해 주세요.',
    duplicate_date:
      'AI가 같은 날짜를 수정안에 중복해서 반환해 반영하지 못했습니다. 다시 요청해 주세요.',
    too_many_proposed_days:
      'AI가 여행 일수보다 많은 날짜를 수정안에 포함해 반영하지 못했습니다.',
    invalid_proposed_days:
      'AI 응답에 날짜별 수정 목록이 올바른 형식으로 들어 있지 않아 수정안을 읽지 못했습니다.',
    invalid_day_structure:
      'AI 응답의 날짜별 방문 정보가 빠져 있어 수정안을 읽지 못했습니다.',
    invalid_day_visits:
      'AI 응답에 해당 날짜의 방문 목록이 올바르게 들어 있지 않아 수정안을 읽지 못했습니다.',
    too_many_visits:
      '수정안이 하루 최대 6곳의 방문 제한을 초과했습니다. 기존 방문 중 제외할 곳을 지정해 주세요.',
    before_arrival_date:
      '목적지에 도착하기 전 날짜에 방문이 배정되어 반영하지 못했습니다. 도착일 이후로 요청해 주세요.',
    unknown_place: `${visit}에 현재 제공된 후보에 없는 장소가 지정되어 반영하지 못했습니다. 등록된 후보 중 다른 장소를 선택해 주세요.`,
    duplicate_place:
      '수정안에 같은 장소가 중복 배정되어 반영하지 못했습니다. 기존 방문을 유지할지 이동할지 지정해 주세요.',
    invalid_visit_structure: `${visit}의 필수 정보가 빠져 있어 수정안을 읽지 못했습니다.`,
    invalid_place_reference: `${visit}의 장소를 확인할 수 없어 반영하지 못했습니다.`,
    invalid_visit_kind: `${visit}의 방문 목적을 확인할 수 없어 반영하지 못했습니다. 관광·점심·카페·저녁 중 원하는 목적을 알려주세요.`,
    invalid_visit_time: `${visit}의 방문 시각을 읽을 수 없어 반영하지 못했습니다. 원하는 시각을 24시간제로 알려주세요.`,
    invalid_visit_duration: `${visit}의 체류 시간이 30~180분 범위의 정수로 지정되지 않아 반영하지 못했습니다.`,
    before_day_start: `${visit}이 일정 운영 시작 시각인 오전 9시보다 일러 반영하지 못했습니다.`,
    before_arrival_time: `${visit}이 목적지 도착 시각과 최소 5분의 이동 여유를 확보하지 못해 반영하지 못했습니다.`,
    overlapping_time: `${visit}이 앞 방문과 겹치거나 방문 사이 최소 5분의 이동 여유가 없어 반영하지 못했습니다. 다른 시각이나 줄일 방문을 지정해 주세요.`,
    after_day_end: `${visit}의 종료가 오후 8시를 넘어 반영하지 못했습니다. 더 이른 시각이나 줄일 방문을 지정해 주세요.`,
  };
  let explanation = explanations[reason];
  if (reason === 'place_kind_mismatch') {
    const allowed = position.allowedKinds
      ?.map((kind) => kindNames[kind])
      .join('·');
    explanation = `${visit}에 지정한 ${kindNames[position.requestedKind ?? ''] || '방문 목적'}이 등록된 장소 분류와 맞지 않습니다.${allowed ? ` 이 장소에 허용되는 방문 목적은 ${allowed}입니다.` : ''} 해당 목적에 맞는 다른 후보가 필요합니다.`;
  } else if (reason === 'no_proposed_days') {
    explanation =
      modelReply ||
      'AI가 수정할 방문 목록이나 변경하지 못한 이유를 제시하지 않았습니다. 원하는 날짜와 변경 내용을 다시 알려주세요.';
  }
  return `${unchangedNotice}\n${explanation || '수정안을 반영하지 못했지만 구체적인 원인은 아직 확인되지 않았습니다. 요청을 다시 보내 주세요.'}`;
}

/** 공급자 예외 원문을 노출하지 않고 확인된 오류 종류와 다음 행동을 안내한다. */
export function revisionErrorReply(
  diagnostic: Record<string, unknown>,
  stage: string,
): string {
  let explanation: string;
  if (diagnostic.errorCategory === 'invalid_json') {
    explanation =
      'AI 응답의 형식이 잘못되어 수정할 일정을 읽지 못했습니다. 다시 요청해 주세요.';
  } else if (
    diagnostic.credentialRelated ||
    diagnostic.errorCategory === 'authentication_or_permission'
  ) {
    explanation =
      'AI 서비스의 인증 또는 접근 권한 문제로 요청이 거절됐습니다. 관리자에게 AI 연결 설정 확인을 요청해 주세요.';
  } else if (diagnostic.httpStatus === 429) {
    const zeroQuota =
      Array.isArray(diagnostic.quotaViolations) &&
      diagnostic.quotaViolations.some(
        (value) => value && typeof value === 'object' && value.limit === '0',
      );
    const delay =
      typeof diagnostic.retryAfterSeconds === 'number' &&
      diagnostic.retryAfterSeconds > 0
        ? ` 약 ${Math.ceil(diagnostic.retryAfterSeconds)}초 후 다시 시도해 주세요.`
        : ' 잠시 후 다시 시도해 주세요. 계속되면 관리자에게 사용 한도 확인을 요청해 주세요.';
    explanation = zeroQuota
      ? '현재 AI 모델의 사용 가능 할당량이 0으로 설정되어 요청이 거절됐습니다. 관리자가 모델의 사용 한도와 이용 설정을 확인해야 합니다.'
      : `AI 서비스의 호출 한도에 걸려 요청이 거절됐습니다.${delay}`;
  } else if (
    diagnostic.timeout ||
    diagnostic.providerCode === 'DEADLINE_EXCEEDED'
  ) {
    explanation =
      'AI 응답 대기 시간이 초과되어 수정안을 받지 못했습니다. 잠시 후 다시 요청해 주세요.';
  } else if (diagnostic.errorCategory === 'model_or_resource_not_found') {
    explanation =
      '현재 설정된 AI 모델을 사용할 수 없어 요청이 거절됐습니다. 관리자에게 모델 설정 확인을 요청해 주세요.';
  } else if (diagnostic.errorCategory === 'invalid_request') {
    explanation =
      'AI 서비스가 일정 수정 요청의 형식을 허용하지 않아 거절했습니다. 다시 시도해도 계속되면 관리자에게 요청 형식 점검을 요청해 주세요.';
  } else if (diagnostic.errorCategory === 'provider_unavailable') {
    explanation =
      'AI 서비스에서 서버 오류가 발생해 수정안을 받지 못했습니다. 잠시 후 다시 요청해 주세요.';
  } else if (stage === 'validation') {
    explanation =
      '수정안을 검사하는 중 서버 오류가 발생했습니다. 구체적인 원인은 아직 확인되지 않았습니다.';
  } else {
    explanation =
      'AI 요청을 처리하는 중 오류가 발생했지만 구체적인 원인은 아직 확인되지 않았습니다. 다시 요청해 주세요.';
  }
  const repair = stage.startsWith('repair_')
    ? '첫 수정안의 잘못된 방문 유형을 AI에 보정 요청하던 중 문제가 발생했습니다. '
    : '';
  return `${unchangedNotice}\n${repair}${explanation}`;
}
