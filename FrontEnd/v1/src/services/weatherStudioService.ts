/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LstmGateCalculationResult {
  xt: number; // Current input feature (Normalized Temp Anomaly)
  htPrev: number; // Previous hidden state
  ctPrev: number; // Previous cell state
  
  // Gates
  forgetGateRaw: number;
  forgetGateSigma: number; // ft ∈ (0, 1)
  
  inputGateRaw: number;
  inputGateSigma: number; // it ∈ (0, 1)
  
  candidateCellRaw: number;
  candidateCellTanh: number; // ~Ct ∈ (-1, 1)
  
  // Cell Update
  forgetContribution: number; // ft * Ct-1
  inputContribution: number; // it * ~Ct
  ctNew: number; // Updated cell state
  
  // Output & Hidden
  outputGateRaw: number;
  outputGateSigma: number; // ot ∈ (0, 1)
  htNew: number; // ot * tanh(ctNew)
  
  // Physical temperature inference
  predictedTemp: number; // ℃
  confidence: number; // %
}

/**
 * Educational LSTM Cell Forward Simulation
 * Computes exact mathematical equations:
 * ft = σ(Wf * xt + Uf * ht-1 + bf)
 * it = σ(Wi * xt + Ui * ht-1 + bi)
 * ~Ct = tanh(Wc * xt + Uc * ht-1 + bc)
 * Ct = ft ⊙ Ct-1 + it ⊙ ~Ct
 * ot = σ(Wo * xt + Uo * ht-1 + bo)
 * ht = ot ⊙ tanh(Ct)
 */
export function simulateLstmCell(
  xt: number,
  htPrev: number,
  ctPrev: number,
  baseSeasonalTemp = 18.5
): LstmGateCalculationResult {
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
  const tanh = (z: number) => Math.tanh(Math.max(-10, Math.min(10, z)));

  // Pre-trained weight parameters for weather anomaly sequence
  const Wf = 0.85, Uf = 0.45, bf = 0.2;
  const Wi = 0.75, Ui = 0.55, bi = -0.1;
  const Wc = 0.95, Uc = 0.60, bc = 0.05;
  const Wo = 0.80, Uo = 0.50, bo = 0.15;

  // 1. Forget Gate
  const forgetGateRaw = Wf * xt + Uf * htPrev + bf;
  const forgetGateSigma = parseFloat(sigmoid(forgetGateRaw).toFixed(4));

  // 2. Input Gate & Candidate Memory
  const inputGateRaw = Wi * xt + Ui * htPrev + bi;
  const inputGateSigma = parseFloat(sigmoid(inputGateRaw).toFixed(4));

  const candidateCellRaw = Wc * xt + Uc * htPrev + bc;
  const candidateCellTanh = parseFloat(tanh(candidateCellRaw).toFixed(4));

  // 3. Update Cell State
  const forgetContribution = parseFloat((forgetGateSigma * ctPrev).toFixed(4));
  const inputContribution = parseFloat((inputGateSigma * candidateCellTanh).toFixed(4));
  const ctNew = parseFloat((forgetContribution + inputContribution).toFixed(4));

  // 4. Output Gate & Hidden State
  const outputGateRaw = Wo * xt + Uo * htPrev + bo;
  const outputGateSigma = parseFloat(sigmoid(outputGateRaw).toFixed(4));
  const htNew = parseFloat((outputGateSigma * tanh(ctNew)).toFixed(4));

  // 5. Predict Physical Temperature
  const predictedTemp = parseFloat((baseSeasonalTemp + htNew * 6.5).toFixed(1));
  const confidence = Math.min(99.4, parseFloat((88 + (1 - Math.abs(htNew - xt)) * 10).toFixed(1)));

  return {
    xt,
    htPrev,
    ctPrev,
    forgetGateRaw: parseFloat(forgetGateRaw.toFixed(4)),
    forgetGateSigma,
    inputGateRaw: parseFloat(inputGateRaw.toFixed(4)),
    inputGateSigma,
    candidateCellRaw: parseFloat(candidateCellRaw.toFixed(4)),
    candidateCellTanh,
    forgetContribution,
    inputContribution,
    ctNew,
    outputGateRaw: parseFloat(outputGateRaw.toFixed(4)),
    outputGateSigma,
    htNew,
    predictedTemp,
    confidence
  };
}

