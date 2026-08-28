#!/usr/bin/env node
/**
 * 네이버 블로그 → 스테이징 마크다운 임포터 (scrape 전용, API 키 불필요)
 *
 * homho-main "네이버 리라이팅 참고구현"의 SECTION 1 서버 코어를 정적 사이트
 * 워크플로우에 맞게 포팅한 것. 이미지·저작권 주의: 자기 소유 블로그에만 사용.
 *
 * 사용법:
 *   node scripts/naver-import.mjs list <블로그URL 또는 blogId> [--pages 2]
 *   node scripts/naver-import.mjs scrape <글URL>            → .staging/ 에 저장
 *   node scripts/naver-import.mjs scrape <글URL> --stdout   → 화면에 출력
 *
 * scrape 결과는 .staging/<slug>-<logNo>.md 로 저장된다. 그 파일을 Claude에게
 * "GEO로 리라이팅해서 발행해줘" 하면 src/content/posts/ 에 최종 글이 생성된다.
 */

import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STAGING = join(ROOT, '.staging');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const RESERVED = new Set([
  'PostList.naver', 'PostView.naver', 'GoBlogWrite.naver',
  'PostTitleListAsync.naver', 'PostList', 'PostView',
]);

/* ── blogId 추출 ── */
function extractBlogId(input) {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (host === 'blog.naver.com' || host === 'm.blog.naver.com') {
      const q = url.searchParams.get('blogId');
      if (q && /^[A-Za-z0-9_-]+$/.test(q)) return q;
      const seg = url.pathname.split('/').filter(Boolean)[0];
      if (seg && !RESERVED.has(seg) && /^[A-Za-z0-9_-]+$/.test(seg)) return seg;
    }
  } catch {}
  if (/^[A-Za-z0-9_-]+$/.test(raw)) return raw;
  return null;
}

/* ── logNo 추출 (scrape용) ── */
function extractLogNo(input) {
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    const q = url.searchParams.get('logNo');
    if (q && /^\d+$/.test(q)) return q;
    const segs = url.pathname.split('/').filter(Boolean);
    const last = segs[segs.length - 1];
    if (last && /^\d+$/.test(last)) return last;
  } catch {}
  const m = String(input).match(/(\d{6,})/);
  return m ? m[1] : null;
}

