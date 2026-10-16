import { GoogleGenAI } from '@google/genai';
import { LiteraryReview, TravelPlace } from '../types/travel';

export async function generatePoeticReview(place: TravelPlace): Promise<LiteraryReview> {
  const isCafe = place.category === 'CAFE';
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);

  // If Gemini API is available, generate fresh unique poetry & essay
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `당신은 대한민국 전통과 현대 문학의 정수를 품은 길벗 AI 여행사의 특별 큐레이터 '풍류시객'입니다.
다음 ${isCafe ? '카페' : '음식점'}을 실제로 방문했다고 상상하고, 그 공간의 맛과 멋, 풍경, 정취를 담은 '감성 수필(3~4문장)'과 그에 어울리는 서정적인 '시(詩) 한 수(제목과 4~5행)'를 작성해주세요.

장소 정보:
- 이름: ${place.name}
- 분류: ${place.categoryLabel}
- 위치: ${place.address}
- 특징/메뉴: ${place.description} (${place.specialTip || ''})

반드시 아래 JSON 형식으로만 응답해주세요 (마크다운 없이 순수 JSON):
{
  "foodOrDrink": "대표 메뉴 또는 음료명",
  "essay": "그 공간의 오감(미각, 시각, 바람소리 등)을 서정적으로 그린 3~4문장의 단아한 한글 수필",
  "poemTitle": "운치 있는 시 제목",
  "poemVerses": [
    "시 1행",
    "시 2행",
    "시 3행",
    "시 4행"
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
      const parsed = JSON.parse(cleanJson);

      return {
        placeId: place.id,
        placeName: place.name,
        category: isCafe ? 'CAFE' : 'RESTAURANT',
        foodOrDrink: parsed.foodOrDrink || (isCafe ? '스페셜티 커피와 디저트' : '정갈한 향토 미식'),
        essay: parsed.essay,
        poemTitle: parsed.poemTitle,
        poemVerses: parsed.poemVerses,
        authorAgent: '풍류시객'
      };
    } catch (err) {
      console.warn('Gemini API call for poetry returned an error, using crafted literary engine:', err);
    }
  }

  // High-fidelity poetic engine fallback based on place category and Korean aesthetics
  if (isCafe) {
    return {
      placeId: place.id,
      placeName: place.name,
      category: 'CAFE',
      foodOrDrink: '핸드드립 원두 & 시그니처 디저트',
      essay: `통유리 너머로 쏟아지는 부드러운 햇살 아래, 갓 내린 커피의 은은한 향기가 온 공간을 포근하게 감싸 안습니다. 쌉싸름하면서도 끝 맛이 달콤한 커피 한 모금에 길 위에서 쌓였던 여독이 봄눈처럼 스르륵 녹아내립니다. 나그네의 분주했던 걸음을 잠시 멈추고 창밖의 풍경을 오래도록 응시하게 만드는, 참으로 다정한 쉼표 같은 공간입니다.`,
      poemTitle: '찻잔에 머무는 풍경',
      poemVerses: [
        '흘러가는 구름 한 점 창가에 걸리고',
        '잔 속에서 피어오르는 짙은 원두의 온기',
        '시간마저 느린 호흡으로 쉬어가는 자리에서',
        '나는 또 하나의 고요를 마음에 새긴다.'
      ],
      authorAgent: '풍류시객'
    };
  } else {
    return {
      placeId: place.id,
      placeName: place.name,
      category: 'RESTAURANT',
      foodOrDrink: '제철 향토 만찬 한상',
      essay: `이 땅의 흙과 바다가 길러낸 정갈한 식재료들이 장인의 정성 어린 손끝을 거쳐 탐스러운 한 상으로 피어났습니다. 뚝배기에서 보글보글 솟구치는 구수한 내음과 깊은 감칠맛은 오랜 세월을 지켜온 이 고장 사람들의 따스한 정을 고스란히 전해줍니다. 한술 가득 입에 담을 때마다 여행의 기쁨과 위로가 가슴 깊은 곳까지 차오릅니다.`,
      poemTitle: '그리운 맛의 노래',
      poemVerses: [
        '소박한 질그릇에 담긴 계절의 정성',
        '한 숟가락 감도는 깊고 그윽한 세월',
        '나그네의 주린 여정이 넉넉히 채워지니',
        '먼 길 찾아온 보람이 혀끝에서 춤을 춘다.'
      ],
      authorAgent: '풍류시객'
    };
  }
}
