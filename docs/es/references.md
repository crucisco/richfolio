---
title: Referencias
layout: default
nav_order: 9
lang: es
permalink: /references.html
---

# Referencias y trabajo previo

Repositorios de código abierto y artículos referenciados durante el diseño y construcción de richfolio. Léelos antes de construir cada módulo — ya resolvieron las partes difíciles.

---

## 🥇 [ghostfolio/ghostfolio](https://github.com/ghostfolio/ghostfolio) ⭐ ~15k

> Angular + NestJS + Prisma + TypeScript

El gold standard de las apps de gestión de patrimonio open source. No quieres *usarla* (es una web app de auto-hospedaje completa que requiere Docker + Postgres), pero es la mejor referencia para resolver el modelado de datos de portafolio a escala. También es el mayor consumidor de `yahoo-finance2` en producción, así que sus issues y PRs son un excelente recurso de debugging.

**Qué aprovechar de ahí:**
- Modelos de datos de portafolio y holdings (cómo representar asignación objetivo vs real)
- Patrones de fetching de Yahoo Finance y estrategia de batching
- Cómo manejan ETFs, acciones y cripto uniformemente bajo una interfaz
- Lógica de cálculo de asignación y métricas de rendimiento

**Rutas de código fuente relevantes:** `apps/api/src/app/portfolio/`, `libs/common/src/lib/`

---

## 🥈 [TraderAlice/OpenAlice](https://github.com/TraderAlice/OpenAlice) ⭐ ~3.8k

> TypeScript + Claude SDK + Multi-Broker (Alpaca, IBKR, CCXT) + Estado basado en archivos

Un agente de trading IA autónomo que ejecuta trades directamente, usando un enfoque de análisis multicapa que combina indicadores técnicos, datos fundamentales y razonamiento IA estructurado. La arquitectura de OpenAlice prioriza la explicabilidad, la seguridad y la auditabilidad sobre la automatización pura — cada decisión es trazable, cada guardia es configurable, y todo el proceso de razonamiento es visible.

**Inspiró directamente seis funcionalidades de Richfolio:**

- **Prompting de IA Think/Plan en dos etapas** — Las herramientas `think` y `plan` de OpenAlice separan observación de toma de decisión. La Etapa 1 registra observaciones sobre datos de mercado; la Etapa 2 evalúa opciones y se compromete a acciones. Richfolio lo adapta como dos llamadas Gemini secuenciales: Observar (extraer señales estructuradas) → Decidir (aplicar reglas a las observaciones). Esta separación mejora significativamente la consistencia de los criterios STRONG BUY.

- **Pipeline de validación de guardias post-IA** — El `guard-pipeline.ts` de OpenAlice corre verificaciones de validación secuenciales (límites de tamaño de posición, períodos de cooldown, whitelist de símbolos) antes de la ejecución del broker, con aislamiento de contexto previniendo que las guardias disparen trades accidentalmente. El `guards.ts` de Richfolio adapta esto como 6 verificaciones post-IA: tope de bond ETF, proximidad de earnings, aplicación de criterios STRONG BUY, máximo 2 STRONG BUY, cordura de confianza y cordura del monto de compra.

- **Conciencia del calendario de earnings** — Las herramientas de equity research de OpenAlice (`equity.ts`) verifican el calendario de earnings para evitar mantener posiciones durante eventos de alto riesgo. Richfolio agrega `calendarEvents` a la llamada existente de Yahoo Finance y aplica topes duros a las recomendaciones cerca de earnings (≤3d → HOLD, ≤7d → sin STRONG BUY).

- **Puntuación de sentimiento de noticias** — OpenAlice usa análisis estructurado de sentimiento en su pipeline de noticias. Richfolio upgradea el filtro de noticias de Gemini de relevancia binaria a puntuación de sentimiento (alcista/bajista/neutral) + impacto (alto/medio/bajo) por artículo.

- **Persistencia de razonamiento (cerebro/memoria)** — El `Brain.ts` de OpenAlice rastrea el estado cognitivo vía commits estilo Git con estado emocional y memoria de trabajo que persiste entre sesiones. Richfolio lo adapta como un historial rodante de 7 días de snapshots de razonamiento de IA, mostrando tendencias de convicción en el prompt de decisión.

