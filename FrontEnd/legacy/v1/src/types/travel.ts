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
  googleSearchUrl?: string;
  kakaoSearchUrl?: string;
  gisVerified?: boolean;
  gisAccuracy?: string;
  tag?: string;
  safetyNotice?: string; // 안전관리 에이전트 맞춤 안전 수칙
  weatherNotice?: string; // 날씨관리 에이전트 맞춤 기상 팁
}

export interface GisMapAudit {
  totalPlacesCount: number;
  verifiedCount: number;
  integrityScore: number; // 0~100 (%)
  allCoordinatesValid: boolean;
  statusMessage: string;
  verifiedAt: string;
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

export interface AgentSupervisorReport {
  supervisorName: string; // '총괄 협연자 (마에스트로)'
  duplicateCheckPassed: boolean;
  duplicatesDetectedCount: number;
  duplicatesResolvedCount: number;
  gisVerificationPassed: boolean;
  mapPushLinksReady: boolean;
  errorRecoveryTriggered: boolean;
  supervisionNotes: string[];
  approvalRecommendation: string;
}

// ---------------- NEW: 날씨관리 에이전트 & 안전관리 에이전트 정밀 데이터 구조 ----------------
export interface RealtimeObservation {
  recordedAt: string;
  currentTemp: number; // ℃
  feelsLikeTemp: number; // ℃
  humidity: number; // %
  windSpeed: number; // m/s
  windDirection: string;
  airQuality: 'GOOD' | 'NORMAL' | 'BAD';
  pm10: number; // ㎍/㎥
  pm25: number; // ㎍/㎥
  uvIndex: number;
  currentCondition: string;
  currentConditionIcon: string;
}

export interface FusedDailyWeather {
  date: string;
  dayNumber: number;
  dayOfWeek: string;
  condition: string;
  iconName: string;
  modelForecastTemp: { min: number; max: number; avg: number };
  agentAdjustment: number;
  finalPredictedTemp: { min: number; max: number; avg: number; feelsLike: number };
  rainProbability: number;
  windSpeed: number;
  uvLevel: string;
  agentAdvice: string;
}

export interface WeatherAgentReport {
  agentName: string; // '기상·기후 관리관 (날씨지기)'
  destination: string;
  observationTime: string;
  realtimeObservation: RealtimeObservation;
  historical10YrComparison: {
    baselineAvgTemp: number;
    trendDeviation: number; // +1.1℃ 등
    climateCommentary: string;
  };
  overallVerdict: string;
  activeAlerts: string[];
  fusedDailyList: FusedDailyWeather[];
  recommendedClothing: string[];
  smartPackingItems: {
    category: string;
    item: string;
    reason: string;
    essential: boolean;
  }[];
}

export interface EmergencyContact {
  type: 'FIRE_119' | 'POLICE_112' | 'COAST_GUARD' | 'HOSPITAL' | 'CONSULATE' | 'AGENCY_HOTLINE';
  name: string;
  phone: string;
  address?: string;
  availableHours: string;
  note: string;
}

export interface RecentIncidentWarning {
  category: '해양/수상' | '산악/낙석' | '교통/렌터카' | '치안/보행' | '기상/침수' | '건강/위생';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  incidentBackground: string;
  preventionGuideline: string;
}

export interface PlaceSpecificSafety {
  placeName: string;
  riskPoint: string;
  actionProtocol: string;
}

export interface SafetyAgentReport {
  agentName: string; // '안전·위기관리 총괄관 (안전지킴이)'
  safetyGrade: 'EXCELLENT' | 'HIGH' | 'ATTENTION';
  safetyScore: number;
  safetyGradeLabel: string;
  assessmentSummary: string;
  recentIncidentsCoverage: RecentIncidentWarning[];
  placeSafetyGuides: PlaceSpecificSafety[];
  emergencyContacts: EmergencyContact[];
  sosActionProtocols: {
    situation: string;
    actionSteps: string[];
  }[];
  insurancePolicySummary: {
    provider: string;
    coverageLimit: string;
    directAssistancePhone: string;
    claimGuide: string;
  };
  certifiedSafeTravelBadge: boolean;
  auditSignOff: string;
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
  supervisorReport?: AgentSupervisorReport;
  gisMapAudit?: GisMapAudit;
  literaryReviews?: LiteraryReview[];
  weatherAgentReport?: WeatherAgentReport;
  safetyAgentReport?: SafetyAgentReport;
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
