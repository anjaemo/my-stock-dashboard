# 📝 바둑이 주식 대시보드 - 개선 TODO

코드 분석(script.js 2,714줄 / index.html 546줄 / style.css 1,766줄 / GAS.js 225줄) 기반, 우선순위별로 정리했습니다.

---

## 🔴 P0: 긴급 / 보안·안정성

### 1. XSS 취약점 — `innerHTML` + 템플릿 리터럴 조합
- `script.js` 내 `innerHTML = \`...${data}...\``  패턴이 **25곳 이상** 존재
- `data.name`, `data.ticker`, `item.name` 등은 구글 시트 → 사용자가 직접 입력하는 값
- 시트에 `<img src=x onerror=alert(1)>` 같은 값이 들어가면 그대로 실행됨
- **조치**:
  - `textContent` 사용, 혹은 `escapeHtml()` 헬퍼 유틸 추가 후 모든 사용자 값 래핑
  - 또는 `<template>` + `cloneNode` 기반 렌더링으로 리팩터링

### 2. API Key / Spreadsheet ID 노출
- `GAS.js`에 7개의 구글 시트 ID가 하드코딩 (`accountMap`)
- `config.sample.js`의 `gasApiKey`는 있으나 GAS 서버에서 **검증하지 않음** (아무나 POST 가능)
- **조치**:
  - GAS `doPost` 진입부에서 `data.apiKey` 검증 로직 추가
  - `.gitignore`에 `config.js` 포함되어 있는지 재확인
  - GAS 코드는 Script Properties에 ID 저장 후 `PropertiesService.getScriptProperties()` 로 읽기

### 3. CORS 프록시 의존성 (`allorigins.win`, `corsproxy.io`)
- 외부 공용 프록시는 언제든 중단·변조 가능 (공급망 리스크)
- **조치**:
  - GAS 프록시 경로 우선순위 1로 유지, 공용 프록시는 명시적 opt-in
  - 또는 Cloudflare Worker 같은 자체 프록시 구축

### 4. `fetch` with `mode: 'no-cors'` (GAS 호출)
- `handleTransactionSubmit` / `requestMarketRefresh`에서 `no-cors` 사용 → **응답을 읽을 수 없음**
- 현재 "성공" UI는 실제 성공 여부와 무관하게 표시됨
- **조치**: GAS Web App을 `Anyone` 액세스로 배포하고 CORS 헤더 설정 후 정상 fetch로 전환

---

## 🟠 P1: 구조·유지보수성

### 5. `script.js` 단일 파일 2,714줄 — 모듈 분리 필요
- 포트폴리오 / MDD / SP500 / KOSPI / 차트 / 모달 / 폼이 한 파일에 혼재
- **제안 구조**:
  ```
  src/
    api/ (fetchWithFallback, parseYahooData, GAS)
    modules/ (summary, holdings, mdd, sp500, kospi200, heatmap)
    charts/ (historyChart, bubbleChart, sparkline, modalChart)
    utils/ (format, mask, sort)
    main.js
  ```
- ESM 모듈로 분리 후 Vite로 번들. 서빙은 여전히 GitHub Pages로 가능.

### 6. 전역 변수 남용
- `globalHoldings`, `usdKrwRate`, `rawHistoryData`, `sp500Data`, `kospi200Data`, `holdingsAnalysisData`, 각종 `sortState`, `currentSlide` 등이 모두 최상위 전역
- **조치**: `const Store = { holdings: [], fx: 1400, ... }` 싱글턴 객체로 캡슐화, 또는 간단한 pub-sub 패턴

### 7. 매직 넘버 / 컬럼 인덱스 하드코딩
- `processHoldingsData` 에서 `row[7]`, `row[8]`, `row[9]`, `row[10]`, `row[14]` 등 의미 불명
- `renderHistoryChartWithRange` 의 `row[11]` (배당금)도 동일
- **조치**: 상단에 상수 매핑 정의
  ```js
  const HOLDINGS_COL = { NAME: 0, TICKER: 1, SHARES: 3, AVG_COST: 4, ..., WEIGHT: 9, PROFIT: 14 };
  ```

### 8. DOM 요소 반복 조회
- `document.getElementById(...)` 가 렌더 함수마다 반복 호출됨
- **조치**: 초기화 시점에 `refs = { eval: $('#card-eval-val'), ... }` 캐싱

