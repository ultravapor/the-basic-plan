// 검색 색인·사이트맵에서 의도적으로 빼는 페이지 목록 (한 곳에서 관리).
// 광고 전용 랜딩처럼 검색 유입용이 아닌 페이지만 넣는다.
// - astro.config.mjs: 이 경로들을 sitemap에서 제외
// - scripts/check-seo.mjs: 이 경로들은 noindex이고 sitemap에 없어야 하며, 나머지는 전부 index여야 함
// 페이지 쪽에서는 BaseLayout에 noindex={true}를 함께 넘겨야 한다(검사 스크립트가 어긋나면 실패시킴).
export const NOINDEX_PATHS = ['/diagnosis/'];
