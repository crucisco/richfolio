---
title: Configuración
layout: default
nav_order: 4
lang: es
permalink: /configuration.html
---

# Configuración

Richfolio usa una única configuración JSON para todos los datos del portafolio — tu portafolio se mantiene privado.

---

## Configuración inicial

Ve a tu fork: Settings → Secrets and variables → Actions → pestaña **Variables** → crea una variable llamada `CONFIG_JSON` con el contenido JSON de abajo.

## Ejemplo

```json
{
  "targetPortfolio": {
    "VOO": 20,
    "QQQ": 15,
    "GLD": 10,
    "BSV": 20,
    "SMH": 5,
    "BTC": 1.5
  },
  "currentHoldings": {
    "AAPL": 30,
    "VOO": 1,
    "BTC": 0.0002
  },
  "totalPortfolioValueUSD": 50000,
  "intradayAlerts": {
    "enabled": true,
    "confidenceIncreaseThreshold": 10
  }
}
```

---

## Referencia de campos

| Campo | Requerido | Descripción |
|-------|----------|-------------|
| `targetPortfolio` | Sí | Porcentajes de asignación objetivo. Las claves son símbolos de ticker, los valores son porcentajes que deben sumar ~100%. |
| `currentHoldings` | Sí | Número de acciones que posees actualmente. Puede incluir acciones que no están en tu objetivo (p. ej., AAPL para detección de overlap de ETFs). |
| `totalPortfolioValueUSD` | Sí | Tu valor total estimado de portafolio en USD. Se usa para los cálculos de asignación cuando tus tenencias reales son menores que el objetivo. |
| `intradayAlerts` | No | Configuración de alertas intradía (ver abajo). Se aplican defaults si se omite. |

---

## Alertas intradía

La sección `intradayAlerts` controla cuándo las verificaciones intradía envían alertas. Todos los campos son opcionales — se aplican defaults razonables.

Las alertas se disparan solo por cambios relacionados con STRONG BUY:
1. **Upgrade a STRONG BUY** — cualquier otro nivel → STRONG BUY
2. **Downgrade desde STRONG BUY** — STRONG BUY → cualquier otro nivel
3. **Cambio de confianza** — la confianza cambió ≥ umbral mientras se mantiene STRONG BUY

| Campo | Default | Descripción |
|-------|---------|-------------|
| `enabled` | `true` | Toggle maestro. Pon `false` para deshabilitar las alertas intradía por completo. |
| `confidenceIncreaseThreshold` | `10` | Cambio mínimo de confianza (absoluto, puntos porcentuales) para disparar una alerta para tickers STRONG BUY. |

---

## Análisis de refresh

Re-analiza un único ticker con el último precio (incluyendo after-hours/pre-market). Envía correo + Telegram con una nueva URL de análisis.

Actions → Portfolio Monitor → **Run workflow** → mode: `refresh`, ticker: `SMH`.

Se usan `postMarketPrice` y `preMarketPrice` de Yahoo Finance cuando están disponibles. Cae al precio regular de mercado si los datos after-hours no están disponibles.

---

## Formatos de ticker

| Tipo | Formato | Ejemplos |
|------|--------|----------|
| Acciones/ETFs de EE. UU. | Símbolo estándar | `AAPL`, `VOO`, `QQQ`, `SMH` |
| Cripto | Nombre corto | `BTC`, `ETH` (auto-convertidos a `BTC-USD`, `ETH-USD`) |
| Internacional | Símbolo de Yahoo Finance | `0700.HK` (Tencent), `TM` (Toyota) |

---

## Consejos

- **Los porcentajes objetivo** deben sumar 100%. Si no lo hacen, los cálculos de brecha siguen funcionando pero pueden sugerir compras más grandes o más pequeñas.

- **Las tenencias fuera de tu objetivo** se rastrean para la detección de overlap de ETFs. Por ejemplo, tener AAPL reduce la prioridad de compra para ETFs que contienen AAPL (como VOO o QQQ).

- **Acciones fraccionarias** son soportadas — útil para cripto (`"BTC": 0.000188`) o brokers que soportan compras de acciones fraccionarias.

- **El valor del portafolio** usa el mayor entre el valor real de tus tenencias y la estimación configurada. Esto mantiene los cálculos de brecha útiles mientras aún construyes hacia tu asignación objetivo.

<details>
<summary><strong>¿Cuántos tickers puedo agregar?</strong></summary>

<br>

Richfolio funciona mejor con un portafolio enfocado. Aunque no hay un límite codificado, las cuotas de las APIs de plan gratuito y la legibilidad del resumen establecen fronteras prácticas.

**Rangos recomendados:**

| Rango | Veredicto |
|-------|---------|
| **10-20** | Punto óptimo — enfocado, accionable, todos los planes gratuitos cómodos |
| **20-30** | Todavía bien — resumen manejable, bien dentro de los límites |
| **30-50** | Funciona técnicamente, pero el resumen diario se vuelve ruidoso |
| **50+** | No recomendado (ver abajo) |

**Por qué 50+ tickers no se recomienda:**

- **NewsAPI (100 req/día)** — las noticias se obtienen en batches de 5 tickers. Correr daily + intraday con 50 tickers usa ~22 llamadas; a 100 tickers son ~42, dejando poco margen para refreshes.
- **Calidad del análisis de IA** — Gemini produce recomendaciones más diluidas cuando evalúa demasiadas opciones a la vez.
- **Legibilidad del resumen** — el correo se vuelve largo y Telegram trunca en 4,096 caracteres. La relación señal-ruido cae bruscamente.
- **Tiempo de ejecución** — cada ticker requiere llamadas a Yahoo Finance para precio, técnicos y fundamentales, ralentizando tu corrida de GitHub Actions.

El plan gratuito de Gemini (250 req/día, 250K tokens/min) es generoso y es poco probable que sea el cuello de botella — incluso 100 tickers solo usan ~53K tokens por corrida. Las restricciones reales son la cuota de NewsAPI y la sobrecarga de información.

**TL;DR — apunta a ≤30 tickers para la mejor experiencia en todos los planes gratuitos.**

</details>

---

## Actualización

Cuando cambien tus tenencias, actualiza la variable `CONFIG_JSON` con el nuevo contenido JSON (Settings → Secrets and variables → Actions → pestaña Variables).
