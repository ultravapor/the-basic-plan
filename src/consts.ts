// 사이트 전역 상수 — 표기를 한 곳에서 관리 (LLMO: 엔티티 표기 일관성)
export const SITE = {
  nameKo: '더베이직플랜',
  nameEn: 'The Basic Plan',
  // 공개 표기용 태그라인 (핵심 가치)
  tagline: '실력 있는 원장님에게 더 많은 보상을 만들어드립니다',
  // 한 문장 설명 (llms.txt / og:description / Organization.description 공용)
  description:
    '더베이직플랜은 병원·의원 원장님을 위한 네이버 블로그 AEO/GEO 대행사입니다. 검색엔진과 AI(네이버 AI 브리핑·ChatGPT·Perplexity)가 병원을 1차 소스로 인용하도록 콘텐츠를 설계·발행합니다.',
  service: '네이버 블로그 AEO/GEO 대행',
  email: 'ultravapor@naver.com',
  // 네이버 폼(오피스 폼) URL을 넣으면 문의 섹션이 '네이버 폼으로 문의' 버튼으로 바뀝니다.
  // 비워두면 아래 Formspree 인라인 폼을 사용합니다. 둘 중 편한 쪽만 쓰면 됩니다.
  naverFormUrl: 'https://naver.me/GtJYgKzW',
  // 배포 후 실제 계정이 생기면 채웁니다 (LLMO: sameAs 엔티티 연결)
  sameAs: [
    // 'https://blog.naver.com/○○○',
    // 'https://www.instagram.com/○○○',
  ],
  locale: 'ko_KR',
  // 검색엔진 소유확인 코드 (HTML 태그 방식). 값이 있으면 <head>에 meta로 출력됩니다.
  verification: {
    naver: '5d6f08223ffd38a3bcaa4bf182b439a9f66a9e0f',
    google: 'R85T4BMqcM1J9OfbA7gMWTNUs3Pksc90KKMv2eVyxVw',
  },
} as const;

export const NAV = [
  { href: '/', label: '홈' },
  { href: '/posts/', label: '인사이트' },
  { href: '/about/', label: '소개' },
  { href: '/#contact', label: '문의' },
];
