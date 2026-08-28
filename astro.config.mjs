// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 배포 도메인이 정해지면 여기만 바꾸면 됩니다 (예: https://thebasicplan.co.kr)
// 지금은 무료 배포용 임시 주소. sitemap/canonical/JSON-LD가 전부 이 값을 씁니다.
export default defineConfig({
  site: 'https://the-basic-plan.vercel.app',
  integrations: [sitemap()],
  build: {
    // 정적 HTML로 전부 빌드 → JS 없이 크롤러가 100% 읽음 (SEO 레인 1순위)
    format: 'directory',
  },
});
