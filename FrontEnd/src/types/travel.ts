export type TravelStatus = 
  | 'ANALYZING'         // AI 멀티에이전트 작업 중
  | 'PENDING_APPROVAL'  // AI 설계 완료, 관리자 인가(승인) 대기 중
  | 'APPROVED'          // 관리자 최종 승인 완료
  | 'REVISING'          // 관리자 수정 요청에 따른 AI 재설계 중
  | 'REJECTED';         // 관리자 반려

export type PlaceCategory = 'ATTRACTION' | 'RESTAURANT' | 'CAFE' | 'ACCOMMODATION' | 'TRANSPORT';

export interface TravelPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  categoryLabel: string;
  description: string;
  timeSlot: string;     // 예: "10:00 - 11:30"
  address: string;
  lat: number;
  lng: number;
  estimatedCost: number;// 1인 또는 팀 단위 비용(원)
  recommendedBy: string;// 추천한 에이전트 이름
  specialTip?: string;
  naverSearchUrl?: string;
  tag?: string;
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  theme: string;
  places: TravelPlace[];
  daySummary: string;
}

export interface CostBreakdown {
  accommodationTotal: number;
  foodAndCafeTotal: number;
  transportTotal: number;
  attractionTotal: number;
  reserveTotal: number;
  totalCost: number;
  costPerPerson: number;
  budgetStatus: 'WITHIN_BUDGET' | 'NEEDS_ADJUSTMENT' | 'OPTIMAL';
}

export interface LiteraryReview {
  placeId: string;
  placeName: string;
  category: 'RESTAURANT' | 'CAFE';
  foodOrDrink: string;
  essay: string; // 3~4문장의 감성 수필
  poemTitle: string;
  poemVerses: string[]; // 시 한 수 (4~6행)
  authorAgent: string; // '풍류시객'
}

export interface TravelRequest {
  id: string;
  clientName: string;
  clientContact: string;
  departureCity: string;
  destination: string;
  startDate: string;
  endDate: string;
  adultCount: number;
  childCount: number;
  budget: number; // 예산 (원)
  style: string[]; // '힐링/휴양', '미식/카페', '역사/문화', '액티비티', '가족/효도', '인스타감성' 등
  transportType: 'KTX_TRAIN' | 'RENTAL_CAR' | 'OWN_CAR' | 'FLIGHT' | 'PUBLIC_TRANSIT';
  accommodationType: 'HOTEL' | 'HANOK' | 'RESORT' | 'PENSION' | 'POOL_VILLA';
  specialRequests: string;
  createdAt: string;
  status: TravelStatus;
  adminNote?: string;
  approvedAt?: string;
  approverName?: string;
}

export interface FullTravelPlan {
  requestId: string;
  request: TravelRequest;
  title: string;
  summary: string;
  highlightPoints: string[];
  days: DayItinerary[];
  costs: CostBreakdown;
  selectedAccommodation: {
    name: string;
    type: string;
    address: string;
    lat: number;
    lng: number;
    costPerNight: number;
    recommendedReason: string;
  };
  transportGuide: {
    recommendedMode: string;
    routesDescription: string;
    estimatedFare: number;
  };
  agentAuditReport: {
    auditorName: string; // '감수관'
    safetyScore: number; // 0 - 100
    budgetMatchScore: number; // 0 - 100
    routeEfficiencyScore: number; // 0 - 100
    finalOpinion: string;
    adminActionRecommendation: string;
  };
  literaryReviews?: LiteraryReview[];
}

export interface AgentLog {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  avatarIcon: string;
  avatarColor: string;
  message: string;
  detail?: string;
  timestamp: string;
  status: 'PENDING' | 'WORKING' | 'DONE';
}

export interface AgencyStats {
  totalRequests: number;
  autoDesignedCount: number;
  approvedCount: number;
  revisingCount: number;
  approvalRate: number; // %
  totalEstimatedRevenue: number;
  topDestinations: { name: string; count: number; percentage: number }[];
  averageDesignTimeSeconds: number;
}
