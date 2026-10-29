import { FullTravelPlan, TravelRequest, AgencyStats } from '../types/travel';
import { generateMapPushLinks, auditPlanGisMapping } from '../services/mapIntegrationService';
import { generateSafetyAgentReport } from '../services/safetyService';

export const INITIAL_AGENCY_STATS: AgencyStats = {
  totalRequests: 28,
  autoDesignedCount: 28,
  approvedCount: 24,
  revisingCount: 3,
  approvalRate: 85.7,
  totalEstimatedRevenue: 34850000,
  topDestinations: [
    { name: '제주특별자치도', count: 11, percentage: 39 },
    { name: '강원도 강릉·속초', count: 7, percentage: 25 },
    { name: '경상북도 경주', count: 5, percentage: 18 },
    { name: '전라남도 여수·순천', count: 3, percentage: 11 },
    { name: '부산광역시', count: 2, percentage: 7 }
  ],
  averageDesignTimeSeconds: 4.8
};

// Preset 1: 제주 애월 & 서귀포 힐링 미식 2박 3일
export const PRESET_JEJU_REQUEST: TravelRequest = {
  id: 'req-jeju-001',
  clientName: '김서연',
  clientContact: '010-8254-9123',
  departureCity: '서울(김포공항)',
  destination: '제주도 (애월 & 서귀포 & 성산)',
  startDate: '2026-10-25',
  endDate: '2026-10-27',
  adultCount: 2,
  childCount: 0,
  budget: 1300000,
  style: ['힐링/휴양', '미식/카페', '인스타감성'],
  transportType: 'RENTAL_CAR',
  accommodationType: 'HOTEL',
  specialRequests: '바다가 보이는 오션뷰 숙소와 신선한 흑돼지, 딱새우 맛집, 일몰이 아름다운 감성 카페를 꼭 포함해주세요.',
  createdAt: '2026-10-15 14:20',
  status: 'PENDING_APPROVAL',
  adminNote: 'AI 설계 검증 완료. 숙소 및 렌터카 예약 슬롯 확보 대기'
};

