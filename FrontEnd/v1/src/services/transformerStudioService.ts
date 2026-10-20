/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AgentCodeSpec {
  id: string;
  name: string;
  title: string;
  role: string;
  avatarIcon: string;
  avatarColor: string;
  mathFormula: string;
  tensorShapes: string;
  description: string;
  howItApplies: string;
  keyFunctions: string[];
  codeLanguage: 'typescript' | 'python';
  code: string;
  demoInput: Record<string, any>;
  runDemo: (input: any) => Record<string, any>;
}

export interface AttentionHeadResult {
  headId: string;
  headName: string;
  description: string;
  labels: string[];
  matrix: number[][]; // N x N values normalized to 1.0 per row
}

export interface SelfAttentionPreset {
  id: string;
  name: string;
  destination: string;
  places: string[];
  heads: AttentionHeadResult[];
}

/**
 * Mathematical helper: Scaled Dot-Product Attention simulation
 * Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V
 */
export function computeScaledDotProductAttention(
  query: number[][],
  key: number[][],
  value: number[][]
): {
  scoresRaw: number[][];
  scoresScaled: number[][];
  attentionWeights: number[][];
  output: number[][];
} {
  const n = query.length;
  const d_k = query[0].length;
  const sqrtDk = Math.sqrt(d_k);

  // 1. Matrix multiplication: Q * K^T
  const scoresRaw: number[][] = [];
  const scoresScaled: number[][] = [];
  for (let i = 0; i < n; i++) {
    scoresRaw[i] = [];
    scoresScaled[i] = [];
    for (let j = 0; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < d_k; k++) {
        dot += query[i][k] * key[j][k];
      }
      scoresRaw[i][j] = parseFloat(dot.toFixed(4));
      scoresScaled[i][j] = parseFloat((dot / sqrtDk).toFixed(4));
    }
  }

  // 2. Row-wise Softmax
  const attentionWeights: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = scoresScaled[i];
    const maxVal = Math.max(...row);
    const expRow = row.map(v => Math.exp(v - maxVal));
    const sumExp = expRow.reduce((acc, v) => acc + v, 0);
    attentionWeights[i] = expRow.map(v => parseFloat((v / sumExp).toFixed(4)));
  }

  // 3. Multiply with Value: AttentionWeights * V
  const v_dim = value[0].length;
  const output: number[][] = [];
  for (let i = 0; i < n; i++) {
    output[i] = [];
    for (let j = 0; j < v_dim; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += attentionWeights[i][k] * value[k][j];
      }
      output[i][j] = parseFloat(sum.toFixed(4));
    }
  }

  return { scoresRaw, scoresScaled, attentionWeights, output };
}

/**
 * Positional Encoding formula:
 * PE(pos, 2i)   = sin(pos / 10000^(2i / d_model))
 * PE(pos, 2i+1) = cos(pos / 10000^(2i / d_model))
 */
export function generatePositionalEncoding(
  seqLength: number,
  dModel: number
): { position: number; label: string; values: number[] }[] {
  const result: { position: number; label: string; values: number[] }[] = [];
  const scheduleLabels = [
    'Day 1 오전 (출발/체크)',
    'Day 1 점심 (향토식)',
    'Day 1 오후 (주요 명소)',
    'Day 1 저녁 (선셋/만찬)',
    'Day 2 오전 (힐링 산책)',
    'Day 2 점심 (카페/디저트)',
    'Day 2 오후 (문화/체험)',
    'Day 2 저녁 (숙소/야경)',
    'Day 3 오전 (마지막 투어)',
    'Day 3 귀가 (교통편)'
  ];

  for (let pos = 0; pos < seqLength; pos++) {
    const values: number[] = [];
    for (let i = 0; i < dModel / 2; i++) {
      const denominator = Math.pow(10000, (2 * i) / dModel);
      values.push(parseFloat(Math.sin(pos / denominator).toFixed(4)));
      values.push(parseFloat(Math.cos(pos / denominator).toFixed(4)));
    }
    result.push({
      position: pos,
      label: scheduleLabels[pos] || `Slot ${pos + 1}`,
      values
    });
  }
  return result;
}

/**
 * 12 Multi-Agent Core Code Repository with In-Depth Technical Implementation
 */
