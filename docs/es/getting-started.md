---
title: Primeros pasos
layout: default
nav_order: 3
lang: es
permalink: /getting-started.html
---

# Primeros pasos

Pon Richfolio en marcha en menos de 5 minutos — sin necesidad de programar.

---

## 1. Haz fork del repositorio

[Hacer fork de Richfolio en GitHub](https://github.com/furic/richfolio/fork){: .btn .btn-primary }

Esto crea tu propia copia donde puedes configurar tu portafolio y ejecutar resúmenes diarios automatizados vía GitHub Actions.

---

## 2. Configura tu portafolio

Define tus asignaciones objetivo y tus tenencias actuales en GitHub. Consulta [Configuración](configuration) para la referencia completa de campos.

![Variables de GitHub Actions](../screenshots/github_actions_variables.png){: style="max-width: 500px; display: block; margin: 16px auto;" }

---

## 3. Agrega las claves de API

Agrega tus claves de API como GitHub Secrets. Como mínimo necesitas `RESEND_API_KEY`. Consulta [Claves de API](api-keys) para instrucciones paso a paso de cada servicio.

![GitHub Actions Secrets](../screenshots/github_actions_secrets.png){: style="max-width: 500px; display: block; margin: 16px auto;" }

---

## 4. Despliega

Habilita GitHub Actions para recibir resúmenes diarios automatizados, alertas intradía y reportes semanales. Consulta [Despliegue](deployment) para los detalles de configuración.

---

## Qué sigue

- [Configuración](configuration) — personaliza las asignaciones de tu portafolio
- [Claves de API](api-keys) — configura Resend, NewsAPI, Gemini y Telegram
- [Despliegue](deployment) — automatiza con GitHub Actions
- [Desarrollo local](local-development) — ejecuta localmente o contribuye
