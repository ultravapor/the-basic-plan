#!/usr/bin/env node
/**
 * IndexNow 제출 — Bing·네이버·Yandex에 "새 글/갱신" 즉시 핑.
 * (Google은 IndexNow 미지원 → 사이트맵·색인요청으로 별도 처리)
 *
 * URL 목록은 로컬 dist/sitemap-0.xml(빌드 후) 우선, 없으면 라이브 사이트맵을 가져온다.
 *   node scripts/indexnow.mjs
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const HOST = 'the-basic-plan.vercel.app';
const KEY = '3f8a860ab113a389903e6b88951bf772';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function getUrls() {
  const local = join(ROOT, 'dist', 'sitemap-0.xml');
  if (existsSync(local)) {
    return extractLocs(await readFile(local, 'utf8'));
  }
  const res = await fetch(`https://${HOST}/sitemap-0.xml`);
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  return extractLocs(await res.text());
}

async function main() {
  const urlList = await getUrls();
  if (urlList.length === 0) throw new Error('제출할 URL이 없습니다.');

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });

  // IndexNow는 200/202를 성공으로 본다 (본문 없음)
  console.log(`IndexNow 제출: ${urlList.length}개 URL → HTTP ${res.status}`);
  if (res.status === 200 || res.status === 202) {
    console.log('✓ 접수됨 (Bing·네이버·Yandex)');
  } else {
    console.log('응답:', (await res.text()).slice(0, 300));
  }
}

main().catch((e) => {
  console.error('IndexNow 오류:', e.message);
  process.exit(1);
});
