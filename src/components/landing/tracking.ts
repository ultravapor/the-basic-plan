// 광고 랜딩 공통 측정 유틸.
// 페이지·컴포넌트는 track('cta_click', {...})처럼 "무슨 일이 일어났는지"만 부르고,
// 도구별(Meta Pixel·Vercel Analytics) 이벤트 이름 변환은 이 파일에서만 한다.
//
// 이벤트 흐름: page_view → cta_click → (내부 폼 전환 후) form_start → lead
// ⚠️ lead는 "실제 신청 제출 성공"에서만 호출한다. 외부(네이버) 폼으로 보내는 CTA 클릭은 lead가 아니다.
//    내부 신청폼으로 바꾸면: 첫 입력 시 track('form_start'), 서버가 제출 성공을 응답했을 때 track('lead').

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    va?: (...args: unknown[]) => void;
    vaq?: unknown[][];
  }
}

export type TrackEvent = 'page_view' | 'cta_click' | 'form_start' | 'lead';
type Params = Record<string, string>;

// Meta Pixel. page_view는 픽셀 기본 코드(LandingAnalytics)가 PageView를 1회 보내므로 여기서 다시 보내지 않는다(중복 방지).
const META_EVENTS: Record<TrackEvent, ['track' | 'trackCustom', string] | null> = {
  page_view: null,
  cta_click: ['trackCustom', 'DiagnosisCTAClick'],
  form_start: ['trackCustom', 'DiagnosisFormStart'],
  lead: ['track', 'Lead'],
};

// Vercel Analytics(사이트 기존 측정 도구) 커스텀 이벤트 이름
const VERCEL_EVENTS: Record<TrackEvent, string> = {
  page_view: 'lp_view',
  cta_click: 'lp_cta_click',
  form_start: 'lp_form_start',
  lead: 'lp_lead',
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const STORE_KEY = 'lp_attr';

/**
 * 광고 유입 정보. URL에 utm이 있으면 그 값으로 갱신하고,
 * 없으면(새로고침 등) 같은 세션에 저장해 둔 값을 쓴다.
 */
export function getAttribution(): Params {
  const attr: Params = {};
  try {
    const q = new URLSearchParams(location.search);
    const saved: Params = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}');
    const fresh = UTM_KEYS.some((k) => q.get(k));
    for (const k of UTM_KEYS) {
      const v = fresh ? q.get(k) : saved[k];
      if (v) attr[k] = v.slice(0, 100);
    }
    // 광고 클릭 ID 값(개인 식별 가능)은 저장·전송하지 않고 어느 플랫폼에서 왔는지만 남긴다.
    // fbclid 자체는 Meta Pixel이 _fbc 쿠키로 자동 보존한다.
    if (q.get('fbclid')) attr.click_from = 'meta';
    else if (q.get('gclid')) attr.click_from = 'google';
    else if (!fresh && saved.click_from) attr.click_from = saved.click_from;
    sessionStorage.setItem(STORE_KEY, JSON.stringify(attr));
  } catch {
    // 저장소가 막힌 환경(사생활 보호 모드 등)에서도 페이지는 정상 동작
  }
  return attr;
}

let context: Params | null = null;

/** 이벤트 하나를 연결된 모든 도구에 보낸다. 도구가 없으면(픽셀 ID 미설정 등) 조용히 건너뛴다. */
export function track(event: TrackEvent, extra: Params = {}): void {
  context ??= { page_path: location.pathname, ...getAttribution() };
  const data = { ...context, ...extra };

  const meta = META_EVENTS[event];
  if (meta) {
    try {
      window.fbq?.(meta[0], meta[1], data);
    } catch {}
  }

  try {
    // Vercel Analytics 스크립트는 지연 로드되므로, Vercel과 같은 대기열 방식으로 먼저 받아둔다(유실 방지)
    window.va ??= (...args: unknown[]) => {
      (window.vaq ??= []).push(args);
    };
    window.va('event', { name: VERCEL_EVENTS[event], data });
  } catch {}
}