export interface EnsembleModelSpec {
  id: string;
  name: string;
  type: 'STATISTICAL' | 'DEEP_LEARNING' | 'TREE_BASED' | 'SENSOR_FILTER';
  shortDesc: string;
  principle: string;
  defaultWeight: number; // 0.0 ~ 1.0
  pros: string;
  cons: string;
  formula: string;
}

export const ENSEMBLE_MODELS: EnsembleModelSpec[] = [
  {
    id: 'kma_10yr',
    name: '10개년 기상청 ASOS 평년값 베이스라인 모델',
    type: 'STATISTICAL',
    shortDesc: '2015-2025 10년간 축적된 대한민국 기상청 지상관측망 통계 정규분포 모델',
    principle: '10년치 동기 평균 기온 및 표준편차(μ, σ)를 계산하여 계절적 주기성의 기저값(Baseline)을 확립합니다.',
    defaultWeight: 0.35,
    pros: '장기 기후 주기성과 극단적 이상치에 대한 안정성이 매우 뛰어남',
    cons: '당일 발생하는 이상 고온이나 돌발성 한파 등 급격한 변화에 둔감',
    formula: 'M_1(t) = \\mu_{10yr}(t) = \\frac{1}{10} \\sum_{y=2015}^{2025} T(y, t)'
  },
  {
    id: 'bi_lstm',
    name: '양방향 시계열 신경망 (Bi-directional LSTM)',
    type: 'DEEP_LEARNING',
    shortDesc: '과거와 미래 시계열 문맥을 동시에 반영하는 장단기 메모리 순환신경망',
    principle: '일별 기온, 기압, 습도, 풍속의 연속 시계열을 전방향(Forward)과 후방향(Backward) 은닉 상태로 학습하여 비선형 추세를 예측합니다.',
    defaultWeight: 0.35,
    pros: '기상 패턴의 복잡한 비선형 전이 과정 및 다변량 상관관계를 정밀 추론',
    cons: '학습 데이터 범위를 벗어난 전례 없는 기상 이변 시 오차 발생 가능',
    formula: 'M_2(t) = W_y [\\vec{h}_t ; \\overleftarrow{h}_t] + b_y'
  },
  {
    id: 'xgboost',
    name: 'XGBoost 기후 변칙 회귀기 (Climate Anomaly Gradient Booster)',
    type: 'TREE_BASED',
    shortDesc: '수백 개의 의사결정 나무를 순차 결합하여 평년 대비 잔차(Residual)를 보정',
    principle: '엘니뇨/라니냐 지수, 북극진동(AO), 주변 해수면 온도(SST) 등 외부 기후 인덱스를 피처로 잔차 오차를 집중 감소시킵니다.',
    defaultWeight: 0.15,
    pros: '이상 기후 변칙 현상(Anomaly Spike) 포착에 최적화된 높은 반응성',
    cons: '결정 트리 특성상 연속적인 기상 물리 법칙의 부드러운 보간력이 상대적으로 낮음',
    formula: 'M_3(t) = \\sum_{m=1}^{M} f_m(\\mathbf{x}_t), \\quad f_m \\in \\mathcal{F}'
  },
  {
    id: 'aws_kalman',
    name: '실시간 AWS 센서 관측망 칼만 필터 (Real-time Sensor Kalman Fusion)',
    type: 'SENSOR_FILTER',
    shortDesc: '현지 방재기상관측장비(AWS)의 실시간 관측값과 모델 간의 동적 오차 보정',
    principle: '여행 당일 오전 기상청 실시간 센서 관측값과 모델 예측값의 분산(공분산 행렬)을 비교하여 최적의 칼만 이득(Kalman Gain)으로 즉각 보정합니다.',
    defaultWeight: 0.15,
    pros: '현재 현지의 체감 기온과 즉각적인 실시간 일치도 100% 보장',
    cons: '수일~수주일 뒤의 장기 미래 시점에는 센서 데이터가 존재하지 않아 보정 범위 제한',
    formula: '\\hat{x}_{k} = \\hat{x}_k^- + K_k (z_k - H \\hat{x}_k^-)'
  }
];

