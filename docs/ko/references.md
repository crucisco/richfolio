---
title: 참고 자료
layout: default
nav_order: 9
lang: ko
permalink: /references.html
---

# 참고 자료 및 선행 작업

richfolio의 설계와 구축 과정에서 참고한 오픈 소스 저장소와 글입니다. 각 모듈을 만들기 전에 먼저 읽어 보세요 — 어려운 부분은 이미 다른 사람들이 풀어놓았습니다.

---

## 🥇 [ghostfolio/ghostfolio](https://github.com/ghostfolio/ghostfolio) ⭐ ~15k

> Angular + NestJS + Prisma + TypeScript

오픈 소스 자산 관리 앱의 골드 스탠다드입니다. *사용*하고 싶지는 않겠지만 (Docker + Postgres가 필요한 풀 셀프 호스팅 웹 앱입니다), 포트폴리오 데이터를 대규모로 모델링하는 방법에 대한 최고의 참고 자료입니다. 또한 실제 환경에서 `yahoo-finance2`를 가장 많이 사용하는 사례이므로, issue와 PR이 훌륭한 디버깅 자료입니다.

**참고할 만한 부분:**
- 포트폴리오와 보유 종목 데이터 모델 (목표 vs 실제 배분을 어떻게 표현하는가)
- Yahoo Finance 패칭 패턴과 배칭 전략
- ETF, 주식, 암호화폐를 하나의 인터페이스 아래에서 어떻게 통일적으로 다루는가
- 배분 계산과 성과 지표 로직

**관련 소스 경로:** `apps/api/src/app/portfolio/`, `libs/common/src/lib/`

---

## 🥈 [TraderAlice/OpenAlice](https://github.com/TraderAlice/OpenAlice) ⭐ ~3.8k

> TypeScript + Claude SDK + Multi-Broker (Alpaca, IBKR, CCXT) + 파일 기반 상태

직접 거래를 실행하는 자율 AI 트레이딩 에이전트로, 기술적 지표, 펀더멘털 데이터, 구조화된 AI 추론을 결합한 다층 분석 접근법을 사용합니다. OpenAlice의 아키텍처는 순수한 자동화보다 설명 가능성, 안전성, 감사 가능성을 우선시합니다 — 모든 결정이 추적 가능하고, 모든 가드가 설정 가능하며, 전체 추론 과정이 가시화되어 있습니다.

**Richfolio의 여섯 가지 기능에 직접적인 영감을 주었습니다:**

- **두 단계 Think/Plan AI 프롬프팅** — OpenAlice의 `think`와 `plan` 도구는 관찰과 의사결정을 분리합니다. 1단계는 시장 데이터에 대한 관찰을 기록하고, 2단계는 옵션을 평가하고 액션에 커밋합니다. Richfolio는 이를 두 개의 순차적 Gemini 호출로 적용합니다: Observe(구조화된 신호 추출) → Decide(관찰에 규칙 적용). 이 분리는 STRONG BUY 기준의 일관성을 크게 개선합니다.

- **AI 사후 가드 검증 파이프라인** — OpenAlice의 `guard-pipeline.ts`는 브로커 실행 전에 순차 검증 검사(포지션 크기 한도, 쿨다운 기간, 심볼 화이트리스트)를 실행하며, 컨텍스트 격리를 통해 가드가 실수로 거래를 트리거하지 않도록 합니다. Richfolio의 `guards.ts`는 이를 6가지 사후 검사로 적용합니다: 채권 ETF 상한, 실적 임박, STRONG BUY 기준 강제, STRONG BUY 최대 2개, 신뢰도 정상화, 매수 금액 정상화.

- **실적 캘린더 인식** — OpenAlice의 주식 리서치 도구(`equity.ts`)는 고위험 이벤트 동안 포지션 보유를 피하기 위해 실적 캘린더를 확인합니다. Richfolio는 기존 Yahoo Finance 호출에 `calendarEvents`를 추가하고 실적 근처에서는 추천에 하드 상한을 두었습니다 (≤3일 → HOLD, ≤7일 → STRONG BUY 없음).

- **뉴스 감성 점수화** — OpenAlice는 뉴스 파이프라인에서 구조화된 감성 분석을 사용합니다. Richfolio는 Gemini 뉴스 필터를 이분법적 관련성에서 기사별 감성(강세/약세/중립) + 영향도(높음/중간/낮음) 점수화로 업그레이드했습니다.

- **추론 이력 영속화 (Brain/Memory)** — OpenAlice의 `Brain.ts`는 감정 상태와 세션을 가로질러 유지되는 워킹 메모리를 Git과 유사한 커밋으로 추적합니다. Richfolio는 이를 7일 롤링 AI 추론 스냅샷 이력으로 적용하여 의사결정 프롬프트에 확신 추세를 보여줍니다.

