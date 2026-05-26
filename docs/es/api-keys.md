---
title: Claves de API
layout: default
nav_order: 5
lang: es
permalink: /api-keys.html
---

# Claves de API

Richfolio usa hasta 5 servicios externos, todos con planes gratuitos generosos. Solo Resend y un correo destinatario son requeridos — todo lo demás es opcional.

Agrega cada clave como Secret del repositorio: Settings → Secrets and variables → Actions → pestaña **Secrets**. Agrega `RECIPIENT_EMAIL` como **Variable** (más fácil de ver/editar).

![GitHub Actions Secrets](../screenshots/github_actions_secrets.png){: style="max-width: 500px; display: block; margin: 16px auto;" }

---

## Resend (correo) — Requerido
{: .text-green-200}

Resend entrega los reportes de correo HTML.

1. Ve a [resend.com](https://resend.com) y regístrate
2. Navega a **API Keys** en el dashboard
3. Haz clic en **Create API Key**, ponle un nombre y copia la clave
4. Agrégala como GitHub Secret — nombre: `RESEND_API_KEY`, valor: la clave que acabas de copiar

**Plan gratuito:** 3,000 correos/mes. Envía desde `onboarding@resend.dev` por defecto. Solo puede enviar a tu **correo de propietario de cuenta** a menos que verifiques un dominio personalizado (Dashboard → Domains → Add Domain → agregar registros DNS).

---

## Correo destinatario — Requerido
{: .text-green-200}

Agrégalo como **Variable** de GitHub (no Secret): nombre: `RECIPIENT_EMAIL`, valor: tu dirección de correo.

Debe coincidir con el correo de tu cuenta Resend a menos que hayas verificado un dominio personalizado.

---

## NewsAPI (headlines) — Opcional
{: .text-yellow-200}

Provee los top headlines por ticker para el resumen diario.

1. Ve a [newsapi.org](https://newsapi.org) y regístrate
2. Tu clave API se muestra en el dashboard inmediatamente
3. Agrégala como GitHub Secret — nombre: `NEWS_API_KEY`, valor: la clave del dashboard

**Plan gratuito:** 100 requests/día. Richfolio usa ~4 requests por corrida vía batching. Headlines solo de las últimas 24 horas. Si no está configurada, el resumen corre sin noticias.

---

## Google Gemini (análisis de IA) — Opcional
{: .text-yellow-200}

Impulsa las recomendaciones de compra con IA con Gemini 2.5 Flash.

1. Ve a [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Haz clic en **Create API Key**, selecciona un proyecto de Google Cloud (o crea uno)
3. Copia la clave y agrégala como GitHub Secret — nombre: `GEMINI_API_KEY`, valor: la clave que acabas de copiar

**Plan gratuito:** 250 requests/día, 10 requests/minuto. Richfolio usa 1 request por corrida (más 1 por ticker STRONG BUY para análisis detallado). Las claves nuevas pueden tardar unos minutos en activar su cuota (podrías ver errores 429 inicialmente). Si no está configurada o la cuota se agotó, cae a recomendaciones basadas en brechas.

### Una nota sobre los niveles de modelo de Gemini

La página de precios de Google indica que Gemini 2.5 Pro es ["Free of charge"](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro) tanto para tokens de entrada como de salida. En la práctica, sin embargo, los requests Pro del plan gratuito frecuentemente chocan con errores `429 RESOURCE_EXHAUSTED` — incluso con uso mínimo. Google no publica los límites reales de RPD (requests por día) para el plan gratuito; fuentes de terceros sugieren que Pro puede estar limitado a ~100 RPD, pero el número real parece variar por cuenta y no está garantizado.

**Richfolio usa Gemini 2.5 Flash para todas las llamadas de IA** (tanto análisis principal como análisis detallado de STRONG BUY) porque Flash tiene una cuota de plan gratuito más generosa y confiable. La diferencia de calidad para texto de análisis financiero es despreciable.

### Usar un modelo de IA diferente

Si tienes un plan Gemini de pago o quieres usar un proveedor diferente por completo, el modelo es fácil de intercambiar. Las llamadas de IA viven en dos archivos:

- `src/aiAnalysis.ts` — recomendaciones principales de compra (línea ~225)
- `src/detailedAnalysis.ts` — análisis detallado de STRONG BUY (línea ~119)

**Para cambiar a Gemini Pro** (si tienes cuota de pago):

```typescript
// En ambos archivos, cambia:
model: "gemini-2.5-flash",
// A:
model: "gemini-2.5-pro",
```

**Para cambiar a Claude u otro proveedor**, reemplazarías las llamadas a `@google/genai` con el SDK de tu proveedor. Por ejemplo, con el SDK de Anthropic:

```typescript
// npm install @anthropic-ai/sdk
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // usa la variable de entorno ANTHROPIC_API_KEY
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
});
```

El prompt y la lógica de parseo JSON permanecen iguales — solo cambia la llamada API. Agrega la clave API de tu proveedor como GitHub Secret.

---

## Bot de Telegram — Opcional
{: .text-yellow-200}

Entrega resúmenes condensados a tu cuenta de Telegram.

### Crear el bot

1. Abre Telegram y busca **@BotFather**
2. Envía `/newbot`
3. Elige un nombre (p. ej., "Richfolio Brief") y un username (debe terminar en `bot`, p. ej., `richfolio_brief_bot`)
4. BotFather responde con tu token de bot — cópialo

### Obtener tu chat ID

1. Busca **@userinfobot** en Telegram e inícialo
2. Te responde con tu ID numérico de usuario — este es tu chat ID

**Importante:** Envía cualquier mensaje a tu nuevo bot (p. ej., "hi") antes de correr Richfolio — esto es necesario antes de que el bot pueda enviarte mensajes.

Agrega ambos como GitHub Secrets:

- Nombre: `TELEGRAM_BOT_TOKEN`, valor: el token de BotFather
- Nombre: `TELEGRAM_CHAT_ID`, valor: tu ID numérico de usuario

**Notas:** Si no están configurados, el resumen salta Telegram. Los mensajes son resúmenes condensados (no HTML completo). Límite de 4,096 caracteres por mensaje — las noticias se truncan si es necesario.

---

## Resumen

| Clave | Requerido | Servicio |
|-----|----------|---------|
| `RESEND_API_KEY` | Sí | Entrega de correo |
| `RECIPIENT_EMAIL` | Sí | Tu dirección de correo |
| `NEWS_API_KEY` | No | Headlines de noticias |
| `GEMINI_API_KEY` | No | Recomendaciones de compra con IA |
| `TELEGRAM_BOT_TOKEN` | No | Entrega Telegram |
| `TELEGRAM_CHAT_ID` | No | Entrega Telegram |