### 9. Race Condition 가능성 — `fetchHoldingsAnalysisData`
- 사용자가 탭 전환을 빠르게 하면 이전 요청이 완료되며 최신 상태를 덮어쓸 수 있음
- **조치**: `AbortController` + request id 세대 관리

### 10. 차트 메모리 누수 위험
- `sparklineCharts[canvasId]` 재생성 시 기존 인스턴스를 try-catch로만 처리
- `switchHoldingsView`로 테이블로 전환 시 스파크라인 차트가 정리되지 않음
- **조치**: view 전환 시 `Object.values(sparklineCharts).forEach(c => c.destroy())` 호출

---

## 🟡 P2: 성능·UX

### 11. 10년치 히스토리를 모든 종목에 대해 매번 페칭
- `fetchHoldingsAnalysisData` 는 보유 종목 N개에 대해 각각 10년 일봉(≈2500개) 다운로드
- 네트워크·파싱·RSI/MDD 계산 부담 큼
- **조치**:
  - `localStorage` 에 티커별 일자 기반 캐시 (`expires_at` 포함)
  - 당일 캐시 hit 시 스킵
  - IndexedDB 사용 검토 (용량 제한 회피)

### 12. 차트 리사이즈 비용
- `window.dispatchEvent(new Event('resize'))` 를 탭 전환마다 호출 → 모든 Chart.js 인스턴스 재계산
- **조치**: 활성 탭의 차트만 resize 호출하도록 대상 지정

### 13. 메인 폰트 CDN
- `cdn.jsdelivr.net/gh/orioncactus/pretendard` 로드 실패 시 폴백 없음
- **조치**: `font-display: swap` + 로컬 시스템 폰트 폴백 명시

### 14. 스파크라인 데이터가 가짜(Random noise 기반)
- `generateSparklineData` 는 수익률·일변동만 가지고 랜덤 경로를 생성
- "실제 주가 흐름"으로 오해할 소지
- **조치**: Yahoo 5일 차트 데이터를 받아서 실 데이터 표시, 혹은 레이블 명시 ("simulated")

### 15. 초기 로딩 UX
- 스켈레톤은 일부 카드에만 적용
- `data_snapshot.json` 을 사용하지만 렌더 경로에서 명시적으로 부르지 않음
- **조치**: 캐시가 없을 때 스냅샷으로 즉시 렌더 → 라이브 데이터로 덮어쓰기

### 16. 모바일 테이블 가독성
- `data-label` 로 반응형 처리는 되어 있으나, 비중/수익률 열 정렬이 섞임
- **조치**: CSS `font-variant-numeric: tabular-nums` 적용, 숫자 우측 정렬 통일

### 17. 환율 의존 계산의 fallback
- `usdKrwRate > 100` 체크는 초기값 1400과 구분 안 됨
- API 실패 시 stale 값으로 잘못된 원/달러 병기 표시 가능
- **조치**: 갱신 성공 시 `usdKrwRateUpdatedAt` 기록 → 30분 이상 오래된 값은 별도 표시

---

## 🟢 P3: 코드 퀄리티

### 18. 중복 함수 — SP500 / KOSPI200 정렬·렌더가 거의 동일
- `sortSP500` / `sortKOSPI200`, `renderSP500Table` / `renderKOSPI200Table` 로직 중복
- **조치**: `createStockIndexTab({tableId, data, sortState, isKRW})` 팩토리로 통합

### 19. `sortHoldings` 와 `sortHoldingsAnalysis` 역시 중복 패턴
- 범용 `sortByColumn(array, state, numericKeys)` 유틸로 추출

### 20. `console.log` / `console.warn` 프로덕션에도 노출
- 최소 30여 개 로그가 그대로 존재
- **조치**: `DEBUG = true` 플래그 기반 logger 혹은 빌드 시 제거

### 21. 에러 처리 불일치
- 어떤 실패는 `alert()`, 어떤 건 `showToast()`, 또 어떤 건 `console.warn` 만
- **조치**: 에러 레벨(info/warn/error) 기준으로 `showToast` 일원화

### 22. `GAS.js` 내부도 2곳에 같은 `accountMap` 선언됨
- 상단에 `const ACCOUNT_MAP = {...}` 단일 소스로 이동

### 23. 미사용 / 죽은 코드
- `fetchFromSupabase` 는 정의만 있고 호출되지 않음 → 제거 또는 실 사용처 마련
- `forceAuth()`, `authTest()` 도 운영 시점에 의미 불명

