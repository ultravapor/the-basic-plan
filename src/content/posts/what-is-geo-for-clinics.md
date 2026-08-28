---
title: GEO란 무엇인가 — ChatGPT·Perplexity가 병원을 추천하게 만드는 법
description: GEO(생성엔진 최적화)는 ChatGPT·Perplexity 같은 생성 AI가 병원을 1차 소스로 인용·추천하게 만드는 작업입니다. AEO와의 차이, 병원이 준비할 3가지를 정리했습니다.
answer: GEO는 ChatGPT·Perplexity 같은 생성 AI가 병원을 1차 소스로 인용하게 만드는 최적화입니다. 핵심은 "우리만 가진 정확한 정보"를 안정된 주소에서 인용 가능한 문장 구조로 제공하는 것입니다.
pubDate: 2026-08-24
updatedDate: 2026-08-27
keywords: [GEO, 생성엔진 최적화, ChatGPT 인용, Perplexity, 병원 마케팅]
faq:
  - q: GEO와 AEO는 어떻게 다른가요?
    a: AEO는 검색 결과 상단의 AI 답변 박스(구글·네이버)를 겨냥하고, GEO는 ChatGPT·Perplexity 같은 생성 AI 자체를 겨냥합니다. 겹치는 작업이 많지만 생성엔진은 llms.txt를 읽고 원출처를 더 강하게 우대한다는 차이가 있습니다.
  - q: 병원도 GEO가 필요한가요?
    a: 환자들이 "○○동 임플란트 잘하는 곳" 같은 질문을 점점 AI에게 묻습니다. 그때 AI가 근거로 삼는 페이지가 없으면 추천 목록에 오르지 못합니다. 지역·진료과목 단위에서는 아직 경쟁이 적어 지금이 선점 시점입니다.
---

## GEO는 "AI가 인용하는 원출처"가 되는 일

GEO(Generative Engine Optimization)는 ChatGPT, Perplexity, Claude 같은 생성 AI가
답변을 만들 때 **당신의 페이지를 근거로 인용**하게 만드는 최적화입니다.
검색 순위를 올리는 SEO와 달리, "AI의 답변 안에 병원 이름이 들어가는가"가 목표입니다.

## 병원이 준비할 3가지

### 1. llms.txt — AI에게 주는 안내서

사이트 루트에 `/llms.txt` 파일을 두면, AI 크롤러가 "이 사이트가 무엇의 원출처인지"를
빠르게 파악합니다. 병원이라면 진료과목·지역·대표 정보 페이지를 안내합니다.

### 2. AI 크롤러 허용

`robots.txt`에서 GPTBot·ClaudeBot·PerplexityBot 등을 **허용**해야 인용 대상이 됩니다.
기본 설정을 방치하면 우연에 맡기는 것입니다.

| 크롤러 용도 | 대표 봇 | 막으면 잃는 것 |
|---|---|---|
| 검색 색인 | OAI-SearchBot, PerplexityBot | ChatGPT·Perplexity 검색 인용 |
| 실시간 열람 | ChatGPT-User, Perplexity-User | 답변 시점의 직접 인용 |

### 3. 1차 소스가 되는 문장 구조

AI는 잘 쓴 글이 아니라 **정확한 사실**을 인용합니다. 각 문단이
[주어 + 수치 + 기준일]을 자체적으로 갖추면 그 문단째로 인용됩니다.
"우리 병원은 2015년부터 임플란트 12,000건을 시행했습니다(2026년 8월 기준)" 처럼요.

## 확인 방법

Perplexity나 ChatGPT 검색 모드에 실제 질문을 던져, 출처 목록에 병원 도메인이 뜨는지
확인합니다. 안 뜨면 llms.txt → 크롤러 허용 → 페이지 SSR 여부 순으로 점검합니다.
