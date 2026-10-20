1. 루트 설정 파일 (Root Configuration)
package.json
프로젝트의 메타데이터(이름, 버전)와 npm 의존성 라이브러리(react, react-dom, @testing-library, typescript 등)를 정의합니다.
실행 스크립트(yarn start, yarn build, yarn test, yarn eject), 브라우저 지원 범위(browserslist), ESLint 설정을 관리합니다.
tsconfig.json
TypeScript 컴파일러 옵션 설정 파일입니다.
컴파일 타깃(target: es5), 엄격 모드(strict: true), JSX 렌더링 방식(jsx: react-jsx), 모듈 해석 방식 등을 지정합니다.
yarn.lock
패키지 매니저(Yarn)로 의존성을 설치할 때 각 패키지의 정확한 버전 트리를 고정하여 환경에 상관없이 일관된 패키지가 설치되도록 보장합니다.
.gitignore
Git 저장소에 추적/커밋하지 않을 대상(node_modules/, 빌드 산출물 build/, .env.local, 로그 파일 등)을 지정합니다.
README.md
CRA에서 기본 제공하는 프로젝트 안내 및 주요 스크립트 실행 가이드 문서입니다.
2. 소스 코드 디렉터리 (src/)

애플리케이션의 핵심 로직과 화면 UI 코드가 작성되는 디렉터리입니다.

src/index.tsx
React 앱의 **최상위 진입점(Entry Point)**입니다.
public/index.html의 <div id="root"> 요소를 찾아 React 루트를 생성하고 최상위 컴포넌트인 App을 렌더링합니다.
src/App.tsx
화면에 렌더링되는 **루트 컴포넌트(Root Component)**입니다. 현재는 CRA 기본 화면(회전하는 로고와 안내 링크)이 구성되어 있으며, 이후 실제 페이지나 컴포넌트 레이아웃으로 변경하여 사용합니다.
src/App.css
App.tsx 컴포넌트에 적용되는 스타일시트입니다 (배경색, 텍스트 정렬, 로고 회전 애니메이션 등).
src/index.css
전체 애플리케이션에 적용되는 전역(Global) CSS입니다. body 태그의 여백 초기화(margin: 0), 기본 폰트 패밀리, 폰트 안티에일리어싱 등을 정의합니다.
src/logo.svg
App.tsx 화면 중앙에 표시되는 공식 React SVG 벡터 로고 파일입니다.
src/react-app-env.d.ts
TypeScript 타입 선언 파일입니다. react-scripts의 타입 참조(/// <reference types="react-scripts" />)를 통해 .svg, .png 같은 이미지 파일이나 정적 리소스를 TypeScript에서 import할 때 타입 오류가 발생하지 않도록 지원합니다.
src/reportWebVitals.ts
웹 성능 지표(Core Web Vitals: CLS, FID, FCP, LCP, TTFB)를 측정하여 콘솔 로그로 확인하거나 분석 서버로 전송할 수 있게 돕는 유틸리티입니다.
src/setupTests.ts
단위 테스트 환경 설정 파일입니다. Jest에서 DOM 노드 상태를 쉽게 검증할 수 있도록 @testing-library/jest-dom 커스텀 매처를 로드합니다.
src/App.test.tsx
App.tsx 컴포넌트에 대한 기본 단위 테스트 코드입니다. 화면에 "learn react" 텍스트가 정상 렌더링되는지 확인합니다.
3. 정적 자원 디렉터리 (public/)

Webpack 번들러를 거치지 않고 브라우저에 직접 정적으로 제공되는 파일들입니다.

public/index.html
SPA(Single Page Application)의 기본 HTML 템플릿입니다. 브라우저가 접속할 때 가장 먼저 불러오는 단일 HTML 파일로, 내부에 React 컴포넌트가 마운트될 <div id="root"></div>가 위치합니다.
public/favicon.ico
웹 브라우저 탭 상단 및 즐겨찾기에 표시되는 파비콘 아이콘입니다.
public/manifest.json
PWA(Progressive Web App) 설정 파일입니다. 사용자가 웹사이트를 모바일 또는 데스크톱 홈 화면에 바로가기/앱 형태로 추가할 때 사용되는 이름, 테마 색상, 아이콘 크기 등을 정의합니다.
public/robots.txt
검색 엔진 크롤러(Googlebot 등)에게 웹사이트 내 크롤링 허용/차단 범위를 안내하는 검색 엔진 제어 파일입니다.
public/logo192.png / public/logo512.png
manifest.json에서 참조하는 모바일 홈 화면 설치용 192x192, 512x512 해상도의 아이콘 이미지입니다.