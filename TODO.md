# 📝 향후 작업 목록 (TODO)

바둑이 주식 대시보드 프로젝트의 유지보수 및 기능 개선을 위한 작업 목록입니다.

## 🚀 최우선 과제 (High Priority)
- [ ] **에러 핸들링 및 사용자 피드백 강화**: Google Apps Script(GAS)를 통한 매매 기록 추가 시 실패(Timeout 등)에 대한 명확한 UI 에러 메시지 제공(Toast 알림 등).
- [ ] **오프라인 지원 (PWA)**: Service Worker를 도입하여 `data_snapshot.json`을 브라우저에 캐싱, 오프라인 상태에서도 마지막으로 동기화된 대시보드를 볼 수 있도록 개선.
- [ ] **모바일 UI/UX 최적화**: 모바일 뷰(viewport < 768px)에서 보유 종목 테이블(Table)이 가로로 길어질 때 스크롤 UX를 개선하거나 반응형 Card 뷰로 전환.

## 💡 기능 개선 (Enhancements)
- [ ] **다크 모드 / 라이트 모드 토글**: 현재의 Immersive Dark 테마 외에 밝은(Light) 환경을 선호하는 사용자를 위한 테마 토글 기능 추가 (CSS Variables 활용).
- [ ] **차트 고도화 (Chart.js)**:
  - 자산 추이 라인 차트에 툴팁 커스터마이징 (날짜별 상세 변동 내역).
  - 포트폴리오 자산 군(현금/주식/채권)별 계층적 트리맵(Treemap) 차트 도입.
- [ ] **RSI 및 보조 지표 스캐너 모듈화**: 현재 구현된 S&P 500 RSI 스캐너 로직을 분리/모듈화하고, 선택한 다른 종목이나 지수에 대해서도 기술적 지표를 확장 연동.
- [ ] **보안 강화**: 현재 GAS 웹훅이 퍼블릭하게 열려 있으므로, 최소한의 API Key나 인증(Auth) 토큰 메커니즘을 `config.js`와 GAS 스크립트 간에 구현.

## 🔧 리팩토링 및 기술 부채 (Refactoring & Tech Debt)
- [ ] **자바스크립트 모듈화**: `script.js` 파일이 비대해짐에 따라, API Fetch, Chart 렌더링, UI 이벤트 핸들링 등의 책임을 분리하여 ES6 모듈(`import/export`)로 리팩토링.
- [ ] **단위 테스트 (Unit Tests) 도입**: 순수 자바스크립트 함수(특히 CSV 파싱 로직이나 MDD 계산 등 핵심 알고리즘)에 대한 Jest 기반 단위 테스트 작성.
- [ ] **의존성(Dependencies) 업데이트**: PapaParse, Chart.js 등 CDN을 통해 불러오는 외부 라이브러리 버전을 최신으로 고정하고, 필요 시 npm 패키지로 관리하여 번들러(Webpack/Vite) 도입 검토.
