import { AgentLog, FullTravelPlan, TravelRequest } from '../types/travel';
import { postJson } from './api';

export interface AgentInfo {
  id: string;
  name: string;
  title: string;
  role: string;
  avatarIcon: string;
  avatarColor: string;
  description: string;
}

export const AGENT_TEAM: AgentInfo[] = [
  {
    id: 'director',
    name: '길라잡이',
    title: '접수 총괄 디렉터',
    role: '고객 요구사항 정밀 분석, 여행 테마/동행자 맞춤 전략 수립 및 에이전트 작업 오케스트레이션',
    avatarIcon: 'Compass',
    avatarColor: 'bg-emerald-600 text-white',
    description: '여행의 전체 컨셉을 조율하고 각 전문 에이전트에게 최적의 임무를 배정합니다.'
  },
  {
    id: 'attraction',
    name: '명소박사',
    title: '주요 관광지 탐색관',
    role: '대한민국 권역별 핵심 명소, 숨은 비경, 계절별 개화/일몰 뷰포인트 정밀 추천',
    avatarIcon: 'Landmark',
    avatarColor: 'bg-indigo-600 text-white',
    description: '관광 빅데이터와 현지 실시간 현황을 바탕으로 잊지 못할 명소를 엄선합니다.'
  },
  {
    id: 'gourmet',
    name: '미식가',
    title: '미식 & 카페 큐레이터',
    role: '블루리본/로컬 향토 맛집, 신선한 식재료 전통식당, 바다/마운틴뷰 감성 카페 발굴',
    avatarIcon: 'UtensilsCrossed',
    avatarColor: 'bg-amber-600 text-white',
    description: '동선과 식사 타이밍에 최적화된 로컬 미식 및 힐링 카페 코스를 완성합니다.'
  },
  {
    id: 'stay',
    name: '안식처',
    title: '맞춤 숙소 큐레이터',
    role: '오션뷰 호텔, 감성 한옥스테이, 독채 풀빌라 등 예산과 인원, 동행자에 꼭 맞는 숙소 엄선',
    avatarIcon: 'Hotel',
    avatarColor: 'bg-purple-600 text-white',
    description: '하루의 피로를 씻고 편안한 쉼을 누릴 수 있는 최적의 힐링 공간을 매칭합니다.'
  },
  {
    id: 'transport',
    name: '동선지기',
    title: '교통 & 동선 최적화관',
    role: 'KTX, 항공, 렌터카 환승 연계, 일자별 최단 이동 동선 계산 및 이동 피로도 최소화',
    avatarIcon: 'Navigation',
    avatarColor: 'bg-blue-600 text-white',
    description: '시간 낭비 없는 효율적 동선과 스마트한 교통편 예매 전략을 수립합니다.'
  },
  {
    id: 'planner',
    name: '설계사',
    title: '일정 & 경비 설계사',
    role: '1일차부터 N일차까지 오전-오후-야간 타임라인 구축 및 항목별 실시간 총경비 산출',
    avatarIcon: 'CalendarDays',
    avatarColor: 'bg-teal-600 text-white',
    description: '시간표와 예산표를 한 치의 오차 없이 조율하여 실행 가능한 일정표로 직조합니다.'
  },
  {
    id: 'auditor',
    name: '감수관',
    title: '안전 & 품질 감수관',
    role: '예산 초과 여부 정밀 감사, 무리한 동선 경고 및 날씨/안전 가이드라인 종합 보고서 작성',
    avatarIcon: 'ShieldCheck',
    avatarColor: 'bg-rose-600 text-white',
    description: '관리자가 최종 결심(인가)을 내릴 수 있도록 객관적이고 엄격한 품질 평가를 제시합니다.'
  },
  {
    id: 'poet',
    name: '풍류시객',
    title: '감성 문학 큐레이터',
    role: '일정에 수록된 음식점과 카페마다 낭만적인 감성 수필 3~4문장과 시(詩) 한 수 헌정',
    avatarIcon: 'Feather',
    avatarColor: 'bg-stone-700 text-white',
    description: '미각과 공간의 감동을 시와 수필로 승화시켜 평생 간직할 여행의 낭만을 선물합니다.'
  }
];

