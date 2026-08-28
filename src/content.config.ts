import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 글 = 마크다운 파일 1개. src/content/posts/ 에 .md 를 추가하면 자동으로 페이지가 됩니다.
// 네이버 원고를 붙여넣고 아래 frontmatter만 채우면 발행 끝.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),                       // h1 / <title> / og:title
    description: z.string(),                  // meta description (150~160자 권장)
    // 첫 화면 직답 문장 (AEO: 40자 내외 결론 먼저). 목록/요약/구조화데이터에 공용.
    answer: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),  // 실제 갱신 시점만 (dateModified 정직하게)
    keywords: z.array(z.string()).default([]),
    // 사람들이 검색창에 실제로 치는 질문 3~5개 → FAQPage JSON-LD 로 자동 변환
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