/* ── 네이버 비표준 JSON 정리 ── */
function sanitizeNaverJson(text) {
  return text.replace(/\\(?!["\\/bfnrtu])/g, '');
}

/* ── HTML 엔티티 디코드 (목록 제목의 &#39; 등) ── */
function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

/* ── 스크랩 마크다운 정리 (네이버 특유 노이즈 제거) ── */
function cleanMarkdown(md) {
  return md
    .replace(/​/g, '')            // zero-width space
    .replace(/\[\]\(#\)/g, '')          // 빈 링크 [](#)
    .replace(/[ \t]+$/gm, '')           // 줄 끝 공백
    .replace(/\n{3,}/g, '\n\n')         // 3+ 빈 줄 → 1개
    .trim();
}

async function getHtml(url) {
  const doFetch = () =>
    fetch(url, {
      headers: { Referer: 'https://blog.naver.com', 'User-Agent': UA, 'Accept-Encoding': 'identity' },
    });
  let res = await doFetch();
  if (!res.ok && (res.status === 403 || res.status === 429)) {
    await new Promise((r) => setTimeout(r, 1000));
    res = await doFetch();
  }
  if (!res.ok) throw new Error(`naver http ${res.status}`);
  return res.text();
}

/* ── 글 목록 ── */
async function fetchPostList(blogId, page = 1) {
  const params = new URLSearchParams({
    blogId, viewdate: '', currentPage: String(page), categoryNo: '0', countPerPage: '30',
  });
  const doFetch = () =>
    fetch(`https://blog.naver.com/PostTitleListAsync.naver?${params}`, {
      headers: { Referer: 'https://blog.naver.com', 'User-Agent': UA, 'Accept-Encoding': 'identity' },
    });
  let res = await doFetch();
  if (!res.ok && (res.status === 403 || res.status === 429)) {
    await new Promise((r) => setTimeout(r, 1000));
    res = await doFetch();
  }
  if (!res.ok) throw new Error(`naver http ${res.status}`);
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(sanitizeNaverJson(raw));
  } catch (e) {
    throw new Error(`naver json parse failed: ${e.message}`);
  }
  if (data.resultCode !== 'S') throw new Error('blogId 확인 필요 (resultCode !== S)');
  const list = data.postList ?? [];
  return {
    posts: list.map((p) => ({
      logNo: p.logNo,
      title: decodeEntities(decodeURIComponent(String(p.title).replace(/\+/g, ' '))),
      addDate: p.addDate,
      url: `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${p.logNo}`,
    })),
    hasMore: list.length === 30,
  };
}

/* ── iframe(mainFrame) 안의 실제 본문 페이지로 진입 ── */
async function resolveContentHtml(url) {
  const first = await getHtml(url);
  const $ = cheerio.load(first);
  const frame = $('iframe#mainFrame').attr('src');
  if (!frame) return first;
  const inner = frame.startsWith('http') ? frame : `https://blog.naver.com${frame}`;
  return getHtml(inner);
}

function createTurndown() {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
  td.addRule('drop-images', { filter: 'img', replacement: () => '' });
  return td;
}

async function scrapePost(url) {
  const html = await resolveContentHtml(url);
  const $ = cheerio.load(html);
  const title =
    $('.se-title-text').first().text().trim() ||
    $('.pcol1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    '제목 없음';
  const body =
    $('.se-main-container').first().html() ||
    $('#postViewArea').first().html() ||
    $('#viewTypeSelector').first().html() ||
    '';
  if (!body || body.trim().length < 20) {
    throw new Error('본문 컨테이너를 찾지 못했습니다. 글이 비공개이거나 구조가 다릅니다.');
  }
  const markdown = cleanMarkdown(createTurndown().turndown(body));
  const publishedAt =
    $('.se_publishDate').first().text().trim() ||
    $('meta[property="article:published_time"]').attr('content') ||
    '';
  return { title, markdown, publishedAt };
}

/* ── 제목 → 슬러그 (영문/숫자만; 한글이면 logNo 기반 fallback) ── */
function deriveSlug(title, logNo) {
  const ascii = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (ascii && /[a-z0-9]/.test(ascii)) return ascii.slice(0, 60);
  return `naver-${logNo || Date.now()}`;
}

/* ── CLI ── */
async function main() {
  const [cmd, target, ...rest] = process.argv.slice(2);
  const flags = new Set(rest);

  if (cmd === 'list') {
    const blogId = extractBlogId(target);
    if (!blogId) throw new Error('blogId를 추출하지 못했습니다. 블로그 주소나 아이디를 확인하세요.');
    const pagesIdx = rest.indexOf('--pages');
    const pages = pagesIdx >= 0 ? Number(rest[pagesIdx + 1]) || 1 : 1;
    console.log(`\n블로그: ${blogId}\n`);
    let n = 0;
    for (let p = 1; p <= pages; p++) {
      const { posts, hasMore } = await fetchPostList(blogId, p);
      for (const post of posts) {
        n++;
        console.log(`${String(n).padStart(3)}. ${post.title}`);
        console.log(`     ${post.addDate}  ${post.url}`);
      }
      if (!hasMore) break;
    }
    console.log(`\n총 ${n}개. scrape 하려면:\n  node scripts/naver-import.mjs scrape "<위 URL>"\n`);
    return;
  }

  if (cmd === 'scrape') {
    if (!target) throw new Error('글 URL을 넣으세요.');
    const logNo = extractLogNo(target);
    const { title, markdown, publishedAt } = await scrapePost(target);
    const slug = deriveSlug(title, logNo);
    const header =
      `<!-- SOURCE (리라이팅 후 삭제) -->\n` +
      `source_url: ${target}\n` +
      `source_title: ${title}\n` +
      `source_date: ${publishedAt}\n` +
      `suggested_slug: ${slug}\n` +
      `<!-- ↑ 이 스테이징 파일을 Claude에게 "GEO로 리라이팅해서 발행해줘" 하세요 -->\n\n` +
      `# ${title}\n\n${markdown}\n`;

    if (flags.has('--stdout')) {
      console.log(header);
      return;
    }
    await mkdir(STAGING, { recursive: true });
    const out = join(STAGING, `${slug}-${logNo || 'x'}.md`);
    await writeFile(out, header, 'utf8');
    console.log(`\n✓ 저장: .staging/${slug}-${logNo || 'x'}.md`);
    console.log(`  제목: ${title}`);
    console.log(`  분량: ${markdown.length}자`);
    console.log(`\n다음: Claude에게 "이 스테이징 파일 GEO로 리라이팅해서 발행해줘" 라고 하세요.\n`);
    return;
  }

  console.log(`사용법:
  node scripts/naver-import.mjs list <블로그URL 또는 blogId> [--pages 2]
  node scripts/naver-import.mjs scrape <글URL> [--stdout]`);
}

main().catch((e) => {
  console.error('오류:', e.message);
  process.exit(1);
});