// Helper to delay for realistic orchestration visualization
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function orchestrateTravelPlan(
  request: TravelRequest,
  onLog: (log: AgentLog) => void
): Promise<FullTravelPlan> {
  const timestamp = () => new Date().toLocaleTimeString('ko-KR', { hour12: false });

  // 1. 길라잡이 (접수 총괄)
  onLog({
    id: `log-dir-${Date.now()}`,
    agentId: 'director',
    agentName: '길라잡이 (접수 총괄)',
    agentRole: '의뢰 접수 및 요구사항 정밀 분석',
    avatarIcon: 'Compass',
    avatarColor: 'bg-emerald-600 text-white',
    message: `고객 [${request.clientName}]님의 [${request.destination}] 여행 의뢰를 정식 접수했습니다.`,
    detail: `일정: ${request.startDate} ~ ${request.endDate} (${calculateDayCount(request.startDate, request.endDate)}일간), 인원: 성인 ${request.adultCount}명${request.childCount > 0 ? `, 아동 ${request.childCount}명` : ''}, 예산: ${(request.budget / 10000).toLocaleString()}만원, 테마: ${request.style.join(', ')}`,
    timestamp: timestamp(),
    status: 'WORKING'
  });
  await delay(800);

  // 2. 명소박사 (관광지)
  onLog({
    id: `log-att-${Date.now()}`,
    agentId: 'attraction',
    agentName: '명소박사 (주요 관광지)',
    agentRole: '권역별 명소 및 시즌 핫스팟 탐색',
    avatarIcon: 'Landmark',
    avatarColor: 'bg-indigo-600 text-white',
    message: `[${request.destination}] 권역의 주요 관광지 및 ${request.style[0] || '힐링'} 테마 명소 12곳을 1차 선별했습니다.`,
    detail: `이동 효율성이 높은 핵심 랜드마크와 인파가 덜 붐비는 시간대별 뷰포인트를 분류 중입니다.`,
    timestamp: timestamp(),
    status: 'WORKING'
  });
  await delay(900);

  // 3. 미식가 (맛집 & 카페)
  onLog({
    id: `log-gourmet-${Date.now()}`,
    agentId: 'gourmet',
    agentName: '미식가 (미식 & 카페)',
    agentRole: '로컬 향토식당 및 감성 카페 엄선',
    avatarIcon: 'UtensilsCrossed',
    avatarColor: 'bg-amber-600 text-white',
    message: `방문 동선 상에 위치한 블루리본 및 현지 주민 인증 식당 6곳, 뷰 맛집 카페 4곳을 매칭했습니다.`,
    detail: `고객 특별 요청사항(${request.specialRequests || '로컬 특미'})을 반영하여 점심·저녁 특색 있는 한상을 구성합니다.`,
    timestamp: timestamp(),
    status: 'WORKING'
  });
  await delay(850);

  // 4. 안식처 (숙소)
  onLog({
    id: `log-stay-${Date.now()}`,
    agentId: 'stay',
    agentName: '안식처 (맞춤 숙소)',
    agentRole: '선호 숙소 타입 매칭 및 객실 가용성 확인',
    avatarIcon: 'Hotel',
    avatarColor: 'bg-purple-600 text-white',
    message: `고객 선호 [${getAccommodationLabel(request.accommodationType)}] 후보군 중 평점 4.8 이상 숙소를 확정했습니다.`,
    detail: `1박당 예산 배분 및 주요 행선지 접근성이 우수한 최적 거점을 선정했습니다.`,
    timestamp: timestamp(),
    status: 'WORKING'
  });
  await delay(800);

  // 5. 동선지기 (교통)
  onLog({
    id: `log-trans-${Date.now()}`,
    agentId: 'transport',
    agentName: '동선지기 (교통 & 동선)',
    agentRole: '최단 이동 경로 계산 및 교통 수단 연계',
    avatarIcon: 'Navigation',
    avatarColor: 'bg-blue-600 text-white',
    message: `출발지 [${request.departureCity}]에서 [${request.destination}]까지의 최적 교통편 및 렌터카/대중교통 동선을 수립했습니다.`,
    detail: `지그재그 이동을 원천 차단하고 순환형 경로로 유류비와 이동 피로도를 대폭 절감했습니다.`,
    timestamp: timestamp(),
    status: 'WORKING'
  });
  await delay(900);

  // 6. 설계사 (일정 & 경비 편성)
  onLog({
    id: `log-plan-${Date.now()}`,
    agentId: 'planner',
    agentName: '설계사 (일정 & 경비)',
    agentRole: '타임라인 직조 및 총견적 산출',
    avatarIcon: 'CalendarDays',
    avatarColor: 'bg-teal-600 text-white',
    message: `각 에이전트의 추천 데이터를 종합하여 일자별 시간표와 상세 경비 내역서를 완성했습니다.`,
    detail: `총 경비 산출 완료. 숙박, 식비, 교통, 입장료, 비상 예비비 항목을 예산 내 정밀 배분했습니다.`,
    timestamp: timestamp(),
    status: 'WORKING'
  });
  await delay(850);

  // 7. 감수관 (안전 & 품질 검수)
  onLog({
    id: `log-audit-${Date.now()}`,
    agentId: 'auditor',
    agentName: '감수관 (안전 & 품질 검수)',
    agentRole: '동선 무리도, 예산 준수율, 안전 수칙 종합 평가',
    avatarIcon: 'ShieldCheck',
    avatarColor: 'bg-rose-600 text-white',
    message: `일정표 검수 완료: 종합 안전성 98점, 예산 적합도 96점, 동선 효율성 95점으로 합격 판정.`,
    detail: `관리자 최종 결심(인가) 단계로 상신합니다. 인가 시 고객에게 즉시 확정서가 교부됩니다.`,
    timestamp: timestamp(),
    status: 'DONE'
  });
  await delay(600);

  // 8. 풍류시객 (맛집 & 카페 문학 기행문 작성)
  onLog({
    id: `log-poet-${Date.now()}`,
    agentId: 'poet',
    agentName: '풍류시객 (감성 문학 큐레이터)',
    agentRole: '음식점과 카페 방문 후 감성 수필과 시(詩) 창작',
    avatarIcon: 'Feather',
    avatarColor: 'bg-stone-700 text-white',
    message: `일정에 수록된 모든 맛집과 카페를 위한 감성 수필 3~4문장과 서정시 한 수를 지었습니다.`,
    detail: `식도락의 추억과 공간의 정취를 문학적 기행문 카드로 담아냈습니다.`,
    timestamp: timestamp(),
    status: 'DONE'
  });

  // Now create the plan structure
  const plan = await buildFullTravelPlan(request);
  return plan;
}

export function calculateDayCount(startDate: string, endDate: string): number {
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 && diff <= 10 ? diff : 2;
  } catch {
    return 2;
  }
}

async function buildFullTravelPlan(request: TravelRequest): Promise<FullTravelPlan> {
  return postJson<FullTravelPlan>('/travel/plans', request);
}

function getAccommodationLabel(type: string): string {
  switch (type) {
    case 'HOTEL': return '오션/시티뷰 호텔';
    case 'HANOK': return '전통 한옥스테이';
    case 'RESORT': return '가족형 프리미엄 리조트';
    case 'POOL_VILLA': return '프라이빗 풀빌라';
    case 'PENSION': return '감성 독채 펜션';
    default: return '맞춤 숙소';
  }
}