- **추가 기술 지표들** — OpenAlice의 공식 기반 지표 시스템(`calculator.ts`)은 기본 MACD/RSI를 넘어 ATR, 스토캐스틱 등을 지원합니다. Richfolio는 변동성 컨텍스트를 위한 ATR(14), 과매도/과매수 확인을 위한 스토캐스틱(%K/%D), 매집/분산 감지를 위한 OBV 추세를 추가했습니다 — 모두 기존 차트 데이터로부터.

**채택한 핵심 아키텍처 통찰:** OpenAlice의 가드 파이프라인 설계 원칙 — 가드는 브로커 객체를 결코 보지 않고 오직 `GuardContext`만 봅니다 — 는 Richfolio의 접근 방식과 자연스럽게 매핑됩니다: 가드는 추천 데이터와 리포트 컨텍스트를 받을 뿐, 원시 API 객체를 보지 않습니다. 이 격리는 가드 로직이 의도치 않은 부작용을 일으키는 것을 막아줍니다.

---

## 🥉 [gadicc/yahoo-finance2](https://github.com/gadicc/yahoo-finance2) ⭐ ~1.5k

> 모든 가격과 펀더멘털 패칭에 사용되는 실제 TypeScript 라이브러리

포트폴리오 앱은 아니지만 핵심 의존성입니다. 완전한 타입 지원, 활발한 유지보수, Node/serverless에서 동작. README가 사용 가능한 모든 `quoteSummary` 서브모듈을 문서화합니다.

**richfolio의 핵심 서브모듈:**

| 서브모듈 | 필요한 필드 |
|----------|-------------|
| `summaryDetail` | `trailingPE`, `forwardPE`, `fiftyTwoWeekHigh`, `fiftyTwoWeekLow`, `marketCap`, `dividendYield` |
| `financialData` | `currentPrice`, `targetMeanPrice`, `recommendationKey`, `returnOnEquity`, `debtToEquity`, `freeCashflow`, `operatingCashflow`, `profitMargins`, `revenueGrowth`, `earningsGrowth` |
| `defaultKeyStatistics` | `enterpriseToEbitda`, `priceToBook`, `beta`, `fiveYearAvgDividendYield` |
| `price` | `regularMarketPrice`, `regularMarketChangePercent` |

**참고할 만한 부분:**
- 어느 서브모듈이 어떤 필드를 반환하는가 (ETF에는 P/E가 없음 — 우아하게 처리)
- 레이트 리미트를 피하기 위해 `quoteSummary` 호출을 효율적으로 배칭하는 방법
- BTC/ETH 티커 형식: `BTC-USD`, `ETH-USD` 사용
- AMZN이지 AMAZ가 아님 (현재 보유 종목 설정의 티커 정정)

---

## 🎖️ [T1mn/MarketPulse](https://github.com/T1mn/MarketPulse) ⭐ 234

> Python + Gemini AI + Finnhub + 푸시 알림

"fork하지 말 것"으로 평가되었습니다 (Python 데몬, 중국 푸시 앱, 포트폴리오 인식 없음). 하지만 AI 뉴스 요약 프롬프트 패턴은 TypeScript 뉴스 다이제스트에서 직접 재사용 가능합니다.

**참고할 만한 부분:**
- 티커별 뉴스 분석을 위한 Gemini 프롬프트 구조 → 출력: 투자 조언, 신뢰도 점수(%), 출처 신뢰도 점수(%)
- `app_state.json`을 통한 중복 제거 로직 — 여러 아침 실행에 걸쳐 같은 뉴스 기사를 다시 보내지 않는 방법
- 신뢰할 수 있는 출처 목록: Reuters, Bloomberg, WSJ, AP, CNBC, Dow Jones, MarketWatch — `fetchNews.ts`의 기본 `TRUSTED_SOURCES` 필터로 사용

---

## 글

---

### 🧠 [XinGPT (@xingpt)](https://x.com/xingpt) — AI Agent Skills 프레임워크

