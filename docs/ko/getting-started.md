---
title: 시작하기
layout: default
nav_order: 3
lang: ko
permalink: /getting-started.html
---

# 시작하기

5분 안에 Richfolio를 실행해 보세요 — 코딩이 필요 없습니다.

---

## 1. 저장소 Fork

[GitHub에서 Richfolio Fork하기](https://github.com/furic/richfolio/fork){: .btn .btn-primary }

이렇게 하면 본인 계정에 사본이 만들어지고, 그 안에서 포트폴리오를 설정하고 GitHub Actions로 자동화된 일일 브리핑을 실행할 수 있습니다.

---

## 2. 포트폴리오 설정

GitHub에서 목표 배분과 현재 보유 종목을 설정합니다. 자세한 필드 참고는 [설정](configuration)을 보세요.

![GitHub Actions Variables](../screenshots/github_actions_variables.png){: style="max-width: 500px; display: block; margin: 16px auto;" }

---

## 3. API 키 추가

API 키를 GitHub Secret으로 추가합니다. 최소한 `RESEND_API_KEY`가 필요합니다. 각 서비스의 단계별 가이드는 [API 키](api-keys)를 참고하세요.

![GitHub Actions Secrets](../screenshots/github_actions_secrets.png){: style="max-width: 500px; display: block; margin: 16px auto;" }

---

## 4. 배포

GitHub Actions를 활성화하면 자동화된 일일 브리핑, 장중 알림, 주간 리포트를 받게 됩니다. 자세한 설정은 [배포](deployment)를 보세요.

---

## 다음 단계

- [설정](configuration) — 포트폴리오 설정을 커스터마이징하기
- [API 키](api-keys) — Resend, NewsAPI, Gemini, Telegram 설정하기
- [배포](deployment) — GitHub Actions로 자동화하기
- [로컬 개발](local-development) — 로컬에서 실행하거나 기여하기
