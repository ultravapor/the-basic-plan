#!/usr/bin/env node
/**
 * 스테이징 마크다운 → GEO 칼럼(Astro 포스트) 자동 리라이팅 (선택 기능)
 *
 * homho-main 참고구현의 'geo' 모드를 정적 사이트용으로 포팅. LLM은 REST로 호출해
 * 추가 SDK 의존성이 없다. Gemini Flash 우선(참고구현 실측 권장), 없으면 OpenAI.
 *
 *   GEMINI_API_KEY=... node scripts/naver-rewrite.mjs .staging/파일.md
 *   OPENAI_API_KEY=... node scripts/naver-rewrite.mjs .staging/파일.md --model gpt-4o
 *
 * 키가 없으면 실행을 멈추고, Claude에게 리라이팅을 맡기는 방법을 안내한다(기본 경로).
 * 결과: src/content/posts/<slug>.md (status draft: true 로 저장 → 검수 후 false)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');

/* ── .env 자동 로드 (gitignore 됨; 키를 셸 히스토리에 남기지 않음) ── */
(function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

/* ── 스테이징 파일 파싱 (source 헤더 + 본문) ── */
function parseStaging(text) {
  const meta = {};
  for (const m of text.matchAll(/^(source_url|source_title|source_date|suggested_slug):\s*(.*)$/gm)) {
    meta[m[1]] = m[2].trim();
  }
  // 첫 '# 제목' 이후를 본문으로
  const bodyStart = text.indexOf('\n# ');
  const body = bodyStart >= 0 ? text.slice(bodyStart).replace(/^\n# .*\n/, '') : text;
  return { meta, body: body.trim() };
}

/* ── geo 모드 지침 (참고구현 AEO·GEO 지침서 요약본) ── */
const GEO_RULES = `너는 전문 서비스(의원·클리닉 등) 홈페이지의 GEO 콘텐츠 에디터다.
네이버 블로그 원본을 AI 답변엔진(ChatGPT·Claude·Perplexity·Gemini)이 인용하기 좋은
홈페이지 칼럼용 구조화 JSON으로 재구성한다.

핵심 원칙(Princeton GEO 검증):
- 핵심 주장마다 통계/인용구/출처 중 1개 이상 (있는 사실만, 날조 금지)
- 각 섹션 첫 1~2문장에 결론 먼저(BLUF)
- 헤딩은 질문형·결론요약형
- 시맨틱 트리플(주어-동사-목적어) 문장, 대명사 남발 금지
- 고유명사(지역·시술·병원명)는 그대로 유지, 추상어로 대체 금지
- 키워드 도배 무효`;

function geoUserPrompt(md) {
  return `아래 네이버 원본 글을 홈페이지 GEO 칼럼용 구조화 JSON으로 재구성하라.
반드시 아래 스키마의 순수 JSON만 출력한다(설명·코드펜스 금지):

{
  "title": "검색 질문형 제목(핵심 키워드 포함)",
  "slug": "제목 핵심 키워드 영문/숫자만, 케밥케이스",
  "category": "주제 1~2단어",
  "description": "메타설명 150~160자, 클릭할 이유 있는 문장",
  "keyAnswer": "제목 질문에 대한 완결 답변 2~3문장(결론 먼저)",
  "tldr": ["핵심요약1","핵심요약2","핵심요약3"],
  "keywords": ["키워드1","키워드2","키워드3"],
  "sections": [{"heading":"질문형 소제목","md":"본문 마크다운(짧은 문단·리스트·표 활용, 이미지 제외)"}],
  "faq": [{"q":"결정 직전 실용 질문","a":"1~3문장, 첫 문장에 정답"}]
}

규칙:
1. sections 3~4개, 각 첫 문장 결론 먼저. 비교·정리할 데이터가 있으면 최소 1개 섹션에 표(마크다운 table)를 넣는다.
2. faq 3~5개 — 가격대/기간/부작용/적합대상/비교/사후관리 등 실용 질문만. "○○이 뭔가요" 금지.
3. 전체 본문(keyAnswer+tldr+sections)은 1500자 내외로 밀도있게 압축.
4. 날조 금지: 원본에 없는 통계·수치·가격·브랜드를 만들지 마라.
5. 가독성(사람이 읽기 좋게 — 반드시):
   - sections의 md는 **문단을 2~3문장으로 짧게** 끊고, 문단 사이는 반드시 빈 줄(\\n\\n)로 분리한다. 긴 문단 금지.
   - 단계·항목·조건 나열은 **불릿(-) 또는 번호 리스트**로 쪼갠다.
   - 점검·준비 항목처럼 하나씩 확인하는 성격이면 **체크리스트(- [ ] 항목)** 형태를 쓴다.
   - 비교는 산문 대신 **표**로. 표·리스트를 적극 활용해 한 화면에 글이 빽빽하지 않게 한다.

원본 글(마크다운):
${md}`;
}

/* ── LLM 호출 (Gemini 우선, OpenAI 대체) ── */
async function callLLM(system, user, modelFlag) {
  const gk = process.env.GEMINI_API_KEY;
  const ok = process.env.OPENAI_API_KEY;
  if (gk) {
    const model = modelFlag || 'gemini-3.6-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gk}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  }
  if (ok) {
    const model = modelFlag || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ok}` },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return j.choices?.[0]?.message?.content ?? '{}';
  }
  return null; // 키 없음
}

function toFrontmatterPost(a) {
  const today = new Date().toISOString().slice(0, 10);
  const esc = (s) => String(s ?? '').replace(/"/g, '\\"');
  const kw = (a.keywords ?? []).map((k) => `"${esc(k)}"`).join(', ');
  const faq = (a.faq ?? [])
    .map((f) => `  - q: "${esc(f.q)}"\n    a: "${esc(f.a)}"`)
    .join('\n');
  const tldr = (a.tldr ?? []).map((t) => `- ${t}`).join('\n');
  const sections = (a.sections ?? [])
    .map((s) => `## ${s.heading}\n\n${s.md}`)
    .join('\n\n');

  return `---
title: "${esc(a.title)}"
description: "${esc(a.description)}"
answer: "${esc(a.keyAnswer)}"
pubDate: ${today}
keywords: [${kw}]
draft: true
faq:
${faq}
---

${tldr ? `**핵심 요약**\n\n${tldr}\n\n` : ''}${sections}
`;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const modelIdx = args.indexOf('--model');
  const model = modelIdx >= 0 ? args[modelIdx + 1] : undefined;
  if (!file) {
    console.log('사용법: node scripts/naver-rewrite.mjs .staging/<파일>.md [--model <모델>]');
    process.exit(1);
  }

  const raw = await readFile(file, 'utf8');
  const { meta, body } = parseStaging(raw);

  let out = await callLLM(GEO_RULES, geoUserPrompt(body), model);
  if (out === null) {
    console.log(`\n⚠  API 키가 없습니다 (GEMINI_API_KEY 또는 OPENAI_API_KEY).\n`);
    console.log(`기본 경로 — Claude에게 맡기세요 (추가 비용/키 불필요, 품질 최고):`);
    console.log(`  Claude Code 대화창에 이렇게 입력 →`);
    console.log(`  "${file} 를 GEO 칼럼으로 리라이팅해서 src/content/posts 에 발행해줘"\n`);
    console.log(`자동화를 원하면 키를 설정하고 다시 실행:`);
    console.log(`  GEMINI_API_KEY=... node scripts/naver-rewrite.mjs ${file}\n`);
    process.exit(0);
  }

  // 브랜드 표기 통일 (LLMO 엔티티 일관성): "더 베이직 플랜" → "더베이직플랜"
  out = out.replace(/더\s*베이직\s*플랜/g, '더베이직플랜');

  let article;
  try {
    article = JSON.parse(out);
  } catch (e) {
    console.error('LLM이 유효한 JSON을 반환하지 않았습니다:', e.message);
    console.error(out.slice(0, 400));
    process.exit(1);
  }

  const slug = article.slug || meta.suggested_slug || basename(file).replace(/\.md$/, '');
  await mkdir(POSTS, { recursive: true });
  const target = join(POSTS, `${slug}.md`);
  await writeFile(target, toFrontmatterPost(article), 'utf8');
  console.log(`\n✓ 발행(초안): src/content/posts/${slug}.md  [draft: true]`);
  console.log(`  원본: ${meta.source_url || '(unknown)'}`);
  console.log(`  검수 후 frontmatter의 draft: true → 삭제(또는 false)하면 게시됩니다.\n`);
}

main().catch((e) => {
  console.error('오류:', e.message);
  process.exit(1);
});
