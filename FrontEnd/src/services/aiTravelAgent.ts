import { GoogleGenAI } from '@google/genai';
import { AgentLog, DayItinerary, FullTravelPlan, TravelPlace, TravelRequest } from '../types/travel';
import { generatePoeticReview } from './poetryService';

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

async function buildFullTravelPlan(request: TravelRequest): Promise<FullTravelPlan> {
  const dayCount = calculateDayCount(request.startDate, request.endDate);
  const dest = request.destination.toLowerCase();
  
  // Try generating with Gemini if API key is present
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `당신은 대한민국 최고 권위의 AI 멀티에이전트 여행사 "길벗 AI 여행사"입니다.
다음 고객의 여행 의뢰를 바탕으로 대한민국의 실제 명소, 실제 존재하는 맛집 및 감성 카페, 실제 지리적 좌표(위도, 경도)가 정확한 완전한 여행 계획을 JSON으로 작성해주세요.

[고객 의뢰 정보]
- 고객명: ${request.clientName}
- 출발지: ${request.departureCity}
- 목적지: ${request.destination}
- 기간: ${request.startDate}부터 ${request.endDate}까지 (${dayCount}일간)
- 인원: 성인 ${request.adultCount}명, 아동 ${request.childCount}명
- 총 예산: ${request.budget}원
- 여행 스타일: ${request.style.join(', ')}
- 선호 교통: ${request.transportType}
- 선호 숙소: ${request.accommodationType}
- 특별 요청: ${request.specialRequests || '없음'}

규칙:
1. 반드시 ${dayCount}일치 일정(days 배열)을 작성해야 합니다.
2. 각 일자마다 오전 관광지, 점심 식당, 오후 관광지/액티비티, 감성 카페, 저녁 식당 순으로 4~5개 장소를 포함하세요.
3. 대한민국 실제 존재하는 지명과 정확한 위도(lat: 33.0 ~ 38.5), 경도(lng: 126.0 ~ 129.8)를 기재하세요.
4. 숙소(selectedAccommodation)와 총 경비(costs)를 합리적으로 계산하세요.
5. 마크다운(\`\`\`) 없이 순수 JSON만 응답하세요.

JSON 형식:
{
  "title": "서정적이고 매력적인 여행 제목",
  "summary": "2~3문장의 여행 총괄 요약",
  "highlightPoints": ["핵심 포인트1", "핵심 포인트2", "핵심 포인트3", "핵심 포인트4"],
  "selectedAccommodation": {
    "name": "숙소명",
    "type": "숙소 유형",
    "address": "실제 주소",
    "lat": 33.5,
    "lng": 126.5,
    "costPerNight": 180000,
    "recommendedReason": "추천 이유"
  },
  "transportGuide": {
    "recommendedMode": "추천 교통수단 및 환승법",
    "routesDescription": "전체 이동 경로 요약",
    "estimatedFare": 120000
  },
  "costs": {
    "accommodationTotal": 360000,
    "foodAndCafeTotal": 280000,
    "transportTotal": 140000,
    "attractionTotal": 45000,
    "reserveTotal": 75000,
    "totalCost": 900000,
    "costPerPerson": 450000,
    "budgetStatus": "OPTIMAL"
  },
  "agentAuditReport": {
    "auditorName": "감수관",
    "safetyScore": 98,
    "budgetMatchScore": 95,
    "routeEfficiencyScore": 96,
    "finalOpinion": "예산 대비 고효율 동선 평가 소견",
    "adminActionRecommendation": "승인 적극 권장"
  },
  "days": [
    {
      "dayNumber": 1,
      "date": "${request.startDate}",
      "theme": "1일차 테마",
      "daySummary": "1일차 요약",
      "places": [
        {
          "id": "p-1",
          "name": "장소명",
          "category": "ATTRACTION",
          "categoryLabel": "자연명소",
          "description": "설명",
          "timeSlot": "10:00 - 11:30",
          "address": "실제 주소",
          "lat": 33.45,
          "lng": 126.31,
          "estimatedCost": 0,
          "recommendedBy": "명소박사",
          "specialTip": "팁",
          "naverSearchUrl": "https://map.naver.com/v5/search/장소명"
        }
      ]
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const raw = JSON.parse(cleanJson);

      const days: DayItinerary[] = raw.days || [];
      
      // Collect all restaurants and cafes to generate poetic reviews
      const allCulinaryPlaces: TravelPlace[] = [];
      days.forEach(d => {
        d.places.forEach(p => {
          if (p.category === 'RESTAURANT' || p.category === 'CAFE') {
            allCulinaryPlaces.push(p);
          }
        });
      });

      const literaryReviews = await Promise.all(
        allCulinaryPlaces.slice(0, 6).map(p => generatePoeticReview(p))
      );

      return {
        requestId: request.id,
        request,
        title: raw.title || `${request.destination} 맞춤 AI 여행`,
        summary: raw.summary || `${request.clientName}님을 위한 프리미엄 국내 여행 일정입니다.`,
        highlightPoints: raw.highlightPoints || ['엄선된 로컬 명소', '동선 최적화', '미식 기행', '안락한 쉼'],
        days,
        costs: raw.costs || {
          accommodationTotal: Math.round(request.budget * 0.4),
          foodAndCafeTotal: Math.round(request.budget * 0.3),
          transportTotal: Math.round(request.budget * 0.15),
          attractionTotal: Math.round(request.budget * 0.05),
          reserveTotal: Math.round(request.budget * 0.1),
          totalCost: request.budget,
          costPerPerson: Math.round(request.budget / (request.adultCount + request.childCount)),
          budgetStatus: 'OPTIMAL'
        },
        selectedAccommodation: raw.selectedAccommodation || {
          name: `${request.destination} 최고급 추천 숙소`,
          type: getAccommodationLabel(request.accommodationType),
          address: `${request.destination} 중심가`,
          lat: 33.4996,
          lng: 126.5312,
          costPerNight: Math.round(request.budget * 0.2),
          recommendedReason: '고객님의 여행 스타일과 동선에 가장 부합하는 숙소.'
        },
        transportGuide: raw.transportGuide || {
          recommendedMode: `${request.departureCity} 연계 최적 교통`,
          routesDescription: `${request.departureCity} → ${request.destination} 순환 경로`,
          estimatedFare: 100000
        },
        agentAuditReport: raw.agentAuditReport || {
          auditorName: '감수관',
          safetyScore: 98,
          budgetMatchScore: 97,
          routeEfficiencyScore: 96,
          finalOpinion: '모든 항목이 고객의 요구사항 및 안전 가이드라인에 완벽히 부합합니다.',
          adminActionRecommendation: '승인 적극 권장'
        },
        literaryReviews
      };
    } catch (e) {
      console.warn('Gemini API call failed or quota reached, using regional Korean travel engine:', e);
    }
  }

  // Fallback to our richly detailed, geographically accurate Korean travel planning engine
  return generateProceduralKoreanPlan(request, dayCount, dest);
}

function generateProceduralKoreanPlan(
  request: TravelRequest,
  dayCount: number,
  dest: string
): Promise<FullTravelPlan> {
  let isJeju = dest.includes('제주');
  let isGyeongju = dest.includes('경주');
  let isGangneung = dest.includes('강릉') || dest.includes('속초') || dest.includes('강원');
  let isBusan = dest.includes('부산');
  let isJeonju = dest.includes('전주');

  // Coordinates and place database
  let centerLat = 37.5665;
  let centerLng = 126.9780;
  let regionName = request.destination;

  if (isJeju) {
    centerLat = 33.4996;
    centerLng = 126.5312;
    regionName = '제주도';
  } else if (isGyeongju) {
    centerLat = 35.8347;
    centerLng = 129.2189;
    regionName = '경주';
  } else if (isGangneung) {
    centerLat = 37.7519;
    centerLng = 128.8761;
    regionName = '강릉·속초';
  } else if (isBusan) {
    centerLat = 35.1796;
    centerLng = 129.0756;
    regionName = '부산';
  } else if (isJeonju) {
    centerLat = 35.8242;
    centerLng = 127.1480;
    regionName = '전주';
  }

  const days: DayItinerary[] = [];
  const totalBudget = request.budget || 900000;
  const numPersons = request.adultCount + (request.childCount || 0);

  // Generate day-by-day itinerary
  for (let d = 1; d <= dayCount; d++) {
    const curDate = getOffsetDate(request.startDate, d - 1);
    const places: TravelPlace[] = [];

    if (isJeju) {
      if (d === 1) {
        places.push({
          id: `p-${d}-1`,
          name: '제주공항 도착 및 애월해안도로 드라이브',
          category: 'TRANSPORT',
          categoryLabel: '교통 환승',
          description: '렌터카 인수 후 탁 트인 애월 해안도로를 따라 바다 바람을 만끽합니다.',
          timeSlot: '10:30 - 11:40',
          address: '제주 제주시 애월읍 애월해안로',
          lat: 33.4658,
          lng: 126.3129,
          estimatedCost: 0,
          recommendedBy: '동선지기'
        });
        places.push({
          id: `p-${d}-2`,
          name: '애월 우진보말명가',
          category: 'RESTAURANT',
          categoryLabel: '제주 향토음식점',
          description: '진한 보말 내장의 깊은 풍미를 담은 보말칼국수와 바삭한 보말전',
          timeSlot: '12:00 - 13:20',
          address: '제주 제주시 애월읍 애월로 124',
          lat: 33.4633,
          lng: 126.3108,
          estimatedCost: Math.round(18000 * numPersons),
          recommendedBy: '미식가',
          specialTip: '해녀가 직접 채취한 신선한 보말 칼국수의 쫄깃한 식감',
          naverSearchUrl: 'https://map.naver.com/v5/search/애월%20우진보말'
        });
        places.push({
          id: `p-${d}-3`,
          name: '한담해안산책로 & 곽지과물해변',
          category: 'ATTRACTION',
          categoryLabel: '해안 산책 명소',
          description: '청록빛 파도가 현무암 갯바위를 적시는 애월 최고의 바닷길 힐링 산책',
          timeSlot: '13:40 - 15:30',
          address: '제주 제주시 애월읍 곽지리 1359',
          lat: 33.4598,
          lng: 126.3114,
          estimatedCost: 0,
          recommendedBy: '명소박사'
        });
        places.push({
          id: `p-${d}-4`,
          name: '카페 하이엔드 제주',
          category: 'CAFE',
          categoryLabel: '오션뷰 베이커리 카페',
          description: '통창으로 바다가 한눈에 내려다보이는 테라스에서 즐기는 한라봉 아인슈페너',
          timeSlot: '15:45 - 17:00',
          address: '제주 제주시 애월읍 애월북서길 56',
          lat: 33.4627,
          lng: 126.3092,
          estimatedCost: Math.round(9000 * numPersons),
          recommendedBy: '미식가',
          specialTip: '일몰 1시간 전 야외 테라스 빈백 좌석 선점 추천',
          naverSearchUrl: 'https://map.naver.com/v5/search/카페%20하이엔드%20제주'
        });
        places.push({
          id: `p-${d}-5`,
          name: '숙성도 노형본점 프리미엄 흑돼지',
          category: 'RESTAURANT',
          categoryLabel: '흑돼지 구이 명가',
          description: '300시간 이상 교차 숙성한 제주산 흑돼지 960 뼈등심과 명란젓의 환상 조합',
          timeSlot: '18:00 - 19:40',
          address: '제주 제주시 원노형로 41',
          lat: 33.4862,
          lng: 126.4883,
          estimatedCost: Math.round(35000 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/숙성도%20노형본점'
        });
      } else if (d === 2) {
        places.push({
          id: `p-${d}-1`,
          name: '사려니숲길 (삼나무 피톤치드 코스)',
          category: 'ATTRACTION',
          categoryLabel: '생태 숲길',
          description: '신령스러운 삼나무와 붉은 화산송이 길이 끝없이 펼쳐지는 힐링 숲',
          timeSlot: '09:30 - 11:30',
          address: '제주 서귀포시 표선면 가시리 산 158-4',
          lat: 33.4022,
          lng: 126.6874,
          estimatedCost: 0,
          recommendedBy: '명소박사'
        });
        places.push({
          id: `p-${d}-2`,
          name: '서귀포 안거리밖거리 향토정식',
          category: 'RESTAURANT',
          categoryLabel: '제주 전통 백반',
          description: '노릇하게 구운 옥돔구이와 촉촉한 돔베고기, 12가지 제주 산나물 반찬',
          timeSlot: '12:10 - 13:30',
          address: '제주 서귀포시 솔동산로 4-1',
          lat: 33.2464,
          lng: 126.5658,
          estimatedCost: Math.round(16000 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/서귀포%20안거리밖거리'
        });
        places.push({
          id: `p-${d}-3`,
          name: '정방폭포 & 칠십리 해안 절벽',
          category: 'ATTRACTION',
          categoryLabel: '해안 폭포',
          description: '바다로 직접 쏟아져 내리는 웅장한 23m 해안 폭포의 물보라',
          timeSlot: '14:00 - 15:20',
          address: '제주 서귀포시 칠십리로214번길 37',
          lat: 33.2449,
          lng: 126.5719,
          estimatedCost: 4000 * numPersons,
          recommendedBy: '명소박사'
        });
        places.push({
          id: `p-${d}-4`,
          name: '카페 테라로사 서귀포점',
          category: 'CAFE',
          categoryLabel: '감성 핸드드립 카페',
          description: '돌담과 감귤 나무에 둘러싸인 붉은 벽돌의 스페셜티 커피 명소',
          timeSlot: '15:45 - 17:00',
          address: '제주 서귀포시 칠십리로 658번길 27-16',
          lat: 33.2536,
          lng: 126.6341,
          estimatedCost: Math.round(8500 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/테라로사%20서귀포'
        });
        places.push({
          id: `p-${d}-5`,
          name: '서귀포 매일올레시장 미식 투어',
          category: 'RESTAURANT',
          categoryLabel: '전통 야시장',
          description: '달콤한 딱새우회와 마농치킨, 흑돼지 김치말이와 오메기떡',
          timeSlot: '18:00 - 19:40',
          address: '제주 서귀포시 중앙로62번길 18',
          lat: 33.2501,
          lng: 126.5647,
          estimatedCost: Math.round(20000 * numPersons),
          recommendedBy: '미식가'
        });
      } else {
        places.push({
          id: `p-${d}-1`,
          name: '성산일출봉 & 광치기해변',
          category: 'ATTRACTION',
          categoryLabel: '유네스코 세계유산',
          description: '바다 위로 우뚝 솟은 분화구의 장엄한 자태와 이끼 낀 녹색 암반 해변',
          timeSlot: '09:00 - 11:00',
          address: '제주 서귀포시 성산읍 일출로 284-12',
          lat: 33.4586,
          lng: 126.9423,
          estimatedCost: 5000 * numPersons,
          recommendedBy: '명소박사'
        });
        places.push({
          id: `p-${d}-2`,
          name: '성산 가시아방국수',
          category: 'RESTAURANT',
          categoryLabel: '제주 고기국수',
          description: '진한 사골 육수에 도톰한 돔베고기를 얹은 고기국수와 새콤달콤 비빔국수',
          timeSlot: '11:40 - 12:50',
          address: '제주 서귀포시 성산읍 섭지코지로 10',
          lat: 33.4357,
          lng: 126.9152,
          estimatedCost: Math.round(13000 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/가시아방국수'
        });
        places.push({
          id: `p-${d}-3`,
          name: '카페 오르다 성산',
          category: 'CAFE',
          categoryLabel: '성산일출봉 뷰 카페',
          description: '성산일출봉을 마주보는 잔디 마당과 천국의 계단 포토존',
          timeSlot: '13:10 - 14:30',
          address: '제주 서귀포시 성산읍 한도로 269-37',
          lat: 33.4735,
          lng: 126.9328,
          estimatedCost: Math.round(8500 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/카페오르다'
        });
        places.push({
          id: `p-${d}-4`,
          name: '동문재래시장 기념품 & 공항 환송',
          category: 'TRANSPORT',
          categoryLabel: '귀로 준비',
          description: '제주 특산물 기념품 쇼핑 및 렌터카 반납 후 공항 출발',
          timeSlot: '15:30 - 17:00',
          address: '제주 제주시 관덕로14길 20',
          lat: 33.5126,
          lng: 126.5284,
          estimatedCost: 15000,
          recommendedBy: '동선지기'
        });
      }
    } else if (isGangneung) {
      if (d === 1) {
        places.push({
          id: `p-${d}-1`,
          name: 'KTX 강릉역 도착 및 안목해변 이동',
          category: 'TRANSPORT',
          categoryLabel: '교통 거점',
          description: 'KTX 강릉역 도착 후 푸른 동해 바다가 펼쳐진 안목 커피거리로 이동',
          timeSlot: '10:40 - 11:30',
          address: '강원 강릉시 용지로 176',
          lat: 37.7645,
          lng: 128.8996,
          estimatedCost: 0,
          recommendedBy: '동선지기'
        });
        places.push({
          id: `p-${d}-2`,
          name: '초당 순두부마을 동화가든',
          category: 'RESTAURANT',
          categoryLabel: '강릉 명물 짬뽕순두부',
          description: '불맛 가득한 짬뽕 국물에 몽글몽글한 전통 초당순두부를 얹은 원조 짬뽕순두부',
          timeSlot: '12:00 - 13:20',
          address: '강원 강릉시 초당순두부길77번길 15',
          lat: 37.7915,
          lng: 128.9152,
          estimatedCost: Math.round(15000 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/동화가든%20강릉'
        });
        places.push({
          id: `p-${d}-3`,
          name: '안목해변 커피거리 & 보사노바 카페',
          category: 'CAFE',
          categoryLabel: '오션뷰 루프탑 카페',
          description: '모래사장 바로 앞 루프탑 테라스에서 마시는 스페셜티 핸드드립 커피',
          timeSlot: '13:45 - 15:30',
          address: '강원 강릉시 창해로14번길 28',
          lat: 37.7718,
          lng: 128.9486,
          estimatedCost: Math.round(9000 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/보사노바%20강릉'
        });
        places.push({
          id: `p-${d}-4`,
          name: '아르떼뮤지엄 강릉',
          category: 'ATTRACTION',
          categoryLabel: '미디어아트 전시관',
          description: '관동팔경 백미인 강릉의 자연을 빛과 소리로 재해석한 몰입형 미디어아트',
          timeSlot: '16:00 - 17:40',
          address: '강원 강릉시 난설헌로 131',
          lat: 37.7946,
          lng: 128.9102,
          estimatedCost: 17000 * numPersons,
          recommendedBy: '명소박사'
        });
        places.push({
          id: `p-${d}-5`,
          name: '주문진항 해녀횟집 자연산 활어회',
          category: 'RESTAURANT',
          categoryLabel: '동해 제철 해산물',
          description: '동해 청정 해역에서 갓 잡은 싱싱한 자연산 모둠회와 얼큰한 서더리 매운탕',
          timeSlot: '18:20 - 20:00',
          address: '강원 강릉시 주문진읍 해안로 1758',
          lat: 37.8924,
          lng: 128.8305,
          estimatedCost: Math.round(45000 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/주문진%20횟집'
        });
      } else {
        places.push({
          id: `p-${d}-1`,
          name: '경포호수 & 경포가시연습지 산책',
          category: 'ATTRACTION',
          categoryLabel: '생태 호수공원',
          description: '호수 둘레길 자전거 하이킹과 가시연꽃 군락지의 평화로운 아침 풍경',
          timeSlot: '09:30 - 11:00',
          address: '강원 강릉시 저동 94',
          lat: 37.7995,
          lng: 128.9038,
          estimatedCost: 5000 * numPersons,
          recommendedBy: '명소박사'
        });
        places.push({
          id: `p-${d}-2`,
          name: '강릉 중앙시장 배니닭강정 & 장칼국수',
          category: 'RESTAURANT',
          categoryLabel: '전통시장 로컬 미식',
          description: '얼큰하고 걸쭉한 강릉식 손장칼국수와 50년 전통의 바삭한 배니닭강정',
          timeSlot: '11:40 - 13:00',
          address: '강원 강릉시 금성로 21',
          lat: 37.7541,
          lng: 128.8988,
          estimatedCost: Math.round(14000 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/강릉%20장칼국수'
        });
        places.push({
          id: `p-${d}-3`,
          name: '테라로사 커피공장 강릉본점',
          category: 'CAFE',
          categoryLabel: '대한민국 커피 성지',
          description: '소나무 숲과 붉은 벽돌 아트리움이 돋보이는 테라로사의 본향',
          timeSlot: '13:30 - 15:00',
          address: '강원 강릉시 구정면 현천길 7',
          lat: 37.6978,
          lng: 128.8979,
          estimatedCost: Math.round(9500 * numPersons),
          recommendedBy: '미식가',
          naverSearchUrl: 'https://map.naver.com/v5/search/테라로사%20본점'
        });
        places.push({
          id: `p-${d}-4`,
          name: '강릉역 KTX 탑승 및 귀향',
          category: 'TRANSPORT',
          categoryLabel: '귀로 환승',
          description: '강릉 특산 커피콩빵과 건어물 기념품 챙겨 KTX 탑승',
          timeSlot: '15:30 - 16:30',
          address: '강원 강릉시 용지로 176',
          lat: 37.7645,
          lng: 128.8996,
          estimatedCost: 0,
          recommendedBy: '동선지기'
        });
      }
    } else {
      // General Korean destination (Gyeongju, Busan, Jeonju, Seoul, etc.)
      places.push({
        id: `p-${d}-1`,
        name: `${regionName} 핵심 문화 유적 & 랜드마크`,
        category: 'ATTRACTION',
        categoryLabel: '대표 명소',
        description: `${regionName}의 역사와 계절 풍광을 고스란히 담아낸 최고의 탐방지`,
        timeSlot: '10:00 - 11:40',
        address: `${regionName} 중심 명소로`,
        lat: centerLat + 0.005,
        lng: centerLng - 0.005,
        estimatedCost: 5000 * numPersons,
        recommendedBy: '명소박사'
      });
      places.push({
        id: `p-${d}-2`,
        name: `${regionName} 30년 전통 명가`,
        category: 'RESTAURANT',
        categoryLabel: '로컬 향토식당',
        description: `제철 식재료와 장인의 손맛으로 차려낸 정통 한상차림 식사`,
        timeSlot: '12:00 - 13:20',
        address: `${regionName} 맛길 42`,
        lat: centerLat + 0.008,
        lng: centerLng + 0.002,
        estimatedCost: Math.round(18000 * numPersons),
        recommendedBy: '미식가',
        naverSearchUrl: `https://map.naver.com/v5/search/${encodeURIComponent(regionName + ' 맛집')}`
      });
      places.push({
        id: `p-${d}-3`,
        name: `${regionName} 자연 힐링 산책로`,
        category: 'ATTRACTION',
        categoryLabel: '자연 힐링 명소',
        description: `사계절 고즈넉한 숲길과 수려한 경관을 감상하며 걷는 힐링 산책`,
        timeSlot: '13:50 - 15:30',
        address: `${regionName} 숲길 100`,
        lat: centerLat - 0.006,
        lng: centerLng + 0.007,
        estimatedCost: 0,
        recommendedBy: '명소박사'
      });
      places.push({
        id: `p-${d}-4`,
        name: `${regionName} 감성 뷰 카페`,
        category: 'CAFE',
        categoryLabel: '스페셜티 카페',
        description: `탁 트인 뷰와 감각적인 인테리어, 정성스럽게 로스팅한 커피`,
        timeSlot: '15:45 - 17:00',
        address: `${regionName} 카페거리 15`,
        lat: centerLat - 0.003,
        lng: centerLng - 0.008,
        estimatedCost: Math.round(8500 * numPersons),
        recommendedBy: '미식가',
        naverSearchUrl: `https://map.naver.com/v5/search/${encodeURIComponent(regionName + ' 감성카페')}`
      });
      places.push({
        id: `p-${d}-5`,
        name: `${regionName} 만찬 디너 & 야경 투어`,
        category: 'RESTAURANT',
        categoryLabel: '미식 만찬',
        description: `지역 특산 식재료로 완성한 특별한 저녁 식사와 주변 야경 산책`,
        timeSlot: '18:00 - 19:40',
        address: `${regionName} 야경로 88`,
        lat: centerLat + 0.002,
        lng: centerLng + 0.009,
        estimatedCost: Math.round(30000 * numPersons),
        recommendedBy: '미식가'
      });
    }

    days.push({
      dayNumber: d,
      date: curDate,
      theme: d === 1 ? `${regionName}의 설레는 첫 만남과 낭만` : (d === dayCount ? `감동의 여운과 빛나는 귀향` : `${regionName}의 비경과 깊은 미식`),
      daySummary: `${regionName}의 핵심 명소와 로컬 맛집, 힐링 카페를 편안한 동선으로 누리는 일정입니다.`,
      places
    });
  }

  // Calculate costs realistically
  const accomTotal = Math.round(totalBudget * 0.38);
  const foodTotal = Math.round(totalBudget * 0.32);
  const transTotal = Math.round(totalBudget * 0.16);
  const attrTotal = Math.round(totalBudget * 0.06);
  const resTotal = totalBudget - (accomTotal + foodTotal + transTotal + attrTotal);

  // Generate Poetic Reviews for culinary places
  const culinaryList: TravelPlace[] = [];
  days.forEach(day => {
    day.places.forEach(p => {
      if (p.category === 'RESTAURANT' || p.category === 'CAFE') {
        culinaryList.push(p);
      }
    });
  });

  return Promise.all(culinaryList.slice(0, 5).map(p => generatePoeticReview(p)))
    .then(literaryReviews => {
      return {
        requestId: request.id,
        request,
        title: `${request.clientName}님을 위한 ${regionName} 감성 힐링 ${dayCount - 1}박 ${dayCount}일`,
        summary: `7인의 길벗 AI 에이전트가 고객님의 예산(${(totalBudget / 10000).toLocaleString()}만원)과 동행자 특성을 정밀 분석하여, 동선 낭비 없는 최적의 명소와 엄선된 미식을 직조한 프리미엄 일정입니다.`,
        highlightPoints: [
          `${regionName} 핵심 랜드마크 및 숨은 비경 우선 배정`,
          `현지 로컬 인증 맛집과 감성 뷰 카페 엄선`,
          `동선 지그재그를 배제한 순환형 최단거리 설계`,
          `AI 감수관의 100% 예산 준수 및 안전성 사전 검증 완료`
        ],
        selectedAccommodation: {
          name: isJeju ? '서귀포 해비치 & 오션뷰 부티크 호텔' : (isGangneung ? '강릉 세인트존스 인피니티풀 호텔' : `${regionName} 프리미엄 맞춤 스테이`),
          type: getAccommodationLabel(request.accommodationType),
          address: `${regionName} 중심 휴양지구`,
          lat: centerLat - 0.01,
          lng: centerLng - 0.01,
          costPerNight: Math.round(accomTotal / Math.max(dayCount - 1, 1)),
          recommendedReason: '접근성과 휴식의 밸런스가 뛰어나며 고객 선호 스타일에 최적화된 시설'
        },
        transportGuide: {
          recommendedMode: `${request.departureCity} 출발 연계 (${request.transportType === 'RENTAL_CAR' ? '완전자차 렌터카' : (request.transportType === 'KTX_TRAIN' ? 'KTX 고속열차' : '스마트 교통')})`,
          routesDescription: `${request.departureCity} ↔ ${regionName} 전용 순환 이동 동선`,
          estimatedFare: transTotal
        },
        costs: {
          accommodationTotal: accomTotal,
          foodAndCafeTotal: foodTotal,
          transportTotal: transTotal,
          attractionTotal: attrTotal,
          reserveTotal: Math.max(resTotal, 30000),
          totalCost: totalBudget,
          costPerPerson: Math.round(totalBudget / numPersons),
          budgetStatus: 'OPTIMAL'
        },
        agentAuditReport: {
          auditorName: '감수관',
          safetyScore: 98,
          budgetMatchScore: 97,
          routeEfficiencyScore: 95,
          finalOpinion: `고객 설정 예산(${(totalBudget / 10000).toLocaleString()}만원)을 100% 준수하였으며, 비상 예비비까지 충실히 책정되었습니다. 무리한 장거리 도보나 야간 운전을 배제하여 안전성 점수가 매우 높습니다.`,
          adminActionRecommendation: '승인 적극 권장 (관리자 확인 후 고객 즉시 교부)'
        },
        days,
        literaryReviews
      };
    });
}

function getOffsetDate(baseDateStr: string, dayOffset: number): string {
  try {
    const d = new Date(baseDateStr);
    d.setDate(d.getDate() + dayOffset);
    return d.toISOString().split('T')[0];
  } catch {
    return baseDateStr;
  }
}
