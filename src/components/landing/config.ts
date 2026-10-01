import { SITE } from '../../consts';

// 광고 전용 랜딩(/diagnosis/) 설정. 랜딩 관련 값은 이 파일만 바꾸면 된다.
// 홈·글·점검 페이지는 이 파일을 쓰지 않으므로 여기를 바꿔도 영향이 없다.
export const LANDING = {
  // CTA 목적지: 지금은 기존 무료 진단 신청(네이버 폼)을 그대로 쓴다.
  // 자체 폼(예: '/diagnosis/apply/')이나 Diagnosis Agent API 폼으로 바꿀 때는
  // 이 값 또는 DiagnosisCta.astro만 교체하면 된다. 클릭 측정은 data-lp-cta 속성으로 유지된다.
  ctaHref: SITE.naverFormUrl,
  ctaLabel: '우리 병원 무료 진단받기',

  // 광고 측정 도구 ID. 비워두면 해당 스크립트를 아예 출력하지 않는다(추가 로딩 0).
  // 채우면 /diagnosis/에서만 로드되고 홈·글 페이지에는 들어가지 않는다.
  // 연결 전 개인정보처리방침에 쿠키·픽셀 사용 고지를 추가할 것.
  ga4Id: '', // 예: 'G-XXXXXXXXXX'
  metaPixelId: '', // 예: '123456789012345'
};