- **Indicadores técnicos adicionales** — El sistema de indicadores basado en fórmulas de OpenAlice (`calculator.ts`) soporta ATR, Stochastic y otros indicadores más allá de MACD/RSI básico. Richfolio agrega ATR(14) para contexto de volatilidad, Stochastic (%K/%D) para confirmación de sobreventa/sobrecompra, y tendencia OBV para detección de acumulación/distribución — todo desde los datos de chart existentes.

**Insight arquitectónico clave adoptado:** El principio de diseño del pipeline de guardias de OpenAlice — las guardias nunca ven el objeto del broker, solo un `GuardContext` — mapea limpiamente al enfoque de Richfolio donde las guardias reciben datos de recomendación y contexto del reporte, no objetos crudos de API. Este aislamiento previene que la lógica de guardias tenga efectos secundarios no intencionados.

---

## 🥉 [gadicc/yahoo-finance2](https://github.com/gadicc/yahoo-finance2) ⭐ ~1.5k

> La librería TypeScript real usada para todo el fetching de precios y fundamentales

No es una app de portafolio sino la dependencia central. Completamente tipada, mantenida activamente, funciona en Node/serverless. El README documenta cada submódulo de `quoteSummary` disponible.

**Submódulos clave para richfolio:**

| Submódulo | Campos que necesitamos |
|-----------|---------------|
| `summaryDetail` | `trailingPE`, `forwardPE`, `fiftyTwoWeekHigh`, `fiftyTwoWeekLow`, `marketCap`, `dividendYield` |
| `financialData` | `currentPrice`, `targetMeanPrice`, `recommendationKey`, `returnOnEquity`, `debtToEquity`, `freeCashflow`, `operatingCashflow`, `profitMargins`, `revenueGrowth`, `earningsGrowth` |
| `defaultKeyStatistics` | `enterpriseToEbitda`, `priceToBook`, `beta`, `fiveYearAvgDividendYield` |
| `price` | `regularMarketPrice`, `regularMarketChangePercent` |

**Qué aprovechar de ahí:**
- Qué submódulos devuelven qué campos (P/E ausente en ETFs — manejar elegantemente)
- Cómo agrupar llamadas `quoteSummary` eficientemente para evitar rate limits
- Formato de ticker BTC/ETH: usar `BTC-USD`, `ETH-USD`
- AMZN no AMAZ (corrección de ticker en la config de tenencias actuales)

---

## 🎖️ [T1mn/MarketPulse](https://github.com/T1mn/MarketPulse) ⭐ 234

> Python + Gemini AI + Finnhub + notificaciones push

Ya evaluado como "no hacer fork" (daemon Python, apps de push chinas, sin conciencia de portafolio). Pero el patrón de prompt de resumen de noticias con IA es directamente reusable en nuestro resumen de noticias en TypeScript.

**Qué aprovechar de ahí:**
- Estructura de prompt Gemini para análisis de noticias por ticker → outputs: consejo de inversión, puntuación de confianza (%), puntuación de confiabilidad de la fuente (%)
- Lógica de deduplicación vía `app_state.json` — cómo evitar reenviar la misma historia de noticias entre múltiples corridas matutinas
- Lista de fuentes confiables: Reuters, Bloomberg, WSJ, AP, CNBC, Dow Jones, MarketWatch — usar esto como el filtro `TRUSTED_SOURCES` default en `fetchNews.ts`

---

## Artículos

---

### 🧠 [XinGPT (@xingpt)](https://x.com/xingpt) — Marco de Habilidades para AI Agents

