---
title: 快速開始
layout: default
nav_order: 3
lang: zh-TW
permalink: /getting-started.html
---

# 快速開始

5 分鐘內就能讓 Richfolio 跑起來 — 不需要寫程式。

---

## 1. Fork 儲存庫

[在 GitHub 上 Fork Richfolio](https://github.com/furic/richfolio/fork){: .btn .btn-primary }

這會建立屬於你自己的副本,你可以在其中設定投資組合,並透過 GitHub Actions 執行自動化的每日簡報。

---

## 2. 設定你的投資組合

在 GitHub 中設定目標配置與目前持倉。完整欄位參考請見[設定說明](configuration)。

![GitHub Actions 變數](../screenshots/github_actions_variables.png){: style="max-width: 500px; display: block; margin: 16px auto;" }

---

## 3. 加入 API 金鑰

將 API 金鑰加入為 GitHub Secret。最少需要 `RESEND_API_KEY`。各項服務的分步說明請見 [API 金鑰](api-keys)。

![GitHub Actions Secret](../screenshots/github_actions_secrets.png){: style="max-width: 500px; display: block; margin: 16px auto;" }

---

## 4. 部署

啟用 GitHub Actions,即可收到自動化的每日簡報、盤中警示和每週報告。設定細節請見[部署](deployment)。

---

## 接下來

- [設定說明](configuration) — 自訂你的投資組合配置
- [API 金鑰](api-keys) — 設定 Resend、NewsAPI、Gemini 和 Telegram
- [部署](deployment) — 透過 GitHub Actions 自動化
- [本機開發](local-development) — 本機執行或參與貢獻
