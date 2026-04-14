# 🐶 바둑이 주식 대시보드 — 개선 TODO

> 마지막 코드 분석 기준: 2026-04-14  
> 우선순위: 🔴 높음 / 🟡 중간 / 🟢 낮음

---

## 🔴 1. 보안 문제

### 1-1. API URL 및 시크릿 하드코딩
- **파일**: `script.js:4-10`, `GAS.js`, `update_data.yml:30-32`
- **문제**: Google Sheets URL, GAS 배포 URL, Spreadsheet ID가 코드에 그대로 노출됨
- **개선**: 환경변수 또는 설정 파일로 분리 (`.env` + GitHub Secrets)
- **위험도**: 공개 저장소인 경우 외부에서 GAS 엔드포인트로 악의적 요청 가능

### 1-2. GAS doPost 입력 검증 부재
- **파일**: `GAS.js:9-115`
- **문제**: `doPost`에 요청 출처 검증/인증이 전혀 없음. 누구든 POST 요청으로 `proxy_yahoo`, `refresh_market`, 거래 기록 삽입이 가능
- **개선**: 간단한 API Key 헤더 검증 또는 요청 도메인 화이트리스트 추가

### 1-3. 트랜잭션 입력 XSS 취약점
- **파일**: `script.js:845-854`
- **문제**: `handleTransactionSubmit`에서 폼 입력값을 검증 없이 그대로 GAS로 전송. GAS에서도 입력 데이터 sanitization 없이 시트에 직접 삽입
- **개선**: 클라이언트/서버 양쪽에서 입력값 타입 및 범위 검증 추가

---

## 🔴 2. 에러 처리 및 안정성

### 2-1. 빈 catch 블록 — 조용한 실패
- **파일**: `script.js:266`, `script.js:353`, `script.js:383`, `script.js:875`
- **문제**: `catch (e) { }` 형태로 에러를 완전히 삼키는 곳이 다수. RSI 계산 실패, 프록시 실패, Yahoo 데이터 파싱 실패 시 원인 추적 불가
- **개선**: 최소한 `console.warn()` 로깅 추가. 사용자에게 영향이 있는 경우 UI 피드백 제공

### 2-2. mode: 'no-cors' 트랜잭션 전송
- **파일**: `script.js:859`
- **문제**: `mode: 'no-cors'`로 전송하면 응답 본문을 읽을 수 없음. 서버 에러(시트 없음, 데이터 형식 오류 등)가 발생해도 클라이언트에서는 항상 "성공"으로 처리됨
- **개선**: GAS 배포를 "누구나 액세스 가능"으로 설정하고 `mode: 'cors'`로 변경하여 실제 응답 확인

### 2-3. data_snapshot.json 폴백 데이터 불완전
- **파일**: `data_snapshot.json`
- **문제**: 스냅샷에 `history` 데이터가 포함되어 있지 않음. 오프라인 폴백 시 히스토리 차트가 빈 화면
- **개선**: GitHub Actions 워크플로우에서 history 데이터도 스냅샷에 포함 (현재 `parseCSV(hist)`는 포함하고 있으나 실제 JSON에 반영 안 됨 — 데이터 크기 이슈 가능)

---

## 🟡 3. 코드 구조 및 유지보수성

### 3-1. 단일 파일 레거시 구조 (877줄)
- **파일**: `script.js`
- **문제**: 데이터 패칭, 파싱, 차트 렌더링, 폼 처리, MDD 분석, S&P 500 분석이 모두 하나의 파일에 혼재
- **개선 방안**:
  ```
  js/
  ├── config.js       # CONFIG, PROXIES 상수
  ├── api.js          # fetchWithFallback, fetchSP500Data
  ├── parser.js       # parseYahooData, parseSafeFloat, parseCSV
  ├── charts.js       # 모든 Chart.js 렌더링 함수
  ├── portfolio.js    # 포트폴리오 탭 로직
  ├── mdd.js          # MDD 분석 탭 로직
  ├── transaction.js  # 매매 기록 폼 처리
  └── main.js         # 초기화, 이벤트 바인딩
  ```

### 3-2. 전역 변수 남용
- **파일**: `script.js:17-24`
- **문제**: `globalHoldings`, `sortState`, `summaryChart`, `historyChart`, `bubbleChart`, `mddChart`, `recoveryChart` 등 7개 전역 변수 사용
- **개선**: ES Module 패턴 또는 클래스/네임스페이스로 캡슐화

