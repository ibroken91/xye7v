# Featured news section — deployment reference (`ar/news/index.html`)

This document describes the **“المستجدات الرسمية”** block (`featured-news-section`) on the Arabic news page: HTML, CSS, JavaScript merge points, data, and scripts. Use it to deploy or replicate the feature on production.

The slider logic lives **inline** in `ar/news/index.html` (not a standalone `featured-news.js`). Paths assume the page lives at **`ar/news/index.html`** and use **`../../`** to reach site-root assets.

---

## 1. Prerequisites

These must exist with correct relative URLs from `ar/news/index.html`:

| Asset | Purpose |
|--------|---------|
| `../../css/bootstrap.min.css`, `../../css/all.min.css` | Layout + Font Awesome (chevron arrows) |
| `../../css/style.css` | `.featured-news-section`, `.section-title`, grid override |
| `../../css/news.css` | `.news-card`, `.news-featured`, slider (`.featured-news-*`), animations |
| `../../js/jquery.js` | `$`, `$.getJSON` |
| `../../js/news-performance.js` | Loads paginated news; sets `NewsPerformance.state.allNews` |
| `../../js/news-seo.js` | `NewsSEO.init`, `NewsSEO.showDetails` for “اقرأ المزيد” |
| `../../data/news-ar.json` | News items; **`isFeatured: true`** drives the slider |

The inline script depends on the same page defining **`allNews`**, **`showNewsDetails`**, **`isPostActivePublic`**, and **`loadNewsFromJSON`**. Copy the featured JavaScript **into** that script block after helpers like **`sortNewsArray`**.

---

## 2. HTML — insert above `<section class="news-container">`

Paste after the banner section:

```html
  <!-- Featured News Section (same as homepage) -->
  <section class="featured-news-section py-5">
   <div class="container">
    <div class="row">
     <div class="col-12">
      <h2 class="section-title text-center mb-5">
       المستجدات الرسمية
      </h2>
      <div class="featured-news-slider-wrapper">
       <button type="button" class="featured-news-arrow featured-news-prev" id="featured-news-prev" aria-label="السابق" style="display: none;">
        <i class="fas fa-chevron-right"></i>
       </button>
       <div class="featured-news-container news-grid" id="featured-news-container">
        <!-- Featured news card loaded from JSON -->
       </div>
       <button type="button" class="featured-news-arrow featured-news-next" id="featured-news-next" aria-label="التالي" style="display: none;">
        <i class="fas fa-chevron-left"></i>
       </button>
       <div class="featured-news-dots-row">
        <div class="featured-news-dots" id="featured-news-dots"></div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </section>
```

Ensure `<head>` includes:

```html
  <link href="../../css/style.css" rel="stylesheet" type="text/css"/>
  <link href="../../css/news.css" rel="stylesheet" type="text/css"/>
```

---

## 3. CSS

### 3.1 `css/style.css` — minimum block

Add or merge (adjust if your file already contains variants):

```css
/* Featured News Section — uses news.css for cards/slider */
.featured-news-section {
  padding: 40px 0;
}

.featured-news-section .section-title {
  color: #3d1e59;
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 40px;
}

.featured-news-section .news-grid {
  grid-template-columns: 1fr;
  gap: 30px;
  margin-top: 0;
}

@media only screen and (max-width: 768px) {
  .featured-news-section .section-title {
    font-size: 1.8rem;
    margin-bottom: 30px;
  }
}
```

The repository may also include **`.featured-slideshow*`** rules (homepage); optional if you only deploy the news-page slider.

### 3.2 `css/news.css`

The featured card shares **`.news-card`** / **`.news-featured`** with the rest of the news page. **Safest:** deploy the project’s full **`css/news.css`**.

**Minimum scope if merging manually:**

- From file start through **`.news-featured .news-card-body`** and related **`.news-featured`** layout (card grid, image, excerpt clamps).
- Block from **`/* Featured slider card: keep size consistent */`** through **`.featured-news-dot.active`** (slider wrapper, arrows, dots, `@keyframes featuredCardIn` / `featuredCardOut`).
- Mobile **`@media (max-width: 768px)`** rules that reference **`.featured-news-*`** and **`.featured-news-section .news-card.news-featured`**.

Without base **`.news-card`** rules, the slider will not layout correctly.

---

## 4. JavaScript — merge into `ar/news/index.html` inline script

Load order **before** your large inline block:

```html
  <script src="../../js/news-seo.js" type="text/javascript"></script>
  <script src="../../js/news-performance.js" type="text/javascript"></script>
```

(jQuery and Bootstrap must appear **above** these.)

