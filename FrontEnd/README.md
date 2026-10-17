# React 여행 프런트엔드

Node.js 22.16 이상에서 npm install 후 실행합니다. API 서버는 ../BackEnd/README.md를 참고하세요.

| 환경 | 환경 파일 | 실행 | 빌드 |
| --- | --- | --- | --- |
| 로컬 | .env.local | npm run start::local (또는 start:local) | npm run build:local |
| 개발 | .env.development | npm run start:dev | npm run build:dev |
| 운영 | .env.production | npm run start::prod (또는 start:prod, start:op) | npm run build:prod |

선택한 환경 파일 하나만 읽고 BACKEND_URL을 Vite 프록시 대상으로 사용합니다. /api 기본 대상은 http://127.0.0.1:3001입니다.
DB 접속 정보와 Gemini 키는 BackEnd 환경 파일에만 저장합니다. 실제 환경 파일은 Git에서 제외됩니다.
배포 시 /api를 운영 NestJS로 전달하도록 웹 서버를 설정하세요.