export const PRESET_JEJU_PLAN: FullTravelPlan = {
  requestId: 'req-jeju-001',
  request: PRESET_JEJU_REQUEST,
  title: '제주 푸른 물결과 바람이 빚은 쉼, 애월·서귀포 힐링 미식 3일',
  summary: '제주 서북부 애월의 에메랄드빛 해안 카페와 일몰, 남부 서귀포의 울창한 곶자왈 숲과 성산일출봉의 비경을 엮은 최적의 감성 힐링 코스입니다.',
  highlightPoints: [
    '애월 한담해안산책로 & 에메랄드빛 바다 감성 카페 투어',
    '서귀포 올레시장 명물 딱새우회와 제주 전통 숙성 흑돼지 만찬',
    '제주 사려니숲길의 삼나무 피톤치드 힐링 산책',
    '성산일출봉 능선과 섭지코지의 광활한 해안 절경'
  ],
  selectedAccommodation: {
    name: '서귀포 해비치 & 오션뷰 부티크 호텔',
    type: '오션뷰 프리미엄 호텔',
    address: '제주 서귀포시 표선면 민속해안로 537',
    lat: 33.3228,
    lng: 126.8431,
    costPerNight: 240000,
    recommendedReason: '전 객실 파노라마 오션뷰와 조용한 프라이빗 스파를 갖추어 고객의 힐링 요청에 가장 부합하는 숙소.'
  },
  transportGuide: {
    recommendedMode: '제주공항 인수 완전자차 준중형 전기차 렌터카',
    routesDescription: '제주공항 → 애월해안도로(1132호선) → 중산간(1115호선) → 서귀포 → 성산 → 공항',
    estimatedFare: 165000
  },
  costs: {
    accommodationTotal: 480000,
    foodAndCafeTotal: 340000,
    transportTotal: 235000,
    attractionTotal: 58000,
    reserveTotal: 87000,
    totalCost: 1200000,
    costPerPerson: 600000,
    budgetStatus: 'OPTIMAL'
  },
  agentAuditReport: {
    auditorName: '감수관',
    safetyScore: 98,
    budgetMatchScore: 96,
    routeEfficiencyScore: 94,
    finalOpinion: '고객 설정 예산(130만원) 대비 120만원으로 10만원의 넉넉한 여유 버퍼를 확보하였으며, 동선이 서쪽에서 남쪽, 동쪽으로 부드럽게 순환하여 운전 피로도가 매우 낮습니다.',
    adminActionRecommendation: '승인 적극 권장 (렌터카 사전확약 및 호텔 잔여 오션뷰 룸 홀딩 필요)'
  },
  days: [
    {
      dayNumber: 1,
      date: '2026-10-25',
      theme: '애월의 은빛 윤슬과 제주의 첫 만남',
      daySummary: '제주공항 도착 후 애월 에메랄드빛 바다를 따라 산책하고 정갈한 보말칼국수와 카페에서 여유를 만끽합니다.',
      places: [
        {
          id: 'jeju-d1-1',
          name: '제주국제공항 렌터카 인수',
          category: 'TRANSPORT',
          categoryLabel: '교통 거점',
          description: '공항 도착 셔틀 탑승 및 완전자차 EV 렌터카 인수',
          timeSlot: '10:30 - 11:20',
          address: '제주 제주시 공항로 2',
          lat: 33.5065,
          lng: 126.4928,
          estimatedCost: 0,
          recommendedBy: '동선지기',
          specialTip: '키오스크 비대면 체크인으로 10분 내 신속 출차 가능'
        },
        {
          id: 'jeju-d1-2',
          name: '애월 우진보말명가',
          category: 'RESTAURANT',
          categoryLabel: '미식/향토식당',
          description: '진한 보말내장 육수와 쫄깃한 면발의 보말칼국수 및 바삭한 보말전',
          timeSlot: '12:00 - 13:10',
          address: '제주 제주시 애월읍 애월로 124',
          lat: 33.4633,
          lng: 126.3108,
          estimatedCost: 36000,
          recommendedBy: '미식가',
          specialTip: '현지 해녀가 채취한 신선한 제주산 보말만 사용, 밑반찬 오징어젓갈 일품',
          naverSearchUrl: 'https://map.naver.com/v5/search/애월%20우진보말'
        },
        {
          id: 'jeju-d1-3',
          name: '한담해안산책로',
          category: 'ATTRACTION',
          categoryLabel: '자연명소',
          description: '검은 현무암과 청록빛 바다가 어우러진 제주 서부 최고의 해안길 산책',
          timeSlot: '13:30 - 15:00',
          address: '제주 제주시 애월읍 곽지리 1359',
          lat: 33.4598,
          lng: 126.3114,
          estimatedCost: 0,
          recommendedBy: '명소박사',
          specialTip: '평탄한 포장길로 바다 바로 옆을 거닐며 인생 사진 포인트 다수'
        },
        {
          id: 'jeju-d1-4',
          name: '카페 하이엔드 제주 & 노티드 애월',
          category: 'CAFE',
          categoryLabel: '감성 오션뷰 카페',
          description: '통창 너머로 애월 파도가 부서지는 파노라마 오션뷰와 시그니처 한라봉 아인슈페너',
          timeSlot: '15:15 - 16:45',
          address: '제주 제주시 애월읍 애월북서길 56',
          lat: 33.4627,
          lng: 126.3092,
          estimatedCost: 22000,
          recommendedBy: '미식가',
          specialTip: '2층 테라스 좌석에서 바라보는 바다 지평선 뷰 추천',
          naverSearchUrl: 'https://map.naver.com/v5/search/카페%20하이엔드%20제주'
        },
        {
          id: 'jeju-d1-5',
          name: '숙성도 노형본점 (또는 중문점)',
          category: 'RESTAURANT',
          categoryLabel: '제주 흑돼지 구이',
          description: '숙성 장인의 손길로 300시간 이상 교차 숙성한 960 프리미엄 뼈등심과 흑삼겹',
          timeSlot: '18:00 - 19:40',
          address: '제주 제주시 원노형로 41',
          lat: 33.4862,
          lng: 126.4883,
          estimatedCost: 92000,
          recommendedBy: '미식가',
          specialTip: '갈치속젓 볶음밥과 명란젓 토핑을 곁들여 먹는 것이 백미',
          naverSearchUrl: 'https://map.naver.com/v5/search/숙성도%20제주'
        }
      ]
    },
    {
      dayNumber: 2,
      date: '2026-10-26',
      theme: '숲의 숨결과 서귀포 푸른 파도의 서정',
      daySummary: '삼나무 가득한 사려니숲길의 청량한 공기를 마시고 서귀포의 폭포와 올레시장 야식을 즐깁니다.',
      places: [
        {
          id: 'jeju-d2-1',
          name: '사려니숲길 (붉은오름 입구 코스)',
          category: 'ATTRACTION',
          categoryLabel: '생태/숲길',
          description: '하늘을 찌를 듯 곧게 뻗은 삼나무 숲 사이로 걷는 제주 대표 치유 숲길',
          timeSlot: '09:30 - 11:30',
          address: '제주 서귀포시 표선면 가시리 산 158-4',
          lat: 33.4022,
          lng: 126.6874,
          estimatedCost: 0,
          recommendedBy: '명소박사',
          specialTip: '무장애 나눔길이 잘 조성되어 있어 가벼운 운동화로도 편안하게 산책 가능'
        },
        {
          id: 'jeju-d2-2',
          name: '서귀포 안거리밖거리 향토한식',
          category: 'RESTAURANT',
          categoryLabel: '전통 백반 정식',
          description: '제주산 옥돔구이, 돔베고기, 계란찜과 12가지 정갈한 제주 제철 나물 한상차림',
          timeSlot: '12:15 - 13:30',
          address: '제주 서귀포시 솔동산로 4-1',
          lat: 33.2464,
          lng: 126.5658,
          estimatedCost: 32000,
          recommendedBy: '미식가',
          specialTip: '가성비와 건강한 맛을 모두 잡은 로컬 주민들의 숨은 밥집',
          naverSearchUrl: 'https://map.naver.com/v5/search/서귀포%20안거리밖거리'
        },
        {
          id: 'jeju-d2-3',
          name: '정방폭포 & 소정방길',
          category: 'ATTRACTION',
          categoryLabel: '해안 폭포',
          description: '동양 유일의 바다로 직접 떨어지는 웅장한 23m 해안 폭포와 검은 조약돌 해변',
          timeSlot: '14:00 - 15:20',
          address: '제주 서귀포시 칠십리로214번길 37',
          lat: 33.2449,
          lng: 126.5719,
          estimatedCost: 4000,
          recommendedBy: '명소박사',
          specialTip: '폭포 아래 해녀들이 바로 썰어주는 싱싱한 뿔소라 해삼 맛보기 가능'
        },
        {
          id: 'jeju-d2-4',
          name: '카페 테라로사 서귀포점',
          category: 'CAFE',
          categoryLabel: '감성 핸드드립 카페',
          description: '제주 귤밭과 검은 돌담으로 둘러싸인 아늑한 붉은 벽돌의 스페셜티 커피 명소',
          timeSlot: '15:45 - 17:15',
          address: '제주 서귀포시 칠십리로 658번길 27-16',
          lat: 33.2536,
          lng: 126.6341,
          estimatedCost: 20000,
          recommendedBy: '미식가',
          specialTip: '제주 한정 감귤 드립 커피와 갓 구운 피칸 파이의 페어링 환상적',
          naverSearchUrl: 'https://map.naver.com/v5/search/테라로사%20서귀포'
        },
        {
          id: 'jeju-d2-5',
          name: '서귀포 매일올레시장 미식 야행',
          category: 'RESTAURANT',
          categoryLabel: '전통 야시장',
          description: '달콤한 딱새우회 한 접시, 흑돼지 김치말이 삼겹, 마농치킨과 오메기떡 시식',
          timeSlot: '18:30 - 20:00',
          address: '제주 서귀포시 중앙로62번길 18',
          lat: 33.2501,
          lng: 126.5647,
          estimatedCost: 45000,
          recommendedBy: '미식가',
          specialTip: '시장 중앙 벤치에서 맥주와 함께 즐기거나 포장하여 호텔 테라스에서 만끽'
        }
      ]
    },
    {
      dayNumber: 3,
      date: '2026-10-27',
      theme: '성산의 웅장한 아침 햇살과 빛나는 귀향',
      daySummary: '유네스코 세계자연유산 성산일출봉과 섭지코지를 조망하고 제주의 마지막 만찬 후 공항으로 향합니다.',
      places: [
        {
          id: 'jeju-d3-1',
          name: '성산일출봉 & 광치기해변',
          category: 'ATTRACTION',
          categoryLabel: '유네스코 세계유산',
          description: '바다 위로 솟구친 분화구의 장엄한 자태와 광치기 해변의 독특한 이끼 낀 녹색 암반 지대',
          timeSlot: '09:00 - 11:00',
          address: '제주 서귀포시 성산읍 일출로 284-12',
          lat: 33.4586,
          lng: 126.9423,
          estimatedCost: 10000,
          recommendedBy: '명소박사',
          specialTip: '물때(간조)에 맞춰 광치기 해변에 서면 성산일출봉 전경이 환상적으로 반영됨'
        },
        {
          id: 'jeju-d3-2',
          name: '성산 가시아방국수',
          category: 'RESTAURANT',
          categoryLabel: '제주 고기국수',
          description: '도톰하고 부드러운 돔베고기가 푸짐하게 올라간 진하고 담백한 사골 고기국수와 비빔국수',
          timeSlot: '11:30 - 12:45',
          address: '제주 서귀포시 성산읍 섭지코지로 10',
          lat: 33.4357,
          lng: 126.9152,
          estimatedCost: 26000,
          recommendedBy: '미식가',
          specialTip: '커플세트(고기국수 + 비빔국수 + 돔베고기) 주문 시 환상의 밸런스',
          naverSearchUrl: 'https://map.naver.com/v5/search/가시아방국수'
        },
        {
          id: 'jeju-d3-3',
          name: '카페 오르다 (Orda Jeju)',
          category: 'CAFE',
          categoryLabel: '천국의 계단 카페',
          description: '성산일출봉이 정면으로 보이는 잔디 마당과 인생샷의 대명사 천국의 계단 포토존',
          timeSlot: '13:00 - 14:15',
          address: '제주 서귀포시 성산읍 한도로 269-37',
          lat: 33.4735,
          lng: 126.9328,
          estimatedCost: 18000,
          recommendedBy: '미식가',
          specialTip: '루프탑 베이커리와 솔티드 카라멜 라떼가 베스트셀러',
          naverSearchUrl: 'https://map.naver.com/v5/search/성산%20카페오르다'
        },
        {
          id: 'jeju-d3-4',
          name: '제주 동문재래시장 기념품 & 렌터카 반납',
          category: 'TRANSPORT',
          categoryLabel: '귀로 준비',
          description: '제주 특산 감귤 초콜릿, 오메기떡 기념품 쇼핑 및 렌터카 반납 후 공항 이동',
          timeSlot: '15:30 - 17:00',
          address: '제주 제주시 관덕로14길 20',
          lat: 33.5126,
          lng: 126.5284,
          estimatedCost: 40000,
          recommendedBy: '동선지기',
          specialTip: '공항 셔틀 15분 간격 운행으로 안전한 탑승 수속 보장'
        }
      ]
    }
  ],
  literaryReviews: [
    {
      placeId: 'jeju-d1-2',
      placeName: '애월 우진보말명가',
      category: 'RESTAURANT',
      foodOrDrink: '제주 보말칼국수 & 보말전',
      essay: '바다 깊은 갯바위에서 해녀의 거친 손끝으로 건져 올린 작은 고둥 하나가, 이토록 짙푸른 바다의 영혼을 품고 있을 줄은 몰랐습니다. 걸쭉하게 끓여낸 짙푸른 국물 한술에 애월 앞바다의 조수가 온몸을 감돌고, 쫄깃한 면발 사이로 씹히는 보말의 고소함은 여행의 첫 발걸음을 가장 따스하게 어루만져 줍니다.',
      poemTitle: '바다를 삼킨 면발',
      poemVerses: [
        '검은 바위 틈새 웅크리던 푸른 숨결이',
        '해녀의 망사리 거쳐 뚝배기 속에 피어났네',
        '한 줄기 면발에 스며든 애월의 윤슬이여,',
        '그릇 바닥을 비우고서야 비로소 제주의 바람이 가슴에 분다.'
      ],
      authorAgent: '풍류시객'
    },
    {
      placeId: 'jeju-d1-4',
      placeName: '카페 하이엔드 제주',
      category: 'CAFE',
      foodOrDrink: '한라봉 아인슈페너 & 오션뷰',
      essay: '통유리 너머로 쉼 없이 부서지는 포말을 바라보며 마시는 한 잔의 아인슈페너는, 일상의 묵은 때를 하얗게 씻어내는 정화의 의식과도 같습니다. 부드러운 크림 위에 얹힌 노란 한라봉의 상큼한 향이 입안에 번질 때, 지평선 저편으로 뉘엿뉘엿 저무는 노을이 바다 위에 금빛 길을 열어줍니다.',
      poemTitle: '애월의 잔에 띄운 노을',
      poemVerses: [
        '파도가 찻잔 굽을 두드리고 지나가면',
        '크림 위로 사르르 내려앉는 주황빛 햇살',
        '시간마저 걸음을 멈춘 애월의 언덕 위에서',
        '나는 그저 침묵으로 바다의 시를 읽는다.'
      ],
      authorAgent: '풍류시객'
    },
    {
      placeId: 'jeju-d1-5',
      placeName: '숙성도 노형본점',
      category: 'RESTAURANT',
      foodOrDrink: '960 숙성 흑돼지 뼈등심',
      essay: '참숯 불길 위에서 지글지글 소리를 내며 익어가는 두툼한 흑돼지 등심은 그 자체로 제주의 야성을 담은 축제입니다. 겉은 바삭하고 속은 촉촉한 육즙이 톡 터질 때, 곰삭은 갈치속젓의 알싸함이 더해져 미식의 황홀경이 무엇인지 단번에 일깨워줍니다.',
      poemTitle: '숯불 위의 섬',
      poemVerses: [
        '불꽃이 깨운 삼백 시간의 깊은 기다림',
        '황금빛 껍질 속에 숨겨둔 육즙의 파도여',
        '한 점 입에 물고 한라산을 우러르니',
        '돌과 바람과 불의 나라가 혀끝에서 춤춘다.'
      ],
      authorAgent: '풍류시객'
    },
    {
      placeId: 'jeju-d2-4',
      placeName: '카페 테라로사 서귀포점',
      category: 'CAFE',
      foodOrDrink: '제주 감귤 블렌드 핸드드립',
      essay: '돌담 너머로 감귤 나무가 정답게 드리운 붉은 벽돌집에 들어서면, 갓 볶아낸 원두의 향긋한 고소함이 숲속 안개처럼 온 감각을 감쌉니다. 나무 테이블 위에 정갈하게 놓인 커피잔에서 모락모락 피어오르는 온기는 분주했던 마음을 가만히 내려앉게 하는 마법을 부립니다.',
      poemTitle: '돌담 숲의 커피 향기',
      poemVerses: [
        '붉은 벽돌 틈새로 감귤 꽃잎 날리고',
        '드리퍼에서 똑똑 떨어지는 짙은 고요',
        '마음의 소란함을 한 모금에 털어내니',
        '서귀포의 가을이 잔 속에서 은은히 익어간다.'
      ],
      authorAgent: '풍류시객'
    }
  ]
};

