// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkBreaks from 'remark-breaks';

// 배포 도메인이 정해지면 여기만 바꾸면 됩니다 (예: https://thebasicplan.co.kr)
// 지금은 무료 배포용 임시 주소. sitemap/canonical/JSON-LD가 전부 이 값을 씁니다.
export default defineConfig({
  site: 'https://the-basic-plan.vercel.app',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    // 본문에서 한 줄 = 한 문장으로 쓰면, 단일 줄바꿈이 실제 <br> 로 렌더링됩니다(가독성).
    remarkPlugins: [remarkBreaks],
  },
  build: {
    // 핵심 콘텐츠를 JavaScript 실행 없이 읽을 수 있도록 정적 HTML로 빌드합니다.
    format: 'directory',
  },
});