### 4.1 Featured block (place after `sortNewsArray` / helpers, before `loadNewsFromJSON`)

```javascript
  // Featured news slider state (one card; arrows and dots cycle items)
  var featuredNewsItems = [];
  var featuredNewsCurrentIndex = 0;
  var featuredNewsAutoTimer = null;
  var featuredNewsIsHovering = false;

  function buildFeaturedCardHtml(item) {
    var categoryText = { 'news': 'خبر', 'event': 'فعالية', 'announcement': 'إعلان' };
    return '<article class="news-card news-featured" data-category="' + item.category + '" data-news-id="' + item.id + '">' +
      '<div class="news-card-image' + (item.image ? '' : ' has-icon-only') + '">' +
      (item.image ? '<img src="../../' + item.image + '" alt="' + item.title + '">' : '<i class="fas ' + (item.icon || 'fa-newspaper') + '"></i>') +
      '</div>' +
      '<div class="news-card-body">' +
      '<span class="news-card-category outline' + (item.category !== 'news' ? ' ' + item.category : '') + '">' + (categoryText[item.category] || categoryText.news) + '</span>' +
      '<div class="news-card-date"><i class="far fa-calendar-alt"></i><span>' + item.date + '</span></div>' +
      '<h3 class="news-card-title">' + item.title + '</h3>' +
      '<p class="news-card-excerpt">' + item.excerpt + '</p>' +
      '<div class="news-card-footer">' +
      '<a href="?id=' + item.id + '" class="news-card-link" data-news-id="' + item.id + '">اقرأ المزيد <i class="fas fa-arrow-left"></i></a>' +
      '</div></div></article>';
  }

  function updateFeaturedCard(index) {
    if (!featuredNewsItems.length || index < 0 || index >= featuredNewsItems.length) return;
    var prevIndex = featuredNewsCurrentIndex;
    var direction = index > prevIndex ? 'next' : 'prev';
    featuredNewsCurrentIndex = index;
    var $container = $('#featured-news-container');

    var slideFrom = direction === 'next' ? '100%' : '-100%';
    var slideTo = direction === 'next' ? '-100%' : '100%';
    $container.get(0).style.setProperty('--featured-slide-from', slideFrom);
    $container.get(0).style.setProperty('--featured-slide-to', slideTo);

    $container.removeClass('featured-card-anim-in featured-card-anim-out');
    $container.addClass('featured-card-anim-out');

    window.setTimeout(function() {
      $container.empty().addClass('news-grid').append(buildFeaturedCardHtml(featuredNewsItems[index]));
      $container.removeClass('featured-card-anim-out');
      void $container.get(0).offsetWidth;
      $container.addClass('featured-card-anim-in');
      $container.find('.news-card-link').on('click', function(e) {
        e.preventDefault();
        var newsId = parseInt($(this).data('news-id'), 10);
        if (window.NewsSEO) window.NewsSEO.showDetails(newsId, allNews, 'ar', showNewsDetails);
        else showNewsDetails(newsId);
      });
    }, 140);

    $('#featured-news-dots .featured-news-dot').removeClass('active').eq(index).addClass('active');
    var $prev = $('#featured-news-prev'), $next = $('#featured-news-next');
    $prev.prop('disabled', index === 0);
    $next.prop('disabled', index === featuredNewsItems.length - 1);
  }

  function stopFeaturedAutoScroll() {
    if (featuredNewsAutoTimer) {
      window.clearInterval(featuredNewsAutoTimer);
      featuredNewsAutoTimer = null;
    }
  }

  function startFeaturedAutoScroll() {
    stopFeaturedAutoScroll();
    if (!featuredNewsItems || featuredNewsItems.length <= 1) return;
    featuredNewsAutoTimer = window.setInterval(function() {
      if (featuredNewsIsHovering) return;
      if (!$('.featured-news-section:visible').length) return;
      if (featuredNewsCurrentIndex >= featuredNewsItems.length - 1) {
        updateFeaturedCard(0);
      } else {
        updateFeaturedCard(featuredNewsCurrentIndex + 1);
      }
    }, 5000);
  }

  function renderFeaturedNewsSection(featuredItems) {
    var $container = $('#featured-news-container');
    if (!$container.length || !featuredItems || featuredItems.length === 0) {
      if ($container.length) $container.closest('.featured-news-section').hide();
      $('#featured-news-prev, #featured-news-next').hide();
      $('#featured-news-dots').empty();
      stopFeaturedAutoScroll();
      return;
    }
    $container.closest('.featured-news-section').show();
    var maxFeatured = 10;
    featuredNewsItems = featuredItems.slice(0, maxFeatured);
    featuredNewsCurrentIndex = 0;
    $container.empty().addClass('news-grid').append(buildFeaturedCardHtml(featuredNewsItems[0]));
    $container.removeClass('featured-card-anim-in featured-card-anim-out');
    void $container.get(0).offsetWidth;
    $container.addClass('featured-card-anim-in');
    $container.find('.news-card-link').on('click', function(e) {
      e.preventDefault();
      var newsId = parseInt($(this).data('news-id'), 10);
      if (window.NewsSEO) window.NewsSEO.showDetails(newsId, allNews, 'ar', showNewsDetails);
      else showNewsDetails(newsId);
    });
    var $prev = $('#featured-news-prev'), $next = $('#featured-news-next'), $dots = $('#featured-news-dots');
    $prev.show().prop('disabled', featuredNewsCurrentIndex === 0 || featuredNewsItems.length <= 1);
    $next.show().prop('disabled', featuredNewsItems.length <= 1 || featuredNewsCurrentIndex === featuredNewsItems.length - 1);
    $dots.empty();
    for (var i = 0; i < featuredNewsItems.length; i++) {
      $dots.append('<button type="button" class="featured-news-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '" aria-label="شريحة ' + (i + 1) + '"></button>');
    }
    $prev.off('click').on('click', function() {
      if (featuredNewsCurrentIndex > 0) updateFeaturedCard(featuredNewsCurrentIndex - 1);
    });
    $next.off('click').on('click', function() {
      if (featuredNewsCurrentIndex < featuredNewsItems.length - 1) updateFeaturedCard(featuredNewsCurrentIndex + 1);
    });
    $dots.off('click').on('click', '.featured-news-dot', function() {
      var i = parseInt($(this).data('index'), 10);
      if (!isNaN(i)) updateFeaturedCard(i);
    });
    $('.featured-news-slider-wrapper')
      .off('mouseenter mouseleave focusin focusout')
      .on('mouseenter focusin', function() { featuredNewsIsHovering = true; })
      .on('mouseleave focusout', function() { featuredNewsIsHovering = false; });
    startFeaturedAutoScroll();
  }
```

