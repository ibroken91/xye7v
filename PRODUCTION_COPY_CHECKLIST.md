# Production copy checklist (featured news + homepage slider)

Use this when deploying so the **homepage featured slider** and **news page featured section** work with the same JSON data.

Your server folder layout should mirror the repo: `ar/`, `en/`, `css/`, `js/`, `data/`, `image/` (and any paths used in `news-*.json`).

---

## 1. Must copy — featured news (Arabic + English news pages)

| File | Why |
|------|-----|
| `ar/news/index.html` | Markup + inline script: slider, `loadNewsFromJSON`, `renderFeaturedNewsSection` |
| `en/news/index.html` | Same for English (if you use EN news) |
| `js/news-performance.js` | Loads `data/news-{lang}.json` with pagination / cache |
| `js/news-seo.js` | `?id=` deep links, detail view, SEO helpers |
| `data/news-ar.json` | Arabic posts; `isFeatured: true` drives both sliders |
| `data/news-en.json` | English posts (if used) |
| `css/news.css` | `.news-card`, `.featured-news-*`, slider arrows/dots, animations |
| `css/style.css` | `.featured-news-section`, `.section-title`, `.featured-news-section .news-grid` |

Also deploy **any images** referenced in JSON (`image/...`, etc.) — paths are relative to the site root.

---

## 2. Must copy — homepage featured slider (same UX as news page)

| File | Why |
|------|-----|
| `ar/index.html` | Slider HTML (`featured-news-slider-wrapper`, arrows, dots) + `home-content.js` script tag |
| `en/index.html` | Same |
| `js/home-content.js` | Loads JSON, builds slider; “Read more” → `featured-news/index.html?id=` |
| `ar/featured-news/index.html`, `en/featured-news/index.html` | Full article view (query `?id=`) |
| `js/featured-news-detail.js` | Loads `data/news-*.json` and renders the same detail template as the news page |

Homepage already links `../css/news.css` and `../css/style.css` — if you update **`css/news.css`** or **`css/style.css`** for the news page, deploy those same files for the homepage.

---

## 3. Shared dependencies (usually already on production)

These are referenced by `ar/index.html`, `en/index.html`, and news pages:

- `css/bootstrap.min.css`, `css/all.min.css`, `css/switch.css` (as your HTML references)
- `js/jquery.js`, `js/popper.min.js`, `js/bootstrap.min.js`, `js/animation.js`, `js/main.js`, `js/search.js` (if linked)

**Script order matters:** jQuery **before** `home-content.js` **before** `</body>`.

---

## 4. Optional / separate features

| Item | When |
|------|------|
| `ar/featured-news/index.html`, `en/featured-news/index.html` | Only if you still use standalone “featured news” landing pages |
| `accessibility-widget/**` | Only if you deploy the accessibility widget |
| `admin/**` | Only if you deploy the admin CMS |

---

## 5. After upload — quick checks

1. **`/data/news-ar.json`** (and `news-en.json`) open in the browser (200, valid JSON).
2. At least one item has **`"isFeatured": true`** and passes your active rules.
3. **Homepage:** section “المستجدات الرسمية” / “Featured News” shows one card, arrows/dots if multiple featured, auto-rotate ~5s.
4. **News page:** same behavior; “اقرأ المزيد” opens in-page detail or `?id=` as designed.
5. **Read more from homepage** goes to **`/ar/news/index.html?id=...`** or **`/en/news/index.html?id=...`** (paths depend on your language folder).

---

## 6. Minimal set (only Arabic site, news + home already exist)

If production already has the old site and you only **patch** featured behavior:

1. `data/news-ar.json`
2. `css/news.css`
3. `css/style.css` (only if your prod copy is missing featured rules)
4. `js/home-content.js`
5. `js/news-performance.js`
6. `js/news-seo.js`
7. `ar/index.html`
8. `ar/news/index.html`

English: also `data/news-en.json`, `en/index.html`, `en/news/index.html`.

---

*See also `docs/FEATURED_NEWS_SECTION_AR_NEWS_DEPLOY.md` for HTML/JS/CSS excerpts.*