export interface EnsemblePredictionResult {
  weights: { [modelId: string]: number };
  regionalBaseline: number;
  individualPredictions: {
    modelId: string;
    modelName: string;
    predictedTemp: number;
    weight: number;
    weightedTemp: number;
    stdDev: number;
  }[];
  ensembleBlendedTemp: number;
  diurnalRangePredicted: number; // 일교차
  feelsLikeTemp: number;
  varianceReductionPct: number; // 앙상블로 인한 오차 분산 감소율 (%)
  advisoryTag: string;
}

export function computeEnsemblePrediction(
  weights: { [modelId: string]: number },
  destination = '제주',
  month = 5
): EnsemblePredictionResult {
  // Regional base values
  const baseMap: { [key: string]: number } = {
    '제주': 18.7,
    '강릉': 17.6,
    '부산': 18.9,
    '경주': 18.2,
    '전주': 18.1
  };
  const base = baseMap[destination] || 18.5;

  // Normalized weights
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1.0;
  const normWeights: { [key: string]: number } = {};
  for (const k of Object.keys(weights)) {
    normWeights[k] = weights[k] / totalW;
  }

  // Model simulated individual predictions
  const predictions: { [key: string]: { temp: number; std: number } } = {
    kma_10yr: { temp: base, std: 1.8 },
    bi_lstm: { temp: base + 0.9, std: 1.4 },
    xgboost: { temp: base + 1.4, std: 2.1 },
    aws_kalman: { temp: base + 0.6, std: 0.8 }
  };

  let blendedTemp = 0;
  const individualList = ENSEMBLE_MODELS.map((m) => {
    const w = normWeights[m.id] ?? m.defaultWeight;
    const pred = predictions[m.id];
    const weighted = pred.temp * w;
    blendedTemp += weighted;
    return {
      modelId: m.id,
      modelName: m.name,
      predictedTemp: parseFloat(pred.temp.toFixed(2)),
      weight: parseFloat(w.toFixed(3)),
      weightedTemp: parseFloat(weighted.toFixed(2)),
      stdDev: pred.std
    };
  });

  blendedTemp = parseFloat(blendedTemp.toFixed(1));
  const diurnal = destination === '경주' ? 11.2 : destination === '제주' ? 7.8 : 9.4;
  const feelsLike = parseFloat((blendedTemp - 0.8).toFixed(1));

  // Variance reduction calculation: Var(Ensemble) = sum(w_i^2 * Var_i) under independence
  const singleVarianceAvg = 1.8 * 1.8;
  const ensembleVariance = individualList.reduce((acc, cur) => acc + Math.pow(cur.weight, 2) * Math.pow(cur.stdDev, 2), 0);
  const varianceReductionPct = Math.min(75, Math.max(25, Math.round((1 - ensembleVariance / singleVarianceAvg) * 100)));

  let advisory = '안정적인 기후 상태 (오차 신뢰도 최상)';
  if (diurnal >= 10.0) {
    advisory = '일교차 10℃ 이상 주의보 발령 (아침/저녁 겉옷 필수)';
  }

  return {
    weights: normWeights,
    regionalBaseline: base,
    individualPredictions: individualList,
    ensembleBlendedTemp: blendedTemp,
    diurnalRangePredicted: diurnal,
    feelsLikeTemp: feelsLike,
    varianceReductionPct,
    advisoryTag: advisory
  };
}

