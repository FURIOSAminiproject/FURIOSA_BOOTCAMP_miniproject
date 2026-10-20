/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { getLocalExpertFallback } from './src/services/localExpertData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Setup server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey && apiKey.trim().length > 5) {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.warn('[Server] Notice: GoogleGenAI SDK initialization note:', (e as any)?.message || e);
    }
  }

  // 1:1 Local Expert Chat Endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { text, destination, clientName, startDate, endDate, style } = req.body || {};
      const query = (text || '').trim();
      const dest = destination || '대한민국';

      if (!query) {
        return res.status(400).json({ error: 'Text prompt is required' });
      }

      if (ai) {
        const prompt = `당신은 대한민국 최고 수준의 지능형 여행사 "길벗 AI 여행사"의 [${dest} 현지 로컬 전문가이자 24시 안심 비상대응관]입니다.
고객명: ${clientName || '고객'}
여행지: ${dest}
여행 일정: ${startDate || ''} ~ ${endDate || ''}
여행 스타일: ${Array.isArray(style) ? style.join(', ') : style || '힐링, 미식'}

질문: "${query}"

답변 원칙:
1. ${dest}의 실제 지리, 관습, 식당 에티켓, 문화재 관람 예절, 숨은 로컬 명소, 비상 상황(응급실 병원, 112/119 대응, 안전수칙)을 극히 친절하고 전문적인 어조(존댓말)로 3~5문장으로 명확히 답변하세요.
2. 만약 응급상황/사건사고 관련 질문이면 119/112 및 인근 권역응급의료센터 정보와 비상 대피 요령을 신속하게 짚어주세요.
3. 마크다운 형식으로 가독성 좋게 답변하세요.`;

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
          });

          const replyText = response.text?.trim();
          if (replyText) {
            return res.json({ reply: replyText });
          }
        } catch (apiErr) {
          console.warn('[Server] Gemini generateContent notice (falling back to local engine):', (apiErr as any)?.message || apiErr);
        }
      }

      // Safe, intelligent regional fallback
      const reply = getLocalExpertFallback(query, dest);
      return res.json({ reply });
    } catch (err) {
      console.warn('[Server] Unexpected /api/chat error handled:', err);
      const reply = getLocalExpertFallback(req.body?.text || '', req.body?.destination || '');
      return res.json({ reply });
    }
  });

  // Literary Poetic Review Endpoint
  app.post('/api/poetry', async (req, res) => {
    try {
      const { place } = req.body || {};
      if (!place || !place.name) {
        return res.status(400).json({ error: 'Place information required' });
      }

      const isCafe = place.category === 'CAFE';

      if (ai) {
        const prompt = `당신은 대한민국 전통과 현대 문학의 정수를 품은 길벗 AI 여행사의 특별 큐레이터 '풍류시객'입니다.
다음 ${isCafe ? '카페' : '음식점'}을 실제로 방문했다고 상상하고, 그 공간의 맛과 멋, 풍경, 정취를 담은 '감성 수필(3~4문장)'과 그에 어울리는 서정적인 '시(詩) 한 수(제목과 4~5행)'를 작성해주세요.

장소 정보:
- 이름: ${place.name}
- 분류: ${place.categoryLabel || place.category}
- 위치: ${place.address || ''}
- 특징/메뉴: ${place.description || ''} (${place.specialTip || ''})

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

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const text = response.text?.trim() || '';
          const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          return res.json(parsed);
        } catch (apiErr) {
          console.warn('[Server] Poetry Gemini notice (using curated poetic response):', (apiErr as any)?.message || apiErr);
        }
      }

      // Built-in poetic response
      if (isCafe) {
        return res.json({
          foodOrDrink: '핸드드립 원두 & 시그니처 디저트',
          essay: `통유리 너머로 쏟아지는 부드러운 햇살 아래, 갓 내린 커피의 은은한 향기가 온 공간을 포근하게 감싸 안습니다. 쌉싸름하면서도 끝 맛이 달콤한 커피 한 모금에 길 위에서 쌓였던 여독이 봄눈처럼 스르륵 녹아내립니다. 나그네의 분주했던 걸음을 잠시 멈추고 창밖의 풍경을 오래도록 응시하게 만드는, 참으로 다정한 쉼표 같은 공간입니다.`,
          poemTitle: '찻잔에 머무는 풍경',
          poemVerses: [
            '흘러가는 구름 한 점 창가에 걸리고',
            '잔 속에서 피어오르는 짙은 원두의 온기',
            '시간마저 느린 호흡으로 쉬어가는 자리에서',
            '나는 또 하나의 고요를 마음에 새긴다.',
          ],
        });
      } else {
        return res.json({
          foodOrDrink: '제철 향토 만찬 한상',
          essay: `이 땅의 흙과 바다가 길러낸 정갈한 식재료들이 장인의 정성 어린 손끝을 거쳐 탐스러운 한 상으로 피어났습니다. 뚝배기에서 보글보글 솟구치는 구수한 내음과 깊은 감칠맛은 오랜 세월을 지켜온 이 고장 사람들의 따스한 정을 고스란히 전해줍니다. 한술 가득 입에 담을 때마다 여행의 기쁨과 위로가 가슴 깊은 곳까지 차오릅니다.`,
          poemTitle: '그리운 맛의 노래',
          poemVerses: [
            '소박한 질그릇에 담긴 계절의 정성',
            '한 숟가락 감도는 깊고 그윽한 세월',
            '나그네의 주린 여정이 넉넉히 채워지니',
            '먼 길 찾아온 보람이 혀끝에서 춤을 춘다.',
          ],
        });
      }
    } catch (err) {
      console.warn('[Server] Error handling /api/poetry:', err);
      return res.status(500).json({ error: 'Internal poetry generation error' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: !!(apiKey && apiKey.trim().length > 5),
      timestamp: new Date().toISOString(),
    });
  });

  // In development, hook Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    // In production, serve dist assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gilbeot Travel Server] running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