> [Artículo de BlockTempo](https://www.blocktempo.com/ai-agent-personal-business-productivity-transformation-guide/) por Joe, compilado de [@xingpt en X](https://x.com/xingpt/status/2025219080421277813)

Una guía comprehensiva sobre embeber "habilidades" analíticas estructuradas en AI agents para finanzas personales. El artículo describe cómo transformar una IA de propósito general en un experto de dominio dándole marcos específicos con criterios claros y rúbricas de puntuación.

**Inspiró directamente dos funcionalidades de Richfolio:**

- **Marco de inversión en valor** — el concepto "美股價值投資框架" (Marco de inversión en valor de acciones estadounidenses) del artículo: calificar acciones usando criterios fundamentales (ROE, ratio de deuda, FCF, moat) con grados A/B/C/D. Richfolio implementa esto como instrucciones de prompt alimentadas a Gemini, usando `financialData` de Yahoo Finance para las métricas subyacentes.
- **Modelo de bottom-fishing de cripto** — el concepto "比特幣抄底模型" (Modelo de bottom-fishing de Bitcoin) del artículo: detectar zonas de acumulación usando indicadores técnicos (RSI, volumen, medias móviles). Richfolio implementa esto usando datos de chart existentes con cuatro indicadores de fondo.

**Insight clave adoptado:** No necesitas AI agents separados o llamadas API adicionales — embeber marcos estructurados como instrucciones de prompt en una única llamada Gemini es suficiente para producir análisis disciplinado y basado en criterios.

---

### 🤖 hvkshetry — Agentic AI para Gestión de Inversiones

> [Artículo de Medium](https://medium.com/data-science-collective/agentic-ai-for-investment-management-from-concept-to-production-a2713c37cc76) — *Agentic AI for Investment Management: From Concept to Production*

Un walkthrough de construir un sistema de gestión de inversiones multi-agente con Claude Code y MCP, cubriendo roles de agentes especialistas (`portfolio-manager`, `equity-analyst`, `etf-analyst`, `macro-analyst`), orquestación de slash commands vía `CLAUDE.md`, y obtención de datos a costo cero desde Yahoo Finance + Finnhub + OpenBB. Casi directamente análogo a lo que richfolio está construyendo.

**Informó el enfoque de Richfolio para:**
- Patrón de orquestación con `CLAUDE.md` para workflows de desarrollo agéntico
- Cómo descomponer análisis de equity vs ETF (los ETFs saltan P/E, usan señales diferentes)
- Conectar datos macro con comentarios específicos de posición del portafolio

---

## Decisiones de diseño informadas por estas referencias

| Decisión | Informado por |
|----------|-------------|
| Usar `yahoo-finance2` no Finnhub para fundamentales | ghostfolio (probado a escala), docs de yahoo-finance2 |
| Saltar P/E para ETFs, usar posición de rango 52w en su lugar | modelo de datos de ghostfolio, peculiaridades de ETFs en yahoo-finance2 |
| Resumir con IA noticias por ticker, no headlines crudos | patrón de prompt de MarketPulse |
| Estructura de slash commands para workflow de desarrollo con Claude Code | artículo de gestión de inversiones agéntica de hvkshetry |
| Modelo fork-and-run (sin servidor compartido) | Contraste con la complejidad de auto-hospedaje de ghostfolio |
| Embeber habilidades analíticas como instrucciones de prompt, no agentes separados | Marco de habilidades para AI agents de XinGPT |
| Calificación A-D de inversión en valor usando criterios fundamentales | concepto 美股價值投資框架 de XinGPT |
| Bottom-fishing de cripto con detección multi-indicador | concepto 比特幣抄底模型 de XinGPT |
| Prompting de IA Think/Plan en dos etapas (observar luego decidir) | herramientas cognitivas think/plan de OpenAlice |
| Pipeline de validación de guardias post-IA (6 verificaciones secuenciales) | guard-pipeline con aislamiento de contexto de OpenAlice |
| Guardia de calendario de earnings (tope duro cerca de earnings) | conciencia de earnings del equity research de OpenAlice |
| Puntuación de sentimiento de noticias (alcista/bajista/neutral por artículo) | análisis estructurado de sentimiento de OpenAlice |
| Persistencia de razonamiento de 7 días (tendencias de convicción) | módulo Brain de OpenAlice (estado cognitivo como commits) |
| Indicadores ATR + Stochastic + OBV | extensibilidad de indicadores basados en fórmulas de OpenAlice |
| Reintento de Gemini con backoff exponencial | patrón de clasificación de errores transitorios de OpenAlice |