### 3-3. 매직 넘버 / 매직 인덱스
- **파일**: `script.js:595-635` (행/열 인덱스), `script.js:666` (row[9], row[8] 등)
- **문제**: `data[8]`, `row[15]`, `row[17]`, `row[9]` 등 시트 컬럼 인덱스가 의미 없는 숫자로 사용됨. 시트 구조가 바뀌면 전체 코드 수정 필요
- **개선**: 컬럼 매핑 상수 정의
  ```javascript
  const COL = { EVAL: 1, INVEST: 2, PROFIT: 3, RATE: 4, DIVIDEND: 11 };
  ```

### 3-4. HTML 인라인 스타일 과다
- **파일**: `index.html:16`, `index.html:115`, `index.html:149`, `script.js:225-238`
- **문제**: `style="position: absolute; top: 20px; ..."` 같은 인라인 스타일이 HTML과 JS 동적 생성 코드에 산재
- **개선**: CSS 클래스로 이동하여 관심사 분리

### 3-5. innerHTML을 이용한 DOM 생성
- **파일**: `script.js:225-239`, `script.js:559-565`, `script.js:647`, `script.js:692`
- **문제**: `innerHTML`로 직접 HTML 문자열 조합. XSS 리스크 + 가독성 저하
- **개선**: `document.createElement()` 또는 템플릿 리터럴 + sanitization 유틸리티 함수 사용

---

## 🟡 4. 성능 최적화

### 4-1. S&P 500 API 요청 과다 (100+건)
- **파일**: `script.js:244-270`
- **문제**: 100개 종목 RSI 계산을 위해 GAS 프록시를 통해 100건의 Yahoo Finance API를 개별 호출. 첫 로드 시 상당한 시간 소요 + API 차단 리스크
- **개선**:
  - RSI 데이터를 서버 사이드(GAS)에서 일괄 캐싱
  - 또는 RSI 계산을 lazy load (뷰포트에 보이는 종목만 로딩)

### 4-2. Chart 객체 메모리 누수 가능성
- **파일**: `script.js:474`, `script.js:487`, `script.js:699`, `script.js:720`, `script.js:767`
- **문제**: `if (chart) chart.destroy()` 패턴은 사용하고 있으나, 탭 전환 시 비활성 탭의 차트가 메모리에 남아있음
- **개선**: 탭 전환 시 비활성 차트 destroy 또는 lazy initialization 적용

### 4-3. 10분 자동 새로고침 무조건 실행
- **파일**: `script.js:93-95`
- **문제**: 브라우저 탭이 비활성 상태여도 10분마다 데이터 fetch 실행. 불필요한 네트워크 요청
- **개선**: `document.visibilityState` 체크하여 활성 탭에서만 새로고침
  ```javascript
  setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
  }, 10 * 60 * 1000);
  ```

---

## 🟡 5. UX/UI 개선

### 5-1. 로딩 상태 피드백 부족
- **파일**: `index.html`, `script.js`
- **문제**: 데이터 로딩 중 스켈레톤 UI나 스피너가 없음. "데이터를 불러오는 중입니다... 멍!" 텍스트만 표시
- **개선**: 스켈레톤 로딩 UI 또는 프로그레스 바 추가

### 5-2. 거래 기록 폼 유효성 검증 부족
- **파일**: `script.js:805-871`, `index.html:179-233`
- **문제**:
  - 티커 선택 드롭다운에서 "직접 입력" 선택 시 텍스트 입력 필드가 `display:none`인 채로 남음 (토글 로직 누락)
  - 수량에 음수 입력 가능
  - 날짜 미래 입력 가능
- **개선**: 입력 필드별 validation 규칙 추가 + 실시간 피드백

### 5-3. 다크모드 미지원
- **파일**: `style.css`
- **문제**: CSS 변수(`--bg-color` 등)를 이미 사용 중이므로 다크모드 추가가 용이
- **개선**: `prefers-color-scheme: dark` 미디어 쿼리 + 토글 버튼 추가

### 5-4. S&P 500 테이블이 HTML에 없음
- **파일**: `index.html`, `script.js:169-170`
- **문제**: `script.js`에서 `#sp500-table tbody`와 `#sp500-status`를 참조하지만, `index.html`에 해당 요소가 존재하지 않음. S&P 500 탭 기능이 사실상 동작하지 않음
- **개선**: S&P 500 탭 UI를 HTML에 추가하거나, 사용하지 않는 코드 제거

### 5-5. 모바일 반응형 미흡
- **파일**: `style.css:240-264`
- **문제**: 600px 이하에서 시장 카드가 2열로 돌아가지만, 차트 높이가 고정(300px, 400px)이라 세로 공간 비효율
- **개선**: 차트 높이를 뷰포트 비율 또는 aspect-ratio로 조정