export const WEATHER_STUDIO_FAQS = [
  {
    id: 'lstm_gates_intuition',
    question: '학생을 위한 비유: LSTM의 3가지 게이트(망각, 입력, 출력)는 일상생활의 무엇과 같나요?',
    category: 'LSTM 기초 원리',
    answer: `**LSTM은 시험공부를 하는 우등생의 '요약 노트 작성 과정'과 완벽히 같습니다!**

1. **망각 게이트 (Forget Gate - 지우개):**
   - 어제까지 적어둔 메모 중 "지난주 일시적인 봄비나 황사"처럼 앞으로의 기후 추세에 불필요한 정보는 지우개로 지워버립니다.
   - 수식의 $f_t = \\sigma(\\dots)$ 결과가 0이면 완전 삭제, 1이면 100% 보존합니다.

2. **입력 게이트 (Input Gate - 형광펜 & 새 메모):**
   - 오늘 새로 관측된 데이터(예: "남서풍 유입으로 기온 급상승") 중 앞으로의 계절 예측에 중요한 핵심만 골라 형광펜을 칠하고 셀 상태에 덧붙입니다.

3. **셀 상태 (Cell State - 긴 요약 노트):**
   - 덧셈($+$) 연산만으로 구성된 컨베이어 벨트로, 과거 10년의 기후 기억이 기울기 소실(Vanishing Gradient) 없이 다음 날, 다음 주로 손실 없이 전달됩니다.

4. **출력 게이트 (Output Gate - 시험 답안 작성):**
   - 요약 노트 전체 내용 중 "내일 여행자에게 안내할 최저/최고 기온과 비올 확률"에 해당하는 핵심 수치만 바깥으로 출력합니다.`
  },
  {
    id: 'why_ensemble_better',
    question: '단일 인공지능 모델보다 앙상블(Ensemble) 기법이 기상예보에서 왜 훨씬 정확한가요?',
    category: '앙상블 공학',
    answer: `**"전문가 한 명의 독단보다 여러 분야 전문가의 다수결 합의가 훨씬 안전하기 때문"입니다.**

수학적으로 이를 **편향-분산 트레이드오프(Bias-Variance Tradeoff) 개선**과 **오차 상쇄 효과**라고 부릅니다:

1. **독립적 오차 상쇄:**
   - 10개년 통계 모델($M_1$)은 평년값에 너무 집착하는 경향(높은 편향)이 있고,
   - 딥러닝 LSTM($M_2$)은 최근 추세를 너무 민감하게 따라가는 경향(높은 분산)이 있습니다.
   - 두 모델을 가중 평균($0.35 M_1 + 0.35 M_2 + \\dots$)하면, 양의 오차와 음의 오차가 서로를 상쇄시켜 전체 예측 분산이 약 40~65% 극적으로 감소합니다.

2. **이상 기후 방어력:**
   - 평소에는 LSTM과 평년 모델이 안정적으로 예측하다가, 엘니뇨나 기습 한파가 오면 XGBoost와 실시간 센서 칼만 필터가 즉시 가중치를 높여 급변을 포착합니다.`
  },
  {
    id: 'diurnal_and_packing',
    question: '앱에서는 LSTM과 앙상블 결과로부터 어떻게 스마트 짐싸기 목록을 자동 생성하나요?',
    answer: `**"기온 수치 추론 → 생체 체감 지수 계산 → 규칙 기반 스마트 큐레이션 파이프라인"으로 이어집니다.**

1. **일교차(Diurnal Range) 분석:**
   - LSTM이 예측한 주간 최고기온($T_{max}$)과 야간 최저기온($T_{min}$)의 차이 $\\Delta T = T_{max} - T_{min}$ 를 계산합니다.
   - $\\Delta T \\ge 9.0^\\circ\\text{C}$ 이면 자동으로 \`[일교차 주의보]\`를 발령하고, '탈착 가능한 가디건', '머플러', '경량 패딩'을 필수 준비물로 등록합니다.

2. **풍속 및 습도 체감 온도(Wind-Chill & Heat Index):**
   - 해안가 돌풍($v \\ge 4.0\\text{m/s}$) 관측 시 체감온도 보정 공식($T_{feels} = T - 0.4v$)을 적용하여 방풍 윈드브레이커를 추천합니다.

3. **강수 확률 연동:**
   - 강수 확률 $P_{rain} \\ge 30\\%$ 이상인 날이 하루라도 포함되면 '휴대용 미니 접이식 우산'을 체크리스트 최상단에 자동 배치합니다.`
  },
  {
    id: 'lstm_vs_transformer_weather',
    question: '기상 시계열 예측에서 LSTM과 트랜스포머(Temporal Transformer)의 차이점은 무엇인가요?',
    answer: `**LSTM은 '물리적 인과관계의 연속성'에 강하고, 트랜스포머는 '수년 전 유사 기후 패턴 검색'에 강합니다.**

- **LSTM (순차적 전이):** 기온과 기압은 어제에서 오늘로 물리적 공기의 흐름을 타고 전이되므로, 상태(State)가 연속적으로 흘러가는 LSTM이 일상적인 1~3일 날씨 변화를 부드럽게 예측합니다.
- **트랜스포머 (전역 어텐션):** "올해 5월의 기압 배치가 2018년 5월이나 2021년 5월의 패턴과 가장 유사하다"는 다년도 장기 유사성을 O(1)의 어텐션 가중치로 단번에 찾아냅니다.
- **길벗 AI의 하이브리드 설계:** 두 모델의 장점을 융합하여, 10개년 유사 패턴은 트랜스포머가 탐색하고, 일정 일자별 타임라인 전이는 LSTM 앙상블이 세밀하게 조율합니다!`
  }
];

