import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const site = 'https://the-basic-plan.vercel.app';
const dist = new URL('../dist/', import.meta.url);
const root = fileURLToPath(dist);
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
}
const pages = new Map();
const titles = new Set();
const descriptions = new Set();
for (const file of walk(root).filter(f => f.endsWith('.html'))) {
  const path = '/' + relative(root, file).split(sep).join('/').replace(/index\.html$/, '');
  const $ = load(readFileSync(file, 'utf8'));
  const canonical = site + path;
  assert.equal($('h1').length, 1, `${path}: one H1`);
  assert.equal($('link[rel=canonical]').length, 1, `${path}: one canonical`);
  assert.equal($('link[rel=canonical]').attr('href'), canonical);
  assert.equal($('meta[property="og:url"]').attr('content'), canonical);
  assert(!$('meta[name=robots]').attr('content').includes('noindex'), `${path}: indexable`);
  const title = $('title').text();
  const description = $('meta[name=description]').attr('content');
  assert(title && !titles.has(title), `${path}: unique title`);
  assert(description && !descriptions.has(description), `${path}: unique description`);
  titles.add(title); descriptions.add(description);
  const blocks = $('script[type="application/ld+json"]').toArray().map(e => JSON.parse($(e).text()));
  const org = blocks.find(b => b['@type'] === 'Organization');
  const website = blocks.find(b => b['@type'] === 'WebSite');
  assert.equal(org['@id'], site + '/#org');
  assert.equal(org.founder['@id'], site + '/about/#founder');
  assert.equal(website.publisher['@id'], org['@id']);
  for (const faq of blocks.filter(b => b['@type'] === 'FAQPage')) {
    const visible = $('.faq details').toArray().map(e => ({ q: $(e).find('summary').text(), a: $(e).find('p').text() }));
    assert.deepEqual(faq.mainEntity.map(q => ({ q: q.name, a: q.acceptedAnswer.text })), visible, `${path}: FAQ matches visible content`);
  }
  const article = blocks.find(b => b['@type'] === 'Article');
  if (article) {
    assert.equal(article.url, canonical);
    assert.equal(article.author['@id'], org['@id']);
    assert.equal(article.publisher['@id'], org['@id']);
    assert(new Date(article.dateModified) >= new Date(article.datePublished));
  }
  pages.set(path, $);
}
for (const [path, $] of pages) {
  for (const e of $('a[href]').toArray()) {
    const url = new URL($(e).attr('href'), site + path);
    if (url.origin !== site) continue;
    const target = pages.get(url.pathname);
    assert(target || existsSync(join(root, url.pathname)), `${path}: broken internal link ${url.href}`);
    if (target && url.hash) assert(target('[id]').toArray().some(e => target(e).attr('id') === decodeURIComponent(url.hash.slice(1))), `${path}: missing anchor ${url.href}`);
  }
}
const sitemap = load(readFileSync(new URL('sitemap-0.xml', dist), 'utf8'), { xmlMode: true });
assert.deepEqual(new Set(sitemap('loc').toArray().map(e => sitemap(e).text())), new Set([...pages.keys()].map(p => site + p)));
const robots = readFileSync(new URL('robots.txt', dist), 'utf8');
assert.match(robots, /User-agent: OAI-SearchBot\s+Allow: \//);
assert.match(robots, /Sitemap: https:\/\/the-basic-plan\.vercel\.app\/sitemap-index.xml/);
const llms = readFileSync(new URL('llms.txt', dist), 'utf8');
for (const [, url] of llms.matchAll(/\]\((https:[^)]+)\)/g)) assert(pages.has(new URL(url).pathname), `llms.txt: missing ${url}`);
const home = pages.get('/');
assert(home('h1').text().includes('병원 블로그·검색 마케팅'));
assert.equal(home('#contact a.btn').attr('href'), 'https://naver.me/GtJYgKzW');
assert(pages.get('/about/')('main').text().includes('수의사이자 동물병원 원장'));
console.log(`SEO checks passed: ${pages.size} pages, unique metadata, canonical/sitemap parity, JSON-LD/FAQ, internal links, crawler policy and contact destination.`);