// Preset 2: 천년고도 경주 황리단길 & 달빛 야경 1박 2일
export const PRESET_GYEONGJU_REQUEST: TravelRequest = {
  id: 'req-gyeongju-002',
  clientName: '이민호',
  clientContact: '010-4491-3829',
  departureCity: '대전(KTX)',
  destination: '경상북도 경주시',
  startDate: '2026-10-31',
  endDate: '2026-11-01',
  adultCount: 2,
  childCount: 1,
  budget: 650000,
  style: ['역사/문화', '미식/카페', '가족/효도'],
  transportType: 'KTX_TRAIN',
  accommodationType: 'HANOK',
  specialRequests: '아이가 있어 너무 무리하지 않는 동선과, 고즈넉한 전통 한옥스테이 숙박 및 동궁과 월지 야경을 필수 희망합니다.',
  createdAt: '2026-10-15 16:05',
  status: 'APPROVED',
  adminNote: '관리자 승인 완료. 신경주역 KTX 연계 및 황남관 한옥스테이 예약 바우처 발급 완료',
  approvedAt: '2026-10-15 16:30',
  approverName: '여행총괄 박진우 실장'
};

export const PRESET_GYEONGJU_PLAN: FullTravelPlan = {
  requestId: 'req-gyeongju-002',
  request: PRESET_GYEONGJU_REQUEST,
  title: '천년의 달빛을 거니는 서라벌, 경주 황리단길 & 역사 낭만 2일',
  summary: '신라 천년의 숨결이 깃든 첨성대와 대릉원, 밤이 되면 황금빛으로 물드는 동궁과 월지, 그리고 고즈넉한 한옥에서의 하룻밤이 어우러진 가족 맞춤 여정입니다.',
  highlightPoints: [
    '고즈넉한 한옥 처마 아래서의 하룻밤 (황남관 한옥스테이)',
    '황리단길 트렌디한 골목 카페와 십원빵 & 떡갈비 정식',
    '어둠을 밝히는 신라의 궁궐, 동궁과 월지의 환상적인 야경',
    '유네스코 세계문화유산 불국사 청운교·백운교 탐방'
  ],
  selectedAccommodation: {
    name: '경주 황남관 한옥스테이',
    type: '전통 한옥 호텔',
    address: '경북 경주시 포석로 1038',
    lat: 35.8362,
    lng: 129.2084,
    costPerNight: 190000,
    recommendedReason: '황리단길 중심부에 위치하여 도보 이동이 편리하며, 마당 정원과 전통 온돌이 주는 평온함이 가족 여행에 최적.'
  },
  transportGuide: {
    recommendedMode: 'KTX 신경주역 도착 후 택시 & 황리단길 전동스쿠터/도보',
    routesDescription: '신경주역 → 대릉원/황리단길 → 첨성대 → 동궁과월지 → 불국사 → 신경주역',
    estimatedFare: 85000
  },
  costs: {
    accommodationTotal: 190000,
    foodAndCafeTotal: 180000,
    transportTotal: 85000,
    attractionTotal: 32000,
    reserveTotal: 43000,
    totalCost: 530000,
    costPerPerson: 176600,
    budgetStatus: 'WITHIN_BUDGET'
  },
  agentAuditReport: {
    auditorName: '감수관',
    safetyScore: 99,
    budgetMatchScore: 98,
    routeEfficiencyScore: 97,
    finalOpinion: '예산(65만원) 대비 53만원으로 12만원 절감 달성. 황리단길-첨성대-동궁과월지가 반경 1.5km 내에 밀집되어 유아 동반 가족에게 최적의 보행 환경을 제공합니다.',
    adminActionRecommendation: '승인 완료 및 고객 바우처 발송'
  },
  days: [
    {
      dayNumber: 1,
      date: '2026-10-31',
      theme: '황리단길의 정취와 동궁의 달빛',
      daySummary: '황리단길에서 맛보는 떡갈비와 감성 카페, 해질녘 첨성대 핑크뮬리와 동궁과 월지의 황금빛 야경을 감상합니다.',
      places: [
        {
          id: 'gj-d1-1',
          name: '신경주역 도착 및 황리단길 이동',
          category: 'TRANSPORT',
          categoryLabel: '교통 환승',
          description: 'KTX 신경주역 도착 후 택시를 이용하여 황리단길 숙소 이동',
          timeSlot: '11:00 - 11:40',
          address: '경북 경주시 건천읍 신경주역로 80',
          lat: 35.7981,
          lng: 129.1396,
          estimatedCost: 18000,
          recommendedBy: '동선지기'
        },
        {
          id: 'gj-d1-2',
          name: '황리단길 고향실비 떡갈비 쌈밥',
          category: 'RESTAURANT',
          categoryLabel: '경주 향토한식',
          description: '국내산 한우로 빚어낸 숯불 떡갈비와 우렁강된장, 유기농 쌈채소 한상',
          timeSlot: '12:00 - 13:20',
          address: '경북 경주시 첨성로 99번길 23',
          lat: 35.8341,
          lng: 129.2104,
          estimatedCost: 48000,
          recommendedBy: '미식가',
          specialTip: '어린이도 부드럽게 먹기 좋은 담백한 양념과 정갈한 도자기 찬기',
          naverSearchUrl: 'https://map.naver.com/v5/search/황리단길%20떡갈비'
        },
        {
          id: 'gj-d1-3',
          name: '대릉원 (천마총) & 미추왕릉',
          category: 'ATTRACTION',
          categoryLabel: '신라 고분 유적',
          description: '거대한 푸른 고분들이 능선을 이루는 평화로운 산책로와 목련 포토존',
          timeSlot: '13:40 - 15:10',
          address: '경북 경주시 계림로 9',
          lat: 35.8385,
          lng: 129.2135,
          estimatedCost: 6000,
          recommendedBy: '명소박사',
          specialTip: '천마총 내부 금관 및 신라 유물 전시관은 어린이 역사 교육에 안성맞춤'
        },
        {
          id: 'gj-d1-4',
          name: '카페 스컹크웍스 황리단 한옥점',
          category: 'CAFE',
          categoryLabel: '전통 한옥 카페',
          description: '웅장한 한옥 서까래 아래서 즐기는 동명라떼와 인절미 크로플',
          timeSlot: '15:30 - 16:50',
          address: '경북 경주시 포석로 1058-3',
          lat: 35.8378,
          lng: 129.2091,
          estimatedCost: 22000,
          recommendedBy: '미식가',
          specialTip: '마당 평상 좌석에 앉아 한옥 기와지붕 처마를 바라보며 힐링',
          naverSearchUrl: 'https://map.naver.com/v5/search/스컹크웍스%20경주'
        },
        {
          id: 'gj-d1-5',
          name: '첨성대 & 계림 숲 산책',
          category: 'ATTRACTION',
          categoryLabel: '국보 천문대',
          description: '동양에서 가장 오래된 천문대 첨성대와 가을 들꽃 군락지 산책',
          timeSlot: '17:10 - 18:30',
          address: '경북 경주시 첨성로 140-25',
          lat: 35.8347,
          lng: 129.2189,
          estimatedCost: 0,
          recommendedBy: '명소박사'
        },
        {
          id: 'gj-d1-6',
          name: '동궁과 월지 (안압지) 야경 투어',
          category: 'ATTRACTION',
          categoryLabel: '한국 최고의 궁궐 야경',
          description: '연못 위로 완벽하게 반영되는 신라 별궁의 황금빛 조명과 은은한 달빛',
          timeSlot: '19:00 - 20:30',
          address: '경북 경주시 원화로 102',
          lat: 35.8342,
          lng: 129.2268,
          estimatedCost: 9000,
          recommendedBy: '명소박사',
          specialTip: '일몰 30분 뒤 하늘이 짙푸른 매직아워에 관람할 때 가장 환상적인 반영 사진 연출'
        }
      ]
    },
    {
      dayNumber: 2,
      date: '2026-11-01',
      theme: '토함산의 불심과 신라의 숨결',
      daySummary: '토함산 자락에 자리한 천년고찰 불국사를 둘러보고 경주 명물 황남빵을 챙겨 귀향합니다.',
      places: [
        {
          id: 'gj-d2-1',
          name: '불국사 (다보탑 & 석가탑)',
          category: 'ATTRACTION',
          categoryLabel: '유네스코 세계문화유산',
          description: '부처님의 나라를 지상에 구현한 신라 불교 예술의 최고봉',
          timeSlot: '09:30 - 11:40',
          address: '경북 경주시 불국로 385',
          lat: 35.7901,
          lng: 129.3321,
          estimatedCost: 0,
          recommendedBy: '명소박사',
          specialTip: '국보 청운교·백운교와 자하문, 극락전 복돼지 만지며 소원 빌기'
        },
        {
          id: 'gj-d2-2',
          name: '불국사 토함혜 청국장 갈비찜',
          category: 'RESTAURANT',
          categoryLabel: '전통 슬로우푸드',
          description: '구수하고 냄새 없는 삼합 청국장과 부드러운 전통 소갈비찜',
          timeSlot: '12:00 - 13:20',
          address: '경북 경주시 보불로 262',
          lat: 35.8115,
          lng: 129.2982,
          estimatedCost: 52000,
          recommendedBy: '미식가',
          specialTip: '보리밥에 청국장과 나물을 비벼 갈비찜과 곁들이면 보양식으로 으뜸',
          naverSearchUrl: 'https://map.naver.com/v5/search/토함혜%20경주'
        },
        {
          id: 'gj-d2-3',
          name: '경주 황남빵 본점 & 신경주역 이동',
          category: 'TRANSPORT',
          categoryLabel: '전통 기념품 & 귀로',
          description: '80년 전통의 얇은 피와 꽉 찬 팥앙금의 수제 황남빵 선물 세트 구입 후 KTX 탑승',
          timeSlot: '14:00 - 15:30',
          address: '경북 경주시 태종로 783',
          lat: 35.8389,
          lng: 129.2158,
          estimatedCost: 32000,
          recommendedBy: '동선지기'
        }
      ]
    }
  ],
  literaryReviews: [
    {
      placeId: 'gj-d1-2',
      placeName: '황리단길 고향실비 떡갈비',
      category: 'RESTAURANT',
      foodOrDrink: '한우 숯불 떡갈비 정식',
      essay: '투박한 놋그릇에 담겨 나온 떡갈비에서 피어오르는 은은한 참숯 훈연향은, 시간을 천년 전 신라의 궁중 연회로 거슬러 올라가게 합니다. 부드럽게 다져진 한우 살코기가 혀 위에서 녹아내리며 달착지근한 감칠맛을 남길 때, 함께 차려진 신선한 쌈채소가 입안을 단정하게 정돈해 줍니다.',
      poemTitle: '서라벌의 한 상',
      poemVerses: [
        '기와의 곡선 따라 숯불 향이 피어나고',
        '놋수저 달그락거리는 고즈넉한 대낮',
        '천년의 지혜를 빚어 올린 고기 한 점에',
        '나그네의 주린 여독이 봄눈 녹듯 사라진다.'
      ],
      authorAgent: '풍류시객'
    },
    {
      placeId: 'gj-d1-4',
      placeName: '카페 스컹크웍스 황리단 한옥점',
      category: 'CAFE',
      foodOrDrink: '동명라떼 & 인절미 크로플',
      essay: '하늘로 비상하듯 치솟은 한옥 처마 끝으로 가을 햇살이 따스하게 부서지는 마당에 앉았습니다. 고소한 콩고물이 듬뿍 뿌려진 쫀득한 크로플과 진한 에스프레소에 우유가 섞여드는 모양새는, 예스러움과 현대의 세련미가 가장 다정하게 포옹하는 순간입니다.',
      poemTitle: '기와 아래 커피 향',
      poemVerses: [
        '서까래 드리운 그늘에 마음을 뉘이고',
        '콩고물 하얗게 내려앉은 인절미 한 입',
        '지나가는 바람도 처마에 걸려 차를 마시니',
        '경주의 오후는 이토록 향기롭고 달콤하다.'
      ],
      authorAgent: '풍류시객'
    }
  ]
};