### 4.2 Inside `loadNewsFromJSON` — after `allNews` is filtered

**With `NewsPerformance`:**

```javascript
        var featuredItems = allNews.filter(function(item) { return item.isFeatured; });
        renderFeaturedNewsSection(featuredItems);
```

**With `$.getJSON('../../data/news-ar.json', ...)` fallback:**

```javascript
        var featuredItems = allNews.filter(function(item) { return item.isFeatured; });
        renderFeaturedNewsSection(featuredItems);
```

Call **`renderFeaturedNewsSection`** right after building **`allNews`** (and inactive filtering), **before** rendering the main `#news-grid`.

---

## 5. Data (`data/news-ar.json`)

- Path used by the loader: **`../../data/news-ar.json`** from `ar/news/index.html` (see `js/news-performance.js`, `loadFromJSON`).
- Slider lists items with **`"isFeatured": true`** (up to 10).
- **`image`** paths are relative to the site root; the template prefixes **`../../`**.

---

## 6. Files to copy to production (summary)

| Path | Note |
|------|------|
| `ar/news/index.html` | Section HTML + merged inline JS |
| `css/style.css` | Featured section rules (or merge §3.1) |
| `css/news.css` | Prefer **full file** |
| `js/news-performance.js` | Required if using `NewsPerformance` path |
| `js/news-seo.js` | Detail view / URLs |
| `data/news-ar.json` | Must include `isFeatured` entries |

**Not** required for this news page strip: `js/home-content.js` (homepage `#featured-news-container` only).

---

## 7. Verification

1. Open `/ar/news/index.html` — section **المستجدات الرسمية** appears when JSON has featured items; hidden if none.
2. Network: **`news-ar.json`** returns 200.
3. Arrows, dots, auto-advance (~5s); pause on hover/focus inside `.featured-news-slider-wrapper`.
4. “اقرأ المزيد” opens detail view (`NewsSEO` / `showNewsDetails`).

---

## 8. Source of truth in this repo

| Piece | Location |
|-------|-----------|
| HTML section | `ar/news/index.html` (~lines 290–315) |
| Inline featured JS | `ar/news/index.html` (~lines 666–797) |
| `loadNewsFromJSON` + `renderFeaturedNewsSection` calls | `ar/news/index.html` (~814–816, 858–860) |
| JSON URL | `js/news-performance.js` → ``../../data/news-${lang}.json`` |

---

*Generated for CDCwebsite — featured news on Arabic news index.*