### 24. `update_sp500.js` / `update_kospi200.js` 중복
- GitHub Actions 워크플로도 대동소이할 가능성이 높음
- 공용 모듈로 `updateIndex(market)` 추출

### 25. `backup_20260501/` 폴더
- 구식 백업은 git 히스토리로 관리하고 리포지토리에서 제거

### 26. package.json
- `name/version` 만 있고 `type`, `main`, 린트·포매터 스크립트 없음
- **조치**: ESLint + Prettier 추가, `npm run lint`, `npm run format` 정의

### 27. 일관성 없는 통화 판별
- `/^\d{6}/.test(ticker)` 패턴이 5곳 이상 반복
- `isKoreanStock(ticker)` 유틸 함수로 추출

### 28. Chart.js 인스턴스 관리
- `summaryChart`, `historyChart`, `bubbleChart`, `mddChart`, `recoveryChart`, `intradayChart` 가 전역 let
- **조치**: `chartRegistry.destroy(id)` / `chartRegistry.create(id, cfg)` 패턴

---

## 🔵 P4: 접근성·국제화

### 29. 접근성 (a11y)
- 테이블 헤더에 `scope="col"` 누락
- 탭은 `<button class="tab-btn">` 이지만 `role="tab"`, `aria-selected`, `aria-controls` 없음
- 모달은 focus trap / `aria-modal="true"` 미적용 → 키보드 사용자가 탭으로 배경으로 나감
- 차트는 `<canvas>` 만 있고 대체 텍스트/표 형태 데이터 요약 없음
- **조치**: WAI-ARIA 패턴 적용, 모달 focus management 추가

### 30. 색상 대비
- `#94a3b8` on `#0f172a` 는 약 4.5:1 경계선 → WCAG AA 통과하지만 작은 텍스트는 재검토 필요
- 수익/손실을 색상으로만 구분 → 색각 이상자를 위해 ↑/↓ 아이콘 보강 (일부 반영됨)

### 31. i18n 준비 부족
- 한국어 문자열이 JS·HTML 곳곳에 섞여 있음
- 당장은 불필요해도 `i18n.js` 에 키로 분리해두면 유지보수에 유리

---

## 🛠 P5: 개발 환경·배포

### 32. 테스트 전무
- 유닛 테스트 없음. 리팩터링 시 회귀 감지 불가
- **조치**: Vitest + JSDOM, 최소 `parseSafeFloat`, `calculateRSIValue`, `calculateMDDAndRecovery`, `formatTicker` 부터 테스트

### 33. CI가 GitHub Actions 데이터 갱신 워크플로 1개뿐
- **조치**: push 시 `npm run lint`, `npm run test`, HTML validator 구동

### 34. 타입 안전성
- 순수 JS → JSDoc으로 시작해서 점진적 TypeScript 마이그레이션 고려
- 이미 일부 함수는 JSDoc 주석이 있음 (일관성만 맞추면 됨)

### 35. 빌드 파이프라인
- 현재 `python3 -m http.server` 로 서빙 → CSS/JS minify, cache-busting 미적용
- **조치**: Vite + `vite build` 로 전환, GitHub Pages 자동 배포 워크플로 추가

### 36. `config.js` 관리
- sample 파일은 있으나 최초 실행 가이드가 README에 없음(README.md 부재)
- **조치**: README.md 생성, 셋업/배포/GAS 권한 순서 정리

---

## 🎯 우선순위 요약 (제안)

| 순서 | 항목 | 근거 |
|------|------|------|
| 1 | XSS 방어 (#1) + GAS API Key 검증 (#2) | 개인 금융 데이터 노출 위험 |
| 2 | `config.js` 노출 점검 + `no-cors` 응답 처리 (#4) | 데이터 무결성 |
| 3 | script.js 모듈 분리 + 테스트 셋업 (#5, #32) | 이후 모든 작업 기반 |
| 4 | 캐싱 전략 (#11) | 체감 성능 가장 큰 효과 |
| 5 | 중복 함수 추상화 (#18, #19, #27) | 유지보수 비용 절감 |
| 6 | 접근성 (#29) | 장기적 품질 |

---

## 📌 참고

- 분석 대상: `script.js`, `index.html`, `style.css`, `GAS.js`, `update_*.js`, `package.json`, `config.sample.js`
- 분석 일: 2026-05-11
- 현재 상태: 기능은 충분히 동작하나, 단일 파일 크기 · 전역 상태 · XSS 위험이 앞으로 가장 큰 부채가 될 가능성이 높음
