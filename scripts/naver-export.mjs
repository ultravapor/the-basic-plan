#!/usr/bin/env node
/**
 * naver:export — 발행된 글을 네이버 블로그 붙여넣기용 텍스트로 변환한다.
 * 마크다운 문법을 제거하고(네이버 에디터는 마크다운을 모름), 한 문장 한 줄을 유지하며,
 * 맨 끝에 원문 출처 링크를 붙여 중복 문서 이슈를 완화한다.
 *
 *   node scripts/naver-export.mjs <slug>     # 특정 글 변환
 *   node scripts/naver-export.mjs            # 발행 가능한 slug 목록 출력
 *
 * 결과는 naver-export/<slug>.txt 로 저장되고, 앞부분을 콘솔에 보여준다.
 * 사용법: 파일을 열어 전체 복사 → 네이버 글쓰기에 붙여넣기 → 이미지·소제목 서식만 손보고 발행.
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const OUTDIR = join(ROOT, 'naver-export');
const SITE = 'https://the-basic-plan.vercel.app';

function parse(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { fm, body: m[2] };
}

// 인라인 마크다운 제거: 링크 → 텍스트, 굵게/기울임 기호 제거
function inline(s) {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // [text](url) → text
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // **bold** → bold
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')  // *italic* → italic
    .replace(/`([^`]+)`/g, '$1');
}

function toNaver(body) {
  const lines = body.split('\n');
  const out = [];
  let inFence = false;
  for (let raw of lines) {
    const t = raw.trimStart();
    if (t.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) { out.push(raw); continue; }
    if (/^#{1,6}\s/.test(t)) {                     // 소제목
      out.push('');
      out.push('■ ' + inline(t.replace(/^#{1,6}\s+/, '')));
      out.push('');
      continue;
    }
    if (/^\|/.test(t)) {                            // 표
      if (/^\|[\s:|-]+\|?$/.test(t)) continue;      // 구분선 제거
      const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inline(c.trim()));
      out.push('· ' + cells.join('  →  '));
      continue;
    }
    if (/^-\s\[[ x]\]\s/.test(t)) { out.push('☐ ' + inline(t.replace(/^-\s\[[ x]\]\s+/, ''))); continue; } // 체크박스
    if (/^[-*+]\s/.test(t)) { out.push('· ' + inline(t.replace(/^[-*+]\s+/, ''))); continue; }             // 불릿
    if (/^\d+[.)]\s/.test(t)) { out.push(inline(t)); continue; }                                            // 번호목록
    if (/^>\s?/.test(t)) { out.push(inline(t.replace(/^>\s?/, ''))); continue; }                            // 인용
    out.push(inline(raw));
  }
  // 과도한 빈 줄 정리
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    const files = (await readdir(POSTS)).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
    console.log('발행 가능한 slug (' + files.length + '개):\n');
    console.log(files.map((f) => '  ' + f).join('\n'));
    console.log('\n사용: node scripts/naver-export.mjs <slug>');
    return;
  }
  const path = join(POSTS, slug + '.md');
  if (!existsSync(path)) { console.error('없는 글:', slug); process.exit(1); }
  const { fm, body } = parse(await readFile(path, 'utf8'));
  const naverBody = toNaver(body);
  const src = `${SITE}/posts/${slug}/`;
  const text =
    (fm.title || slug) + '\n\n' +
    naverBody + '\n\n' +
    '────────────────────\n' +
    '이 글의 원문(더베이직플랜): ' + src + '\n' +
    '※ 붙여넣은 뒤 소제목 서식과 이미지만 손봐서 발행하세요.\n';

  if (!existsSync(OUTDIR)) await mkdir(OUTDIR, { recursive: true });
  const outPath = join(OUTDIR, slug + '.txt');
  await writeFile(outPath, text, 'utf8');
  console.log('저장: naver-export/' + slug + '.txt  (' + text.length + '자)\n');
  console.log('── 미리보기 (앞부분) ──\n');
  console.log(text.split('\n').slice(0, 18).join('\n'));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
