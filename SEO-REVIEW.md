# 2026-09-07 first-pass SEO/content review

## Scope

Preserved CSS, section order, contact anchors, Naver form destination and all published post URLs. Clarified the service and the founder's veterinarian / animal-hospital director background. Removed unsupported AI citation timing/format/competitive lock-in claims and unsubstantiated analysis counts. Replaced homepage example statistics with qualitative scenarios; distinguished spending from losses in the diagnosis article.

Linked Google Search Central, OpenAI crawler documentation and Bing Webmaster Guidelines beside the relevant explanations. Search crawler access remains allowed; existing training permissions were not changed. llms.txt now links real published resources and describes its secondary role.

## Near-duplicate review

Reviewed all 10 posts. No identical articles or safe one-for-one replacement was found. No redirects or deletions were introduced, and existing incoming links remain valid.

| Overlapping cluster | Decision |
| --- | --- |
| ai-era-aeo-geo-visibility / ai-era-clinic-clear-positioning / ai-era-hospital-branding | Separate technical discovery and measurement, factual service/entity descriptions, and experience-based editorial content; link the three together. |
| hospital-marketing-leak-diagnosis / hospital-blog-marketing-agency-branding-vs-exposure / hospital-marketing-strategy-2step-diagnosis | Distinguish funnel diagnosis, blog copy, and channel execution. Remove competing cost-based titles from the first two; add contextual cross-links. |
| hospital-marketing-agency-selection-guide / when-to-switch-hospital-marketing-agency | Retain pre-contract evaluation vs switching and asset handover; link from selection to switching. |
| animal-hospital-trust-marketing / dermatology-clinic-differentiation-marketing | Retain different audiences and questions. |

Search Console query/backlink performance was not available for deciding whether a later consolidation would be beneficial. Revisit redirects only with that evidence and a destination preserving the useful content.

## Entity and technical decisions

- Organization remains the article author, consistent with the visible editorial byline; individual authorship was not invented.
- Person has a stable `/about/#founder` ID, referenced by Organization.founder; WebSite references the same publisher.
- Canonicals use the production origin and trailing slashes, with query/fragment removed. Sitemap remains generated from public build routes.
- Existing verification tags and analytics are retained. No fabricated social profiles, ratings, customer counts or proprietary datasets were added.
- Actual edited post dates are updated; original publication dates are retained.

## Validation

Run `npm ci`, `npm run build`, then `npm run check:seo`. The output check validates metadata uniqueness, H1s, canonical/sitemap parity, JSON-LD/visible FAQ consistency, internal links and anchors, llms links, and the unchanged contact destination. Browser review covers homepage layout and contact navigation.

Operational offer details already present in older posts (ebook contents/value and weekly consultation availability) were not independently verified. No new offers or figures were introduced.