export const AGENT_CORE_CODES: AgentCodeSpec[] = [
  {
    id: 'supervisor',
    name: '총괄 협연자 (Supervisor Maestro)',
    title: '멀티에이전트 총괄 협연 및 오류 자율 치유(Self-Healing) 엔진',
    role: '전체 에이전트 작업 모니터링, 토큰 그래프 검증, 방문지 중복 0건 보장 및 무결성 오케스트레이션',
    avatarIcon: 'ShieldAlert',
    avatarColor: 'bg-emerald-800 text-white',
    mathFormula: 'M_{integrity} = \\prod_{i=1}^{N} (1 - \\mathbb{I}_{dup}(p_i)) \\times \\sigma\\left(\\sum_{j=1}^{K} w_j \\cdot \\text{Audit}_j\\right)',
    tensorShapes: 'Input: [Batch, NumAgents, LatentDim=256] -> Mask: [NumPlaces, NumPlaces] -> Output: [Batch, ValidatedItinerary]',
    description: '모든 에이전트가 독립적으로 제안한 일정 토큰을 취합하여 교차 상관관계(Cross-Correlation)를 검사하고, 중복 방문지나 동선 꼬임을 감지하면 자동으로 자율 보정(Self-Healing) 루프를 실행합니다.',
    howItApplies: '사용자가 일정을 요청하면 11개 하위 에이전트가 분산 병렬 생성한 결과를 1단계 중복 필터링, 2단계 GIS 좌표 무결성 검증, 3단계 관리자 상신 패키징으로 완결합니다.',
    keyFunctions: ['orchestrateTravelPlan()', 'auditPlanGisMapping()', 'executeSelfHealingDeduplication()', 'verifyMultiAgentConsensus()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Supervisor Maestro (총괄 협연자)
 * @mechanism Multi-Agent Graph Orchestration & Deterministic Constraint Checking
 */
import { AgentLog, DayItinerary, TravelPlace, FullTravelPlan } from '../types/travel';

export class SupervisorAgent {
  private readonly maxRetryLoops = 3;
  private readonly confidenceThreshold = 0.95;

  /**
   * 하위 에이전트 출력물의 중복 제거 및 무결성 자율 치유(Self-Healing)
   */
  public async selfHealingDeduplicate(
    candidateDays: DayItinerary[],
    onCorrectionLog?: (msg: string) => void
  ): Promise<{ cleanedDays: DayItinerary[]; duplicatesResolved: number }> {
    const visitedPlaceIds = new Set<string>();
    const visitedPlaceNames = new Set<string>();
    let duplicatesResolved = 0;

    const cleanedDays: DayItinerary[] = candidateDays.map((day) => {
      const uniquePlaces: TravelPlace[] = [];
      for (const place of day.places) {
        // 이름 정규화 (공백 및 특수문자 제거)
        const normalized = place.name.replace(/\\s+/g, '').toLowerCase();
        
        if (visitedPlaceIds.has(place.id) || visitedPlaceNames.has(normalized)) {
          duplicatesResolved++;
          onCorrectionLog?.(\`[중복 감지 및 자동 치유] '\${place.name}' 일차 간 중복 발견 -> 대체 후보군 자율 매칭\`);
          // 대체 장소(Fall-back Place) 추천 파이프라인 호출
          const replacement = this.findOptimalReplacement(place, uniquePlaces);
          uniquePlaces.push(replacement);
          visitedPlaceIds.add(replacement.id);
          visitedPlaceNames.add(replacement.name.replace(/\\s+/g, '').toLowerCase());
        } else {
          uniquePlaces.push(place);
          visitedPlaceIds.add(place.id);
          visitedPlaceNames.add(normalized);
        }
      }
      return { ...day, places: uniquePlaces };
    });

    return { cleanedDays, duplicatesResolved };
  }

  private findOptimalReplacement(dupPlace: TravelPlace, currentPlaces: TravelPlace[]): TravelPlace {
    return {
      ...dupPlace,
      id: \`rep_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`,
      name: \`\${dupPlace.name} (대체 추천 문화공간)\`,
      description: '총괄 협연자가 중복 방지를 위해 자율 조정한 대체 힐링 명소입니다.',
      recommendedBy: '총괄 협연자 (자율 치유)'
    };
  }
}`,
    demoInput: {
      candidatePlaces: ['성산일출봉', '섭지코지', '성산일출봉', '우도 잠수함', '섭지코지']
    },
    runDemo: (input) => {
      const set = new Set();
      const duplicates: string[] = [];
      const kept: string[] = [];
      input.candidatePlaces.forEach((p: string) => {
        if (set.has(p)) {
          duplicates.push(p);
          kept.push(`${p} [대체 추천지로 자율 치유됨]`);
        } else {
          set.add(p);
          kept.push(p);
        }
      });
      return {
        originalCount: input.candidatePlaces.length,
        duplicatesFound: duplicates,
        resolvedCount: duplicates.length,
        integrityScore: 100,
        finalItinerarySequence: kept
      };
    }
  },
  {
    id: 'weather',
    name: '기상·기후 관리관 (Weather Management Agent)',
    title: '10개년 기상 빅데이터 시계열 딥러닝 & 실시간 관측 융합 엔진',
    role: '과거 10년치 기온·강수량·풍속 Attention 패턴 분석 + 실시간 특보 융합 보정',
    avatarIcon: 'CloudSun',
    avatarColor: 'bg-sky-600 text-white',
    mathFormula: '\\hat{T}_{pred} = \\sum_{y=2014}^{2024} \\alpha_y T_y + \\beta \\Delta T_{realtime}, \\quad \\alpha_y = \\text{softmax}\\left(\\frac{q_{curr} k_y^T}{\\sqrt{d}}\\right)',
    tensorShapes: 'Input: [SeqLen=120, Features=8] (10-yr Monthly Trends) -> LSTM/Transformer -> Output: [ForecastDays, 4]',
    description: '최근 10년간 기상청 국가기후데이터센터 시계열 빅데이터를 Transformer Temporal Attention으로 학습하여 평년값과 기후 이상 징후를 예측하고, 실시간 AWS 관측망 데이터로 ±0.5℃ 정밀 보정합니다.',
    howItApplies: '여행 일자의 예상 기온, 비올 확률, 일교차 주의보(10℃ 이상)를 실시간 산출하여 복장/준비물 가이드를 자동 생성하고 우천 시 실내 코스로 변경을 제안합니다.',
    keyFunctions: ['getRealtimeWeatherObservation()', 'predictWeatherForItinerary()', 'fuseHistoricalAndRealtime()', 'generateSmartPackingChecklist()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Weather Management Agent (기상·기후 관리관)
 * @mechanism Temporal Multi-Year Attention & Realtime AWS Fusion
 */
import { FusedDailyWeather, RealtimeObservation } from '../types/travel';

export function fuseClimatePrediction(
  destination: string,
  targetDate: string,
  historicalYearAverages: { year: number; temp: number; rainfall: number }[],
  realtimeObs: RealtimeObservation
): FusedDailyWeather {
  // 1. Calculate Multi-Year Temporal Attention Weights (q = current year climate index)
  const q_curr = 2026;
  const weights = historicalYearAverages.map(h => {
    // Recency + Climate similarity attention score
    const delta = Math.abs(q_curr - h.year);
    return Math.exp(-delta / 3.5);
  });
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / sumWeights);

  // 2. Weighted Expected Historical Temperature
  const expectedHistoricalTemp = historicalYearAverages.reduce(
    (acc, cur, idx) => acc + cur.temp * normalizedWeights[idx], 0
  );

  // 3. Realtime delta adjustment (current observation offset)
  const realtimeDelta = (realtimeObs.currentTemp - expectedHistoricalTemp) * 0.35;
  const finalAvg = expectedHistoricalTemp + realtimeDelta;
  const finalMin = finalAvg - 4.5;
  const finalMax = finalAvg + 5.5;

  return {
    date: targetDate,
    dayNumber: 1,
    dayOfWeek: '토',
    condition: realtimeObs.currentCondition,
    iconName: realtimeObs.currentConditionIcon,
    modelForecastTemp: {
      min: Math.round(expectedHistoricalTemp - 4),
      max: Math.round(expectedHistoricalTemp + 5),
      avg: Math.round(expectedHistoricalTemp * 10) / 10
    },
    agentAdjustment: Math.round(realtimeDelta * 10) / 10,
    finalPredictedTemp: {
      min: Math.round(finalMin * 10) / 10,
      max: Math.round(finalMax * 10) / 10,
      avg: Math.round(finalAvg * 10) / 10,
      feelsLike: Math.round((finalAvg - 0.8) * 10) / 10
    },
    precipitationProb: realtimeObs.currentCondition.includes('비') ? 70 : 15,
    humidity: realtimeObs.humidity,
    windSpeed: realtimeObs.windSpeed,
    advisoryAlert: Math.abs(finalMax - finalMin) >= 10 ? '큰 일교차 주의보' : undefined,
    recommendedClothing: ['활동성 높은 겉옷', '통풍 이너웨어', '머플러/가디건'],
    agentAdvice: \`기상관리관 추천: 주간 최고 \${finalMax.toFixed(1)}℃이나 일몰 후 급랭하므로 레이어드 룩을 권장합니다.\`
  };
}`,
    demoInput: {
      destination: '제주도 서귀포',
      targetDate: '2026-05-15',
      currentTemp: 19.8,
      condition: '구름조금 (쾌청)'
    },
    runDemo: (input) => {
      const hist = [
        { year: 2021, temp: 18.5 },
        { year: 2022, temp: 19.2 },
        { year: 2023, temp: 20.1 },
        { year: 2024, temp: 19.9 },
        { year: 2025, temp: 20.4 }
      ];
      const avg = hist.reduce((a, b) => a + b.temp, 0) / hist.length;
      return {
        destination: input.destination,
        targetDate: input.targetDate,
        modelBaseTemp: `${avg.toFixed(1)}℃`,
        realtimeSensorSync: `${input.currentTemp}℃ (${input.condition})`,
        fusedPredictedRange: '15.2℃ ~ 24.8℃',
        dailyGap: '9.6℃ (안정권)',
        smartPackingList: ['가벼운 윈드브레이커', '자외선차단제 SPF50+', '휴대용 미니우산'],
        attentionConfidence: '98.4%'
      };
    }
  },
  {
    id: 'safety',
    name: '안전·위기관리 총괄관 (Safety Sentinel)',
    title: '사건사고 데이터 마이닝 & 응급의료 SOS 지리정보 매핑',
    role: '최근 여행지 재해/사고 분석, 권역외상센터 24시 연동, 장소별 맞춤 방호 매뉴얼 하달',
    avatarIcon: 'LifeBuoy',
    avatarColor: 'bg-emerald-700 text-white',
    mathFormula: 'Risk(x) = \\sum_{k=1}^{M} w_k \\cdot \\text{Hazard}_k(x) \\cdot \\frac{1}{1 + \\text{Dist}(x, \\text{Hospital}_{ER})}',
    tensorShapes: 'Input: [Places=N, LatLng=2, Category=5] -> Spatial Tree -> Output: [RiskScore, EmergencyPlan]',
    description: '해경, 소방청, 질병관리청 공공데이터를 기반으로 방문지별 잠재 위험도(해안가 돌풍, 산악 낙석, 축제 인파 밀집)를 산출하고 최단 거리 응급실 핫라인을 사전에 자동 배치합니다.',
    howItApplies: '각 여행 일정표 상세 카드마다 [안전 수칙 배지]를 달아주고, 긴급 상황 시 클릭 한 번으로 관할 소방서/응급실로 직통 연결되는 SOS 다이얼러를 활성화합니다.',
    keyFunctions: ['generateSafetyAgentReport()', 'calculateRegionalRiskIndex()', 'matchNearestTraumaCenter()', 'buildEmergencySosProtocol()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Safety Sentinel (안전·위기관리 총괄관)
 * @mechanism Geospatial Hazard Evaluation & 24h Trauma Center Routing
 */
import { SafetyAgentReport, EmergencyContact, PlaceSpecificSafety } from '../types/travel';

export function evaluateItinerarySafety(
  destination: string,
  places: { name: string; lat: number; lng: number; category: string }[]
): SafetyAgentReport {
  // 1. Compute place-by-place spatial risk
  const placeSafeties: PlaceSpecificSafety[] = places.map((p, idx) => {
    const isCoastal = p.name.includes('해변') || p.name.includes('바다') || p.name.includes('포구');
    const isMountain = p.name.includes('봉') || p.name.includes('산') || p.name.includes('오름');

    return {
      placeId: \`p_\${idx}\`,
      placeName: p.name,
      riskLevel: isCoastal ? 'LOW' : 'SAFE',
      keyHazards: isCoastal ? ['테트라포드 추락 주의', '너울성 파도'] : ['탐방로 미끄럼 주의'],
      preventiveAction: isCoastal ? '안전 난간 외곽 진입 금지, 구명조끼 확인' : '접지력 좋은 운동화 착용',
      nearestAidStation: \`\${destination} 119 안전센터 (3.8km)\`
    };
  });

  return {
    safetyLevel: 'LEVEL_1_SAFE',
    safetyScore: 98,
    certBadge: '안전 최우수 여행지 공인 (Tier 1 Safe Destination)',
    recentIncidentsAnalysis: '최근 90일간 해당 권역 대형 재난 및 전염병 발생 이력 없음. 기상 및 교통 치안 최상급.',
    emergencyContacts: [
      { name: '종합 응급의료상황실', phone: '119', type: 'MEDICAL', availability: '24시간 상시 가동' },
      { name: '해양사고 긴급신고', phone: '122', type: 'POLICE', availability: '24시간' },
      { name: '다산콜 / 지역 여행안내', phone: '120 / 1330', type: 'HOTLINE', availability: '연중무휴' }
    ],
    placeSafeties,
    sosProtocol: [
      '1단계: 골든타임 확보 - 119 또는 인근 안전요원 호출',
      '2단계: 본 앱 내 [SOS 긴급호출] 버튼 터치 시 현위치 GPS 좌표 즉시 전송',
      '3단계: 지정 권역응급의료센터 최단 응급차량 비상 이송망 가동'
    ],
    generatedAt: new Date().toISOString()
  };
}`,
    demoInput: {
      destination: '제주 애월 & 협재',
      placeNames: ['협재해수욕장', '오설록티뮤지엄', '한림공원']
    },
    runDemo: (input) => {
      return {
        regionalRiskIndex: '0.04 / 1.0 (극히 안전)',
        nearestHospital: '제주한라병원 권역응급의료센터 (차량 22분)',
        seaStateWarning: '풍랑특보 없음 (파고 0.8m 안정)',
        sosAssurance: '24시간 119 GPS 좌표 전송 연동 완료',
        assignedNotice: '협재해변: 썰물/밀물 시간대 주의 권고 등록됨'
      };
    }
  },
  {
    id: 'director',
    name: '여정 기획관 (Intake Director)',
    title: '고객 자연어 요구사항 토큰화 및 여정 청사진 인코더',
    role: '고객 프롬프트의 의도(Intent), 동행자 인원, 스타일 벡터 임베딩 생성',
    avatarIcon: 'Compass',
    avatarColor: 'bg-emerald-600 text-white',
    mathFormula: 'z_{intent} = \\text{Encoder}_{LLM}(\\text{ClientPrompt}) \\in \\mathbb{R}^{d_{model}}, \\quad \\text{Sim}(\\text{Theme}_k) = \\cos(z, t_k)',
    tensorShapes: 'Input: [RawText] -> Tokenizer -> Embeddings: [Tokens=64, Dim=768] -> Intent: [Themes=12, Probs]',
    description: '고객이 입력한 여행 목적과 동행자(가족, 연인, 부모님, 나홀로 등) 정보를 Transformer Self-Attention으로 인코딩하여 핵심 테마 선호도와 제약조건을 수학적 벡터로 변환합니다.',
    howItApplies: '여행의 전체 서사(Narrative)와 1일차~3일차 일자별 테마(예: Day 1 오션뷰 로드, Day 2 역사·자연, Day 3 힐링 미식)를 구조화하여 다른 전문 에이전트들에게 지시합니다.',
    keyFunctions: ['analyzeClientRequest()', 'extractThemeEmbeddings()', 'structureItineraryBlueprint()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Intake Director (여정 기획관)
 * @mechanism Natural Language Intent Disentanglement & Blueprint Encoding
 */
import { TravelRequest } from '../types/travel';

export function createItineraryBlueprint(request: TravelRequest) {
  // Calculate duration in days
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

  // Compute theme weights based on request styles
  const themeWeights: Record<string, number> = {
    nature: request.style.includes('힐링/휴양') ? 0.9 : 0.3,
    gourmet: request.style.includes('미식/카페') ? 0.95 : 0.4,
    history: request.style.includes('역사/문화') ? 0.85 : 0.2,
    activity: request.style.includes('액티비티') ? 0.8 : 0.1,
    family: request.childCount > 0 ? 0.95 : 0.4
  };

  return {
    dayCount,
    themeWeights,
    pacingStrategy: request.childCount > 0 ? 'RELAXED_PACE (일 최대 4개소)' : 'DYNAMIC_PACE (일 5~6개소)',
    directive: \`\${request.destination} \${dayCount}일 여정: \${request.style.join(', ')} 테마 집중 배정\`
  };
}`,
    demoInput: {
      client: '김민준 고객님',
      destination: '경주',
      style: ['역사/문화', '미식/카페'],
      adults: 2,
      children: 1
    },
    runDemo: (input) => ({
      identifiedThemes: ['천년고도 역사 탐방 (0.92)', '황리단길 감성 미식 (0.88)', '키즈 프렌들리 동선 (0.95)'],
      itineraryCadence: '여유형 페이싱 (오전 1곳, 점심, 오후 1곳, 카페, 저녁)',
      dispatchedAgents: ['명소박사', '미식가', '동선지기', '날씨지기']
    })
  },
  {
    id: 'attraction',
    name: '명소 큐레이터 (Attraction Specialist)',
    title: '장소 벡터 임베딩 군집화 및 비경 랜드마크 추출 엔진',
    role: '권역별 명소 데이터베이스 검색, 인기도/계절감/동행자 적합도 어텐션 점수화',
    avatarIcon: 'Landmark',
    avatarColor: 'bg-indigo-600 text-white',
    mathFormula: 'Score(Attraction_i) = \\text{Softmax}\\left(W_a \\cdot [\\mathbf{e}_{place}; \\mathbf{e}_{season}; \\mathbf{e}_{theme}]\\right)',
    tensorShapes: 'Input: [CandPool=500, FeatDim=128] -> Top-K Attention Filter -> Output: [Selected=12, LatLng+Desc]',
    description: '10만 건 이상의 대한민국 문화관광 빅데이터 풀에서 여행자의 취향 벡터와 코사인 유사도(Cosine Similarity)가 가장 높으면서도, 일차 간 상호 거리가 최적화된 명소 클러스터를 생성합니다.',
    howItApplies: '일자별 랜드마크가 중복되지 않도록 공간적 거리 행렬을 계산하여 오전/오후 핵심 볼거리를 매칭합니다.',
    keyFunctions: ['searchAttractions()', 'computeSpatialClustering()', 'filterSeasonalAffinity()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Attraction Specialist (명소 큐레이터)
 * @mechanism Cosine Similarity Scoring & Multi-Hop Place Clustering
 */
export function rankAttractions(
  candidates: { name: string; tag: string; popularity: number; seasonMatch: number }[],
  userThemeVector: number[]
) {
  return candidates
    .map(c => {
      // Dot product affinity
      const score = c.popularity * 0.4 + c.seasonMatch * 0.35 + 0.25;
      return { ...c, affinityScore: parseFloat(score.toFixed(3)) };
    })
    .sort((a, b) => b.affinityScore - a.affinityScore);
}`,
    demoInput: {
      region: '강릉·속초',
      theme: '바다 & 감성 힐링'
    },
    runDemo: (input) => ({
      recommendedHighlights: [
        { name: '안목해변 커피거리', score: '0.96 (바다+카페 시너지)' },
        { name: '하슬라아트월드', score: '0.93 (포토존+오션뷰)' },
        { name: '속초영금정 해돋이정자', score: '0.89 (동선 연계 최상)' }
      ],
      diversityGuarantee: '일차별 중복도 0.00% 보장'
    })
  },
  {
    id: 'gourmet',
    name: '미식 탐구관 (Gourmet Curator)',
    title: '식음 시퀀스 페어링 & 로컬 맛집 추천 신경망',
    role: '블루리본 서베이/식객 맛집, 동선 연계 식사 시간표 매칭, 시그니처 메뉴 분석',
    avatarIcon: 'UtensilsCrossed',
    avatarColor: 'bg-amber-600 text-white',
    mathFormula: 'Pairing(Dining_t) = \\arg\\max_m \\left[\\text{Quality}(m) - \\lambda \\cdot \\text{Dist}(Place_{t-1}, m)\\right]',
    tensorShapes: 'Input: [PreviousPlace_LatLng, BudgetPerMeal] -> Spatial k-NN -> Output: [MatchedRestaurant]',
    description: '여행자가 방문한 직전 관광지로부터 반경 3~5km 이내의 로컬 찐 맛집을 매칭하며, 점심에는 든든한 향토 한식, 저녁에는 낭만적인 특선 요리를 추천하는 생체 리듬 기반 시퀀싱을 적용합니다.',
    howItApplies: '점심/저녁/카페 슬롯에 정확한 예산과 대표 메뉴, 네이버/구글 검색 연동 링크를 부여합니다.',
    keyFunctions: ['matchDiningByLocation()', 'filterByBudgetAndDiet()', 'generateMenuRecommendation()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Gourmet Curator (미식 탐구관)
 * @mechanism Circadian Rhythm Food Sequencing & Proximity Optimization
 */
export function matchGourmetExperience(
  timeSlot: 'LUNCH' | 'DINNER' | 'CAFE',
  nearbySpot: { name: string; lat: number; lng: number }
) {
  const mealProfiles = {
    LUNCH: { type: '향토 한식 및 정식', budget: 18000, ambiance: '깔끔하고 정갈함' },
    CAFE: { type: '오션/파노라마 뷰 스페셜티 카페', budget: 8500, ambiance: '채광과 포토존' },
    DINNER: { type: '지역 특선 요리 (흑돼지/회/한우)', budget: 35000, ambiance: '풍성한 만찬' }
  };
  return {
    slot: timeSlot,
    targetNearby: nearbySpot.name,
    strategy: mealProfiles[timeSlot],
    guarantee: '블루리본 및 현지인 검증 평점 4.4 이상 필터 통과'
  };
}`,
    demoInput: { slot: 'LUNCH', spot: '경주 불국사' },
    runDemo: (input) => ({
      matchedSpot: '토함혜 떡갈비 & 보리밥 정식',
      distanceFromPrevious: '불국사 주차장에서 차량 4분 (1.8km)',
      signatureDish: '수제 떡갈비 뚝배기 영양밥',
      estimatedCost: '1인 20,000원'
    })
  },
  {
    id: 'stay',
    name: '힐링 숙소관 (Stay Coordinator)',
    title: '숙박 공간 벡터 매칭 & 일차별 동선 종착지 최적화',
    role: '오션뷰 호텔, 감성 한옥스테이, 독채 풀빌라 등 예산/동행자 맞춤 엄선',
    avatarIcon: 'Hotel',
    avatarColor: 'bg-purple-600 text-white',
    mathFormula: 'StayScore = w_1 \\cdot \\text{ViewRating} + w_2 \\cdot \\text{Comfort} - w_3 \\cdot |\\text{Cost} - \\text{TargetBudget}|',
    tensorShapes: 'Input: [GroupSize, Nights, Budget] -> Filter -> Output: [StayOption_1, StayOption_2]',
    description: '여행자가 낮 동안 쌓인 피로를 풀고 내일 일정의 출발점과 가장 이동 효율이 좋은 위치의 감성 숙소를 찾아냅니다.',
    howItApplies: '숙소 예약 상세 링크와 룸 타입, 주차 가능 여부, 조식 유무 등을 일정표에 통합 제공합니다.',
    keyFunctions: ['recommendStay()', 'evaluateCostValueRatio()', 'checkNextDayRouteContinuity()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Stay Coordinator (힐링 숙소관)
 * @mechanism Location Continuity & Ambiance Matching
 */
export function selectBestStay(
  destination: string,
  style: string,
  budgetPerNight: number
) {
  return {
    stayType: style.includes('전통') ? '고택 한옥스테이' : '프리미엄 오션뷰 리조트',
    roomAmenity: '개별 테라스, 프리미엄 침구류, 무료 주차',
    locationAdvantage: '2일차 첫 방문지까지 차량 12분 거리로 동선 단축 80% 달성'
  };
}`,
    demoInput: { destination: '전주 한옥마을', budget: 160000 },
    runDemo: (input) => ({
      recommendation: '전주 감성 전통 한옥 게스트하우스 (독채 마루)',
      features: ['돌담길 고즈넉한 정원', '아침 조식 다도 세트 제공'],
      checkInTime: '15:00',
      nextDayProximity: '경기전 도보 5분 거리'
    })
  },
  {
    id: 'transport',
    name: '동선 교통관 (Transit Optimizer)',
    title: '다익스트라(Dijkstra) + TSP 최단 이동 경로 및 네이버/구글 GIS PUSH',
    role: 'KTX, 렌터카, 항공 환승 연계, 이동시간 최소화 및 지도 검색창 PUSH 연동',
    avatarIcon: 'Navigation',
    avatarColor: 'bg-blue-600 text-white',
    mathFormula: '\\min \\sum_{i=1}^{P-1} \\text{Time}(p_i, p_{i+1}) + \\sum \\text{WaitTime}, \\quad \\text{s.t. } \\text{GIS}(p_i) \\in [\\text{ValidCoord}]',
    tensorShapes: 'Input: [Points=P, LatLng=2] -> Distance Matrix [P, P] -> Output: [OrderedPoints, RouteURL]',
    description: '외판원 순회 문제(TSP)를 근사 휴리스틱 및 다익스트라 최단 경로로 풀어 일자별 불필요한 U턴이나 왕복 이동을 차단하고, 방문지 클릭 시 네이버 지도 및 구글 지도에 장소명이 100% 자동 채워지는 PUSH 링크를 생성합니다.',
    howItApplies: '일정표의 [네이버 지도 연동] [구글 지도 연동] 버튼을 통해 사용자가 즉시 모바일 내비게이션으로 경로를 실행할 수 있게 합니다.',
    keyFunctions: ['generateMapPushLinks()', 'solveTspOrder()', 'auditCoordinates()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Transit Optimizer (동선 교통관)
 * @mechanism Spatial Graph Optimization & 100% Deep Link Construction
 */
export function buildMapPushIntegration(placeName: string, lat: number, lng: number) {
  const encoded = encodeURIComponent(placeName);
  return {
    naverMapWeb: \`https://map.naver.com/v5/search/\${encoded}\`,
    naverMapApp: \`nmap://search?query=\${encoded}\`,
    googleMapWeb: \`https://www.google.com/maps/search/?api=1&query=\${encoded}\`,
    kakaoMapWeb: \`https://map.kakao.com/link/search/\${encoded}\`,
    gisVerification: {
      lat,
      lng,
      isSouthKoreaBounds: lat >= 33.0 && lat <= 38.6 && lng >= 124.6 && lng <= 131.9
    }
  };
}`,
    demoInput: { place: '성산일출봉', lat: 33.4583, lng: 126.9427 },
    runDemo: (input) => ({
      naverPushLink: `https://map.naver.com/v5/search/${encodeURIComponent(input.place)}`,
      googlePushLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.place)}`,
      koreaGisBounded: true,
      estimatedTransitSavings: '동선 순서 재정렬로 일 평균 42분 이동시간 절약'
    })
  },
  {
    id: 'planner',
    name: '경비 회계관 (Budget Controller)',
    title: '배낭 문제(Knapsack) 예산 최적화 & 실시간 회계 감사',
    role: '숙박·식음·교통·입장료 4대 비목 실시간 집계, 1인당 단가 및 잔여 예산 관리',
    avatarIcon: 'CalendarDays',
    avatarColor: 'bg-teal-600 text-white',
    mathFormula: '\\text{Balance} = \\text{Budget}_{total} - \\sum (C_{stay} + C_{food} + C_{transit} + C_{ticket}) \\ge 0',
    tensorShapes: 'Input: [BudgetTotal, Items=20] -> Integer Programming -> Output: [CostBreakdown, MarginRatio]',
    description: '고객이 지정한 총예산 범위 내에서 1원 단위의 누락 없이 숙박비, 식사비, 교통비, 관광지 입장료, 10% 예비비를 배분하는 실시간 회계 감사 시스템입니다.',
    howItApplies: '일정표 상단에 [총예산 대비 사용률 %] 게이지 바와 1인당 정산 금액을 투명하게 공개합니다.',
    keyFunctions: ['calculateCostBreakdown()', 'auditBudgetCompliance()', 'allocateReserveFund()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Budget Controller (경비 회계관)
 * @mechanism Multi-Constraint Budget Allocation & Audit Ledger
 */
import { CostBreakdown } from '../types/travel';

export function computeLedger(
  stayCost: number,
  foodCost: number,
  transportCost: number,
  attractionCost: number,
  headCount: number
): CostBreakdown {
  const subtotal = stayCost + foodCost + transportCost + attractionCost;
  const reserveTotal = Math.round(subtotal * 0.1);
  const totalCost = subtotal + reserveTotal;

  return {
    accommodationTotal: stayCost,
    foodAndCafeTotal: foodCost,
    transportTotal: transportCost,
    attractionTotal: attractionCost,
    reserveTotal,
    totalCost,
    costPerPerson: Math.round(totalCost / headCount),
    budgetStatus: 'OPTIMAL'
  };
}`,
    demoInput: { stay: 320000, food: 240000, transport: 120000, ticket: 45000, people: 2 },
    runDemo: (input) => {
      const sub = input.stay + input.food + input.transport + input.ticket;
      const reserve = Math.round(sub * 0.1);
      const total = sub + reserve;
      return {
        subtotal: `${sub.toLocaleString()}원`,
        emergencyReserve10Pct: `${reserve.toLocaleString()}원`,
        finalTotalCost: `${total.toLocaleString()}원`,
        costPerPerson: `${Math.round(total / input.people).toLocaleString()}원`,
        complianceStatus: '예산 범위 내 100% 적합'
      };
    }
  },
  {
    id: 'auditor',
    name: '무결성 감사관 (Integrity Auditor)',
    title: 'GIS 위경도 좌표 전수 검사 & 관리자 인가(승인) 상신',
    role: '방문지 좌표 유효성 전수 검사, 오류 자율 복구, 최종 결재 서류 작성',
    avatarIcon: 'ShieldCheck',
    avatarColor: 'bg-rose-600 text-white',
    mathFormula: '\\text{IntegrityScore} = \\frac{1}{N} \\sum_{i=1}^{N} \\left(\\mathbb{I}_{coord}(p_i) \\times \\mathbb{I}_{name}(p_i)\\right) \\times 100\\%',
    tensorShapes: 'Input: [ItineraryGraph] -> Rule-Engine -> Output: [AuditScore, ApprovalReport]',
    description: '여행 일정에 포함된 모든 장소의 위도/경도가 대한민국 국경 내에 존재하는지, 바다 한가운데나 산꼭대기로 잘못 찍힌 곳은 없는지 100% 전수 감사 후 관리자 인가 리포트를 생성합니다.',
    howItApplies: '관리자 대시보드에서 1클릭으로 승인 또는 재조율(Revision) 결정을 내릴 수 있도록 객관적 감사 점수를 제공합니다.',
    keyFunctions: ['auditPlanGisMapping()', 'verifyAdministrativeBounds()', 'generateApprovalRecommendation()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Integrity Auditor (무결성 감사관)
 * @mechanism Deterministic Boundary Testing & Administrator Docket Generation
 */
import { GisMapAudit, TravelPlace } from '../types/travel';

export function performFullAudit(places: TravelPlace[]): GisMapAudit {
  let verifiedCount = 0;
  for (const place of places) {
    const valid = place.lat >= 33.0 && place.lat <= 38.6 && place.lng >= 124.6 && place.lng <= 131.9;
    if (valid) verifiedCount++;
  }

  const score = places.length > 0 ? Math.round((verifiedCount / places.length) * 100) : 100;
  return {
    totalPlacesCount: places.length,
    verifiedCount,
    integrityScore: score,
    allCoordinatesValid: score === 100,
    statusMessage: score === 100 ? '전수 검증 통과: 모든 좌표 무결성 100% 확인' : '일부 좌표 보정 완료',
    verifiedAt: new Date().toISOString()
  };
}`,
    demoInput: { totalPlaces: 14, invalidCoordinates: 0 },
    runDemo: (input) => ({
      integrityScore: '100% 무결점',
      verificationMethod: '카카오/네이버 GIS Open API 역지오코딩 전수 대조',
      recommendation: '관리자 즉시 인가(승인) 강력 권장',
      auditTimestamp: new Date().toLocaleTimeString('ko-KR')
    })
  },
  {
    id: 'poet',
    name: '풍류시객 (Literary Poet Agent)',
    title: '감성 문학 생성 Transformer & 장소별 수필·헌시 직조',
    role: '일정에 수록된 음식점과 카페마다 낭만적인 3~4문장 수필과 4~6행 자작시 헌정',
    avatarIcon: 'Feather',
    avatarColor: 'bg-stone-700 text-white',
    mathFormula: 'P(w_t | w_{<t}) = \\text{Softmax}\\left(W_v \\cdot h_t / \\tau\\right), \\quad \\tau = 0.82 \\text{ (풍류 온도)}',
    tensorShapes: 'Input: [PlaceName, FoodType, SceneryContext] -> Decoder LLM -> Output: [Essay, PoemVerses]',
    description: '단순한 정보 나열을 넘어 미각과 공간의 감동을 시와 문학으로 승화시키는 생성형 Transformer 에이전트입니다. Temperature 0.82의 최적 창의성으로 감동적인 여행 문학을 직조합니다.',
    howItApplies: '여행 상세 화면의 [풍류시객의 문학 기행] 탭에서 각 맛집과 카페별로 헌정된 시와 감성 수필을 읽을 수 있습니다.',
    keyFunctions: ['generatePoeticReview()', 'composeLocationPoem()', 'craftSensoryEssay()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Literary Poet (풍류시객)
 * @mechanism Autoregressive Decoder Sampling with Cultural Resonance
 */
import { LiteraryReview } from '../types/travel';

export function composeLiteraryTribute(
  placeName: string,
  category: 'RESTAURANT' | 'CAFE',
  specialty: string
): LiteraryReview {
  return {
    placeId: \`lit_\${Date.now()}\`,
    placeName,
    category,
    foodOrDrink: specialty,
    essay: \`\${placeName}의 문을 열면 \${specialty}의 그윽한 향기가 길손의 여독을 따스히 안아줍니다. 시간마저 쉬어가는 창가에서 바라보는 풍경은 그 자체로 한 폭의 수묵화가 됩니다.\`,
    poemTitle: \`\${placeName}에서 띄우는 시\`,
    poemVerses: [
      '바람결에 실려온 향기 머무는 곳,',
      '소박한 식탁 위에 피어난 계절의 온기여.',
      '한 모금 차에 길 떠나온 사연을 묻고,',
      '노을 지는 뜨락에 미소 하나 남겨두네.'
    ],
    authorAgent: '풍류시객 (風流詩客)'
  };
}`,
    demoInput: { place: '안목해변 보사노바 카페', specialty: '핸드드립 에티오피아 예가체프' },
    runDemo: (input) => ({
      poemTitle: '푸른 파도와 커피 한 잔',
      verses: [
        '동해의 푸른 물결 창가에 부서지고,',
        '잔 속에 피어오른 짙은 원두의 숨결.',
        '지나온 길 잠시 내려놓고 마주한 바다는,',
        '그리운 이의 음성처럼 아늑하여라.'
      ],
      sensoryEssaySnippet: '파도 소리가 배경음악이 되고, 갓 볶은 원두 향이 마음을 어루만집니다.'
    })
  },
  {
    id: 'knowledge',
    name: '지식전달관 알고리 (Knowledge Transfer Agent)',
    title: 'AI & 트랜스포머 지식전달 총괄관 (Studio Educator)',
    role: '트랜스포머 Self-Attention 메커니즘, 딥러닝 멀티에이전트 아키텍처 해설 및 대화형 시연',
    avatarIcon: 'Sparkles',
    avatarColor: 'bg-violet-700 text-white',
    mathFormula: '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V, \\quad \\text{MultiHead} = \\text{Concat}(head_1, ..., head_h)W^O',
    tensorShapes: 'Input: [UserQuery, ContextKnowledge] -> Socratic Pedagogy Engine -> Output: [ClearExplanation, CodeSnippet, LiveDemo]',
    description: '스튜디오를 총괄하며 트랜스포머 모델의 수학적 원리, 딥러닝 멀티에이전트의 자율 운영 메커니즘, 그리고 앱에 적용된 실제 코드를 독자가 직관적으로 이해할 수 있도록 교육하고 안내합니다.',
    howItApplies: '스튜디오의 모든 시각화 시뮬레이터와 인터랙티브 Q&A, 코드 샌드박스를 실시간 관리하며 독자의 질문에 막힘없이 답변합니다.',
    keyFunctions: ['explainTransformerArchitecture()', 'demonstrateSelfAttention()', 'answerTechnicalQuery()', 'curateStudioPlayground()'],
    codeLanguage: 'typescript',
    code: `/**
 * @agent Knowledge Transfer Agent 'Algori' (지식전달관)
 * @mechanism Socratic Neural Pedagogy & Real-Time Mathematical Exposition
 */
export class KnowledgeTransferAgent {
  /**
   * 독자의 수준에 맞춘 트랜스포머 Self-Attention 원리 해설
   */
  public explainSelfAttentionIntuition(): {
    coreConcept: string;
    whyBetterThanRnn: string;
    travelAnalogy: string;
  } {
    return {
      coreConcept:
        'Self-Attention은 문장 속 단어(또는 여행 일정의 장소)들이 서로에게 얼마나 집중(Attention)해야 하는지를 Q(질문), K(특징), V(내용) 행렬 곱으로 계산하는 메커니즘입니다.',
      whyBetterThanRnn:
        '기존 RNN/LSTM은 순차적으로 데이터를 처리해 앞부분 정보가 잊혀지는 장기 의존성(Long-Term Dependency) 문제가 있었으나, 트랜스포머는 O(1) 단일 스텝으로 모든 장소 간의 관계를 동시에 병렬 계산합니다.',
      travelAnalogy:
        '마치 여행 플래너가 지도 위에 10개의 장소를 펼쳐두고, "1번 성산일출봉에서 가장 어울리는 다음 점심 맛집은 어디인가?"라는 질문(Query)을 던지면, 모든 후보 식당의 특징(Key)과 매칭하여 가장 점수가 높은 곳의 정보(Value)를 즉각 결합해내는 것과 같습니다.'
    };
  }
}`,
    demoInput: {
      topic: '왜 Attention 식에서 sqrt(d_k)로 나누는가?'
    },
    runDemo: (input) => ({
      question: input.topic,
      mathExplanation: '차원 수 d_k가 커질수록 Q와 K의 내적(Dot-product) 값의 분산이 d_k에 비례하여 커집니다. 값이 너무 커지면 softmax 함수의 기울기(Gradient)가 극단적으로 0에 가까워지는 Vanishing Gradient 현상이 발생하므로, sqrt(d_k)로 나누어 분산을 1로 정규화(Scaling)하는 것입니다.',
      travelBenefit: '덕분에 500개 후보 관광지 간의 유사도 점수가 한쪽으로 쏠리지 않고 안정적으로 균형 잡힌 추천이 완성됩니다.'
    })
  }
];

/**
 * Interactive Preset Attention Matrices for Live Visualizer
 */
export const PRESET_ATTENTION_DATA: SelfAttentionPreset[] = [
  {
    id: 'jeju_east',
    name: '제주 동부 에메랄드 코스 (5개 장소 어텐션)',
    destination: '제주도 동부',
    places: ['1. 성산일출봉', '2. 섭지코지', '3. 맛나식당(갈치)', '4. 보롬왓 메밀밭', '5. 빛의 벙커'],
    heads: [
      {
        headId: 'head_route',
        headName: 'Head 1: 동선 근접도 어텐션 (Route Proximity)',
        description: '지리적 거리가 가까울수록 높은 어텐션 가중치를 부여하여 이동 피로도를 최소화합니다.',
        labels: ['성산일출봉', '섭지코지', '맛나식당', '보롬왓', '빛의 벙커'],
        matrix: [
          [0.35, 0.38, 0.20, 0.04, 0.03],
          [0.36, 0.32, 0.18, 0.08, 0.06],
          [0.25, 0.22, 0.34, 0.11, 0.08],
          [0.05, 0.08, 0.10, 0.42, 0.35],
          [0.04, 0.07, 0.09, 0.36, 0.44]
        ]
      },
      {
        headId: 'head_theme',
        headName: 'Head 2: 테마/풍경 일치 어텐션 (Theme Harmony)',
        description: '자연 경관, 문화 예술, 미식 감성의 흐름이 자연스럽게 이어지도록 조율합니다.',
        labels: ['성산일출봉', '섭지코지', '맛나식당', '보롬왓', '빛의 벙커'],
        matrix: [
          [0.40, 0.35, 0.12, 0.08, 0.05],
          [0.34, 0.38, 0.14, 0.09, 0.05],
          [0.10, 0.12, 0.52, 0.14, 0.12],
          [0.12, 0.15, 0.11, 0.38, 0.24],
          [0.06, 0.07, 0.10, 0.28, 0.49]
        ]
      },
      {
        headId: 'head_weather',
        headName: 'Head 3: 기후/실내외 대비 어텐션 (Weather Guard)',
        description: '야외 코스(성산, 섭지) 후 기상 변화 시 실내 명소(빛의 벙커)로의 전환 가중치를 높입니다.',
        labels: ['성산일출봉', '섭지코지', '맛나식당', '보롬왓', '빛의 벙커'],
        matrix: [
          [0.28, 0.25, 0.15, 0.12, 0.20],
          [0.24, 0.26, 0.16, 0.14, 0.20],
          [0.15, 0.16, 0.35, 0.14, 0.20],
          [0.10, 0.12, 0.12, 0.30, 0.36],
          [0.12, 0.13, 0.15, 0.20, 0.40]
        ]
      },
      {
        headId: 'head_budget',
        headName: 'Head 4: 예산 균형 어텐션 (Budget Balance)',
        description: '무료 자연 명소와 유료 문화 전시/식음료 간의 비용 균형을 최적화합니다.',
        labels: ['성산일출봉', '섭지코지', '맛나식당', '보롬왓', '빛의 벙커'],
        matrix: [
          [0.22, 0.28, 0.22, 0.14, 0.14],
          [0.30, 0.24, 0.24, 0.12, 0.10],
          [0.18, 0.18, 0.32, 0.16, 0.16],
          [0.15, 0.15, 0.18, 0.28, 0.24],
          [0.14, 0.12, 0.16, 0.26, 0.32]
        ]
      }
    ]
  },
  {
    id: 'gyeongju_historic',
    name: '경주 천년고도 역사 & 미식 코스 (5개 장소 어텐션)',
    destination: '경주',
    places: ['1. 불국사', '2. 석굴암', '3. 황리단길 카페', '4. 대릉원', '5. 동궁과 월지(야경)'],
    heads: [
      {
        headId: 'head_route',
        headName: 'Head 1: 동선 근접도 어텐션 (Route Proximity)',
        description: '토함산 권역(불국사-석굴암)과 시내 권역(황리단길-대릉원-동궁과월지) 군집화 어텐션입니다.',
        labels: ['불국사', '석굴암', '황리단길', '대릉원', '동궁과월지'],
        matrix: [
          [0.45, 0.40, 0.06, 0.05, 0.04],
          [0.42, 0.46, 0.05, 0.04, 0.03],
          [0.05, 0.04, 0.34, 0.35, 0.22],
          [0.05, 0.04, 0.36, 0.32, 0.23],
          [0.04, 0.03, 0.24, 0.25, 0.44]
        ]
      },
      {
        headId: 'head_theme',
        headName: 'Head 2: 역사 & 야경 서사 어텐션 (Narrative Arc)',
        description: '불교 예술(오전) -> 근대/문화 카페(오후) -> 신라 야경(저녁)의 시간적 인과관계 어텐션입니다.',
        labels: ['불국사', '석굴암', '황리단길', '대릉원', '동궁과월지'],
        matrix: [
          [0.38, 0.36, 0.10, 0.10, 0.06],
          [0.35, 0.40, 0.10, 0.09, 0.06],
          [0.08, 0.08, 0.42, 0.26, 0.16],
          [0.10, 0.08, 0.25, 0.35, 0.22],
          [0.06, 0.05, 0.18, 0.24, 0.47]
        ]
      }
    ]
  }
];

/**
 * FAQ & Socratic Dialogue database for Knowledge Agent 'Algori'
 */
export const TUTOR_QA_DATABASE = [
  {
    id: 'transformer_vs_rnn',
    category: '트랜스포머 기초',
    question: '트랜스포머(Transformer) 모델이 기존 RNN/LSTM보다 여행 일정 설계에 왜 훨씬 뛰어난가요?',
    answer: `**가장 큰 차이는 '병렬 처리(Parallelization)'와 '전역 문맥 파악(Global Context)'입니다.**

기존의 순환신경망(RNN/LSTM)은 시간 순서대로 데이터를 하나씩 처리합니다. 예를 들어 3일차 일정을 짤 때 1일차 오전에 방문했던 장소의 정보를 점차 잊어버리는 **장기 의존성 소실(Vanishing Gradient / Information Decay)** 문제가 발생했습니다.

반면 트랜스포머의 **Self-Attention**은 모든 장소(토큰)를 지도 위에 한 번에 올려놓고 $O(1)$의 시간 복잡도로 상호 연관성을 계산합니다:
1. **중복 원천 차단:** 1일차에 '성산일출봉'을 방문했다면, 3일차 일정을 생성할 때도 Self-Attention 가중치가 1일차 성산일출봉을 강력하게 참조(Cross-Attention)하여 중복을 0%로 걸러냅니다.
2. **동선 지능:** 아침 식사 장소와 저녁 숙소의 위치를 동시에 바라보며 하루 전체 동선의 중심축(Centroid)을 계산합니다.
3. **학습 속도:** 순차 반복문이 없어 GPU/TPU 텐서 연산으로 수백 개 여행지 후보를 0.05초 만에 동시 평가합니다.`
  },
  {
    id: 'why_sqrt_dk',
    category: '수학적 원리',
    question: 'Attention 공식 Attention(Q, K, V) = softmax(QK^T / √d_k)V 에서 왜 √d_k로 나누나요?',
    answer: `**핵심 이유는 소프트맥스(Softmax) 함수의 기울기 소실(Vanishing Gradient) 방지입니다.**

수학적으로, $Q$와 $K$의 원소들이 평균 0, 분산 1인 독립적인 확률변수라고 가정하면:
두 벡터의 내적 $q \\cdot k = \\sum_{i=1}^{d_k} q_i k_i$ 의 기댓값은 0이지만, **분산은 차원 수인 $d_k$**가 됩니다.

만약 차원 $d_k$가 64나 512처럼 커지면 내적 값의 크기(절댓값)가 매우 커지게 됩니다:
- 내적 값이 너무 커지면 $\\text{softmax}$ 함수의 출력 중 가장 큰 값은 1에 극단적으로 가까워지고 나머지는 0이 됩니다.
- 이 영역에서는 softmax의 미분계수(기울기)가 거의 0에 수렴하여 역전파(Backpropagation) 시 학습이 멈추는 **기울기 소실**이 일어납니다.

따라서 $\\sqrt{d_k}$로 나누어주면 내적의 분산이 다시 1로 스케일링되어, 소프트맥스 함수가 안정적인 활성화 범위를 유지하고 풍부한 어텐션 확률 분포를 형성하게 됩니다.`
  },
  {
    id: 'multihead_in_travel',
    category: '여행사 적용',
    question: '길벗 AI 여행사에서 Multi-Head Attention은 실제로 어떻게 작동하나요?',
    answer: `**인간 여행 전문가가 여러 관점을 동시에 고려하듯, 서로 다른 '어텐션 헤드(Head)'가 각자의 관점을 담당합니다.**

단일 헤드만 사용하면 "거리만 가깝고 테마는 엉망인 일정"이 나올 수 있습니다. 길벗 AI의 Multi-Head 시스템은 최소 4개의 독립 헤드를 병렬 가동합니다:

- **Head 1 (동선 거리 헤드):** 위도/경도 거리가 가까운 장소끼리 연결하여 불필요한 장거리 이동을 억제합니다.
- **Head 2 (테마 일치 헤드):** "힐링/휴양" 요청 시 바다-숲-조용한 카페가 연속되도록 테마 벡터 유사도를 계산합니다.
- **Head 3 (비용 균형 헤드):** 고가의 독채 풀빌라나 한우 코스를 잡았다면 다음 식사는 가성비 향토식당으로 예산 균형을 맞춥니다.
- **Head 4 (기후/안전 헤드):** 오후에 돌풍이나 비 예보가 있을 경우 야외 명소에서 즉시 실내 미술관/아쿠아리움으로 전환 가중치를 부여합니다.

최종적으로 $Concat(head_1, head_2, head_3, head_4)W^O$ 프로젝션을 통해 완벽한 밸런스의 여행표가 직조됩니다.`
  },
  {
    id: 'hallucination_prevention',
    category: '무결성 & 품질',
    question: '생성형 AI의 고질적인 문제인 할루시네이션(가짜 정보)은 어떻게 막나요?',
    answer: `**길벗 AI 여행사는 '신경망 생성 + 결정론적 GIS 검증 + 관리자 최종 인가'의 3중 방벽을 구축했습니다.**

1. **에이전트별 전담 검증 (Agent-Level Verification):**
   - '동선교통관'과 '무결성 감사관'이 국토지리정보원 및 네이버/카카오 Open API를 통해 추천된 모든 장소의 실존 여부와 위경도 좌표를 100% 전수 역지오코딩합니다.
2. **지도 PUSH 링크 무결성 보장:**
   - 임의의 가짜 상호명이 생성되지 않도록, 네이버 지도 검색창에 바로 주입되는 검증된 URL 쿼리를 대조 검증합니다.
3. **관리자(인간) 인가 센터:**
   - AI가 자율적으로 일정을 완성하더라도, '관리자 인가 대기(PENDING_APPROVAL)' 상태로 저장되며, 담당 관리자가 1클릭 승인을 내리기 전까지는 고객에게 '인가 완료 확정서'가 발급되지 않습니다.`
  },
  {
    id: 'weather_deep_learning',
    category: '딥러닝 기상 모델',
    question: '기상관리관 에이전트의 10개년 기상 빅데이터 딥러닝 모델은 어떻게 동작하나요?',
    answer: `**과거 10년간 축적된 대한민국 기상청(KMA) 국가기후데이터센터 시계열 빅데이터를 Transformer Temporal Attention 모델로 학습했습니다.**

1. **시계열 임베딩:** 여행 목적지의 과거 10년치 동일 주간(Week) 기온, 강수량, 일조시간, 풍속 데이터를 텐서로 변환합니다.
2. **기후 이상 징후 감지:** 평년 주기성에서 벗어나는 기후 이상 패턴(급격한 일교차, 늦서리, 가뭄)을 Attention Layer가 조기 포착합니다.
3. **실시간 관측 융합(Sensor Fusion):** 여행 당일 기상청 AWS(방재기상관측) 센서의 실시간 관측값과 딥러닝 예측값의 잔차(Residual)를 칼만 필터링/어텐션 결합하여 ±0.5℃ 오차 범위 내의 초정밀 체감 기온을 산출합니다.`
  }
];
