// 광고 전용 랜딩(/diagnosis/) 설정. 랜딩 관련 값은 이 파일만 바꾸면 된다.
// 홈·글·점검 페이지는 이 파일을 쓰지 않으므로 여기를 바꿔도 영향이 없다.

// Meta Pixel ID는 코드에 쓰지 않고 환경변수 PUBLIC_META_PIXEL_ID로 받는다(빌드 시 주입).
// Vercel → 프로젝트 Settings → Environment Variables에 등록한 뒤 재배포하면 적용된다.
// 비어 있거나 숫자 형식이 아니면 픽셀을 아예 출력하지 않는다(개발 환경에서도 페이지는 정상).
const rawPixelId = (import.meta.env.PUBLIC_META_PIXEL_ID ?? '').trim();
const metaPixelId = /^\d{8,20}$/.test(rawPixelId) ? rawPixelId : '';
if (rawPixelId && !metaPixelId) {
  console.warn(`[landing] PUBLIC_META_PIXEL_ID 형식이 올바르지 않아 픽셀을 넣지 않았습니다: "${rawPixelId}"`);
}

export const LANDING = {
  // CTA 목적지: 광고 랜딩 전용 네이버 폼. (홈·점검 페이지의 기존 문의 폼과는 별개)
  // 자체 신청폼으로 바꿀 때는 이 값 또는 DiagnosisCta.astro만 교체하고, data-lp-cta 속성은 유지한다.
  ctaHref: 'https://naver.me/56X6M01q',
  ctaLabel: '무료 병원 마케팅 진단 신청하기',
  metaPixelId,
};
