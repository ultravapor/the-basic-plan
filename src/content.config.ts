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

    // ── 내부 분석용 메타데이터(사용자 비노출). 어떤 글이 실제 문의로 이어지는지 추적하기 위한 태그.
    // 퍼널 단계: P1 발견 · P2 관심/비교 · P3 문의 · P4 응대 · P5 예약
    funnel: z.array(z.enum(['P1', 'P2', 'P3', 'P4', 'P5'])).default([]),
    // 제거하려는 의심: H1 해결책 · H2 상품 · H3 판매자 · H4 증거 · H5 자기판단 · H6 구매 후 위험
    doubt: z.array(z.enum(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])).default([]),
    // 이 글이 검증하는 문제 가설(예: agency-trust, call-conversion, blog-effectiveness, positioning, ai-search)
    hypothesis: z.array(z.string()).default([]),
  }),
});

export const collections = { posts };