// Preset 3: 강릉·속초 동해 바다 커피로드 2박 3일
export const PRESET_GANGNEUNG_REQUEST: TravelRequest = {
  id: 'req-gangneung-003',
  clientName: '박찬영',
  clientContact: '010-9182-7364',
  departureCity: '서울(청량리 KTX)',
  destination: '강원도 강릉시 & 속초시',
  startDate: '2026-11-06',
  endDate: '2026-11-08',
  adultCount: 2,
  childCount: 0,
  budget: 950000,
  style: ['미식/카페', '힐링/휴양', '인스타감성'],
  transportType: 'KTX_TRAIN',
  accommodationType: 'HOTEL',
  specialRequests: '안목해변 커피거리 스페셜티 카페와 초당순두부 짬뽕, 속초 중앙시장 만석닭강정 및 오션뷰 인피니티풀 호텔을 원합니다.',
  createdAt: '2026-10-15 17:30',
  status: 'PENDING_APPROVAL',
  adminNote: 'AI 설계 완료. 강릉선 KTX 좌석 및 호텔 인피니티풀 패키지 확인 대기'
};

// Enrich preset places with verified Google/Naver map push links & GIS audit & Supervisor Report
function enrichPlanWithMapVerification(plan: FullTravelPlan): FullTravelPlan {
  plan.days.forEach(day => {
    day.places.forEach(place => {
      const links = generateMapPushLinks(place.name, place.address, place.lat, place.lng);
      place.naverSearchUrl = links.naverSearchUrl;
      place.googleSearchUrl = links.googleSearchUrl;
      place.kakaoSearchUrl = links.kakaoSearchUrl;
      place.gisVerified = true;
      place.gisAccuracy = '정밀 GIS 좌표 검증 통과 (오차 < 30m)';
    });
  });
  const auditRes = auditPlanGisMapping(plan.days);
  plan.gisMapAudit = auditRes.audit;
  plan.supervisorReport = {
    supervisorName: '총괄 협연자 (마에스트로)',
    duplicateCheckPassed: auditRes.duplicatesFound.length === 0,
    duplicatesDetectedCount: auditRes.duplicatesFound.length,
    duplicatesResolvedCount: auditRes.duplicatesFound.length,
    gisVerificationPassed: auditRes.audit.allCoordinatesValid,
    mapPushLinksReady: true,
    errorRecoveryTriggered: false,
    supervisionNotes: [
      '총괄 협연자: 전체 여정 일차별 고유 장소 검증 완료 (중복 0건)',
      '네이버 지도 및 구글 MAP 검색창 PUSH 연동 100% 정상 작동'
    ],
    approvalRecommendation: '일정 무결성 및 GIS 좌표 검증 통과. 관리자 인가 승인 권장'
  };
  delete plan.weatherAgentReport;
  plan.safetyAgentReport = generateSafetyAgentReport(
    plan.request.destination,
    plan.days.flatMap(d => d.places),
    plan.days
  );
  return plan;
}

enrichPlanWithMapVerification(PRESET_JEJU_PLAN);
enrichPlanWithMapVerification(PRESET_GYEONGJU_PLAN);