---

## 🟡 6. 데이터 & 로직 정합성

### 6-1. RSI 계산 방식 정확도
- **파일**: `script.js:283-298`
- **문제**: 단순 SMA 방식 RSI만 사용. 업계 표준인 Wilder의 EMA(지수이동평균) 방식을 사용하지 않아 값이 실제 차트 서비스와 다를 수 있음
- **개선**: EMA 기반 RSI로 전환
  ```javascript
  // EMA: avgGain = (prevAvgGain * (period-1) + currentGain) / period
  ```

### 6-2. 한국주식 6자리 판별 로직
- **파일**: `script.js:402`
- **문제**: `if (/^\d{6}$/.test(ticker)) ticker += ".KS";` — 코스닥 종목은 `.KQ`여야 하는데 모두 `.KS`(코스피)로 처리
- **개선**: 별도 코스닥 목록과 대조하거나, 사용자가 시장 선택할 수 있도록 UI 추가

### 6-3. fetchWithFallback의 응답 판별 불안정
- **파일**: `script.js:316-326`
- **문제**: 응답 내용에 `"chart"`, `"result"` 문자열이 포함되면 JSON으로 판단하는데, CSV 데이터에 해당 단어가 포함될 경우 오판 가능
- **개선**: `Content-Type` 헤더 우선 확인 또는 `JSON.parse` try-catch 방식으로 안전하게 판별

### 6-4. PROXIES 배열 미사용
- **파일**: `script.js:12-15`
- **문제**: 파일 상단에 `PROXIES` 배열이 선언되어 있으나 코드 어디에서도 사용되지 않음 (대신 `fetchWithFallback` 내부에 프록시 URL이 직접 하드코딩)
- **개선**: `PROXIES` 배열 사용으로 통일하거나, 미사용 변수 제거

---

## 🟢 7. GitHub Actions 워크플로우

### 7-1. CSV 파서 커스텀 구현
- **파일**: `update_data.yml:45-65`
- **문제**: 워크플로우 내 인라인 스크립트에서 자체 CSV 파서를 구현. 엣지 케이스(셀 내 줄바꿈, 이스케이프된 따옴표 등) 처리 미흡
- **개선**: `csv-parse` npm 패키지 사용

### 7-2. HTTP 리다이렉트 미처리
- **파일**: `update_data.yml:35-43`
- **문제**: `https.get`은 3xx 리다이렉트를 자동 처리하지 않음. Google Sheets 공개 URL은 리다이렉트되므로 실패 가능
- **개선**: `follow-redirects` 패키지 사용 또는 `node-fetch`로 교체

### 7-3. 에러 시 이전 스냅샷 보존 로직 없음
- **파일**: `update_data.yml:91-100`
- **문제**: 데이터 fetch 실패 시 빈 파일이나 불완전한 JSON이 커밋될 수 있음
- **개선**: 새 스냅샷 검증 후에만 기존 파일 덮어쓰기

---

## 🟢 8. 기능 확장 제안

- [ ] **배당금 달력**: 보유 종목의 예상 배당일을 캘린더 뷰로 표시
- [ ] **포트폴리오 리밸런싱 알림**: 목표 비중 대비 현재 비중 편차 시각화
- [ ] **거래 내역 조회**: 입력한 거래 기록 목록을 대시보드에서 확인/삭제
- [ ] **PWA 지원**: `manifest.json` + Service Worker로 오프라인 사용 가능
- [ ] **환율 자동 적용**: USD 종목 수익액 계산 시 실시간 환율 반영
- [ ] **데이터 내보내기**: 포트폴리오 현황을 CSV/PDF로 다운로드

---

## 🟢 9. 개발 환경 & DX

### 9-1. 린터/포매터 미설정
- **개선**: ESLint + Prettier 설정 추가

### 9-2. 테스트 코드 부재
- **개선**: RSI 계산, CSV 파싱, MDD 통계 등 핵심 로직 유닛 테스트 추가 (Vitest 권장)

### 9-3. CDN 의존성 버전 비고정
- **파일**: `index.html:312-314`
- **문제**: `chart.js`가 버전 없이 로드됨 → 메이저 업데이트 시 깨질 수 있음
- **개선**: 특정 버전 고정 (예: `chart.js@4.4.1`)

### 9-4. README.txt 중복
- **문제**: `README.md`와 `README.txt`가 공존. 내용 불일치 가능
- **개선**: `README.txt` 제거