export const PYTHON_LSTM_CODE = `# ==============================================================================
# Gilbeot AI Travel Agency - 10-Year Climate LSTM & Ensemble Inference Engine
# Framework: PyTorch 2.x & NumPy
# Target: Daily Temperature & Weather Anomaly Multi-Step Forecasting
# ==============================================================================

import torch
import torch.nn as nn
import numpy as np

class BiDirectionalWeatherLSTM(nn.Module):
    """
    10개년 기상청 ASOS 시계열 데이터를 학습하는 양방향 LSTM 기상 예측 모델
    입력 피처(7개): [기온, 최고, 최저, 강수량, 습도, 풍속, 기압]
    """
    def __init__(self, input_dim=7, hidden_dim=64, num_layers=2, output_days=7):
        super(BiDirectionalWeatherLSTM, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # 1. 양방향 LSTM 계층 (순방향 과거 기억 + 역방향 계절 주기성 동시 포착)
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.2
        )
        
        # 2. 어텐션 맥락 벡터 선형 변환
        self.fc_attention = nn.Linear(hidden_dim * 2, 1)
        
        # 3. 최종 미래 예측 계층 (예측 일수 x 4개 변수: 최저, 최고, 평균, 강수확률)
        self.fc_out = nn.Sequential(
            nn.Linear(hidden_dim * 2, 128),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(128, output_days * 4)
        )

    def forward(self, x):
        # x shape: [Batch_Size, Sequence_Length=365, Features=7]
        lstm_out, (hn, cn) = self.lstm(x)  # lstm_out: [B, Seq_Len, Hidden*2]
        
        # 시간축 어텐션 가중치 산출
        attn_weights = torch.softmax(self.fc_attention(lstm_out), dim=1) # [B, Seq_Len, 1]
        context_vector = torch.sum(attn_weights * lstm_out, dim=1)      # [B, Hidden*2]
        
        # 미래 기상 추론값 생성
        predictions = self.fc_out(context_vector)
        return predictions.view(-1, 7, 4)

class WeatherEnsembleBlender:
    """
    통계 평년 모델, Bi-LSTM, XGBoost, 실시간 센서 관측값을 최적 가중치로 융합
    """
    def __init__(self, weights=[0.35, 0.35, 0.15, 0.15]):
        self.weights = np.array(weights) / np.sum(weights)

    def predict(self, kma_10yr, lstm_pred, xgb_pred, realtime_sensor):
        # 앙상블 가중 선형 결합
        models = np.stack([kma_10yr, lstm_pred, xgb_pred, realtime_sensor], axis=0)
        blended = np.tensordot(self.weights, models, axes=(0, 0))
        return blended
`;