> [BlockTempo 글](https://www.blocktempo.com/ai-agent-personal-business-productivity-transformation-guide/), 작성자 Joe, [X의 @xingpt](https://x.com/xingpt/status/2025219080421277813)에서 정리

개인 금융을 위해 AI 에이전트에 구조화된 분석 "스킬"을 임베드하는 종합 가이드입니다. 이 글은 명확한 기준과 점수화 룰을 가진 특정 프레임워크를 부여하여 범용 AI를 도메인 전문가로 어떻게 변환할 수 있는지 개괄합니다.

**Richfolio의 두 가지 기능에 직접적인 영감을 주었습니다:**

- **가치 투자 프레임워크** — 글의 "美股價值投資框架"(미국 주식 가치 투자 프레임워크) 개념: 펀더멘털 기준(ROE, 부채 비율, FCF, 해자)을 사용해 A/B/C/D 등급으로 주식을 평가. Richfolio는 이를 Gemini에 공급되는 프롬프트 명령으로 구현하며, 기반 지표로 Yahoo Finance `financialData`를 사용합니다.
- **암호화폐 바닥 신호 모델** — 글의 "比特幣抄底模型"(비트코인 바닥 신호 모델) 개념: 기술적 지표(RSI, 거래량, 이동평균)를 사용해 매집 구간을 감지. Richfolio는 기존 차트 데이터를 사용해 네 가지 바닥 지표로 이를 구현합니다.

**채택한 핵심 통찰:** 별도의 AI 에이전트나 추가 API 호출이 필요 없습니다 — 단일 Gemini 호출에서 프롬프트 명령으로 구조화된 프레임워크를 임베드하는 것만으로도 절제된, 기준 기반의 분석을 만들기에 충분합니다.

---

### 🤖 hvkshetry — Agentic AI for Investment Management

> [Medium 글](https://medium.com/data-science-collective/agentic-ai-for-investment-management-from-concept-to-production-a2713c37cc76) — *Agentic AI for Investment Management: From Concept to Production*

Claude Code와 MCP로 멀티 에이전트 투자 관리 시스템을 구축하는 워크스루로, 전문가 에이전트 역할(`portfolio-manager`, `equity-analyst`, `etf-analyst`, `macro-analyst`), `CLAUDE.md`를 통한 슬래시 명령 오케스트레이션, 그리고 Yahoo Finance + Finnhub + OpenBB로부터의 제로 비용 데이터 소싱을 다룹니다. richfolio가 구축하려는 것과 거의 직접적으로 유사합니다.

**Richfolio의 접근 방식에 영향을 준 부분:**
- 에이전틱 개발 워크플로우를 위한 `CLAUDE.md` 오케스트레이션 패턴
- 주식 vs ETF 분석을 어떻게 분해할 것인가 (ETF는 P/E를 건너뛰고 다른 신호를 사용)
- 매크로 데이터를 구체적인 포트폴리오 포지션 코멘트와 연결하는 방법

---

## 이 참고 자료들이 영향을 준 설계 결정

| 결정 | 영향원 |
|------|--------|
| 펀더멘털에 Finnhub 대신 `yahoo-finance2` 사용 | ghostfolio (대규모로 검증), yahoo-finance2 문서 |
| ETF는 P/E를 건너뛰고 대신 52주 범위 위치 사용 | ghostfolio 데이터 모델, yahoo-finance2의 ETF 특수성 |
| 원시 헤드라인이 아닌 티커별 AI 뉴스 요약 | MarketPulse 프롬프트 패턴 |
| Claude Code 개발 워크플로우의 슬래시 명령 구조 | hvkshetry의 에이전틱 투자 관리 글 |
| Fork-and-run 모델 (공유 서버 없음) | ghostfolio의 셀프 호스팅 복잡성과의 대비 |
| 별도 에이전트가 아닌 프롬프트 명령으로 분석 스킬 임베드 | XinGPT의 AI Agent Skills 프레임워크 |
| 펀더멘털 기준을 이용한 A–D 가치 투자 등급 | XinGPT의 美股價值投資框架 개념 |
| 다중 지표 감지를 이용한 암호화폐 바닥 신호 | XinGPT의 比特幣抄底模型 개념 |
| 두 단계 Think/Plan AI 프롬프팅 (먼저 관찰 후 결정) | OpenAlice의 think/plan 인지 도구 |
| AI 사후 가드 검증 파이프라인 (6가지 순차 검사) | 컨텍스트 격리가 적용된 OpenAlice의 guard-pipeline |
| 실적 캘린더 가드 (실적 근처에서 하드 상한) | OpenAlice의 주식 리서치 실적 인식 |
| 뉴스 감성 점수화 (기사별 강세/약세/중립) | OpenAlice의 구조화된 감성 분석 |
| 7일 추론 영속화 (확신 추세) | OpenAlice의 Brain 모듈 (인지 상태를 커밋으로) |
| ATR + 스토캐스틱 + OBV 지표 | OpenAlice의 공식 기반 지표 확장성 |
| 지수 백오프 적용 Gemini 재시도 | OpenAlice의 일시 오류 분류 패턴 |
