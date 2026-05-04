/**
 * Home Page — featured news slider (same UX as ar/news/index.html & en/news/index.html).
 * Requires jQuery (loaded before this script). Loads ../data/news-{ar|en}.json.
 */

(function () {
  'use strict';

  if (typeof window.jQuery === 'undefined') {
    console.error('home-content.js requires jQuery');
    return;
  }

  var $ = window.jQuery;

  var isArabic =
    document.documentElement.getAttribute('dir') === 'rtl' ||
    window.location.pathname.indexOf('/ar/') !== -1;
  var currentLang = isArabic ? 'ar' : 'en';

  var featuredNewsItems = [];
  var featuredNewsCurrentIndex = 0;
  var featuredNewsAutoTimer = null;
  var featuredNewsIsHovering = false;

  function isPostActivePublic(item) {
    if (item.isManuallyActive !== undefined) {
      return item.isManuallyActive === true;
    }
    if (!item.activeDuration || !item.createdDate) {
      return true;
    }
    try {
      var createdDate = new Date(item.createdDate);
      if (isNaN(createdDate.getTime())) return true;
      var expirationDate = new Date(createdDate);
      expirationDate.setDate(expirationDate.getDate() + parseInt(item.activeDuration, 10));
      return new Date() <= expirationDate;
    } catch (e) {
      return true;
    }
  }

  /** Resolve image URL from site root (paths like image/...) for pages in ar/ or en/ */
  function resolveImagePath(item) {
    var imagePath = item.image || '';
    if (
      imagePath &&
      imagePath.indexOf('../') !== 0 &&
      imagePath.indexOf('/') !== 0 &&
      imagePath.indexOf('http') !== 0
    ) {
      if (imagePath.indexOf('data/') === 0 || imagePath.indexOf('image/') === 0) {
        imagePath = '../' + imagePath;
      }
    }
    return imagePath;
  }

  function buildFeaturedCardHtml(item) {
    var categoryText = {
      news: currentLang === 'ar' ? 'خبر' : 'News',
      event: currentLang === 'ar' ? 'فعالية' : 'Event',
      announcement: currentLang === 'ar' ? 'إعلان' : 'Announcement'
    };
    var readMoreText = currentLang === 'ar' ? 'اقرأ المزيد' : 'Read More';
    var arrowDir = currentLang === 'ar' ? 'left' : 'right';
    var imgPath = resolveImagePath(item);
    var readHref = 'news/index.html?id=' + encodeURIComponent(item.id);

    var titleEsc = String(item.title || '').replace(/"/g, '&quot;');
    return (
      '<article class="news-card news-featured" data-category="' +
      item.category +
      '" data-news-id="' +
      item.id +
      '">' +
      '<div class="news-card-image' +
      (item.image ? '' : ' has-icon-only') +
      '">' +
      (item.image
        ? '<img src="' + imgPath + '" alt="' + titleEsc + '">'
        : '<i class="fas ' + (item.icon || 'fa-newspaper') + '"></i>') +
      '</div>' +
      '<div class="news-card-body">' +
      '<span class="news-card-category outline' +
      (item.category !== 'news' ? ' ' + item.category : '') +
      '">' +
      (categoryText[item.category] || categoryText.news) +
      '</span>' +
      '<div class="news-card-date"><i class="far fa-calendar-alt"></i><span>' +
      (item.date || '') +
      '</span></div>' +
      '<h3 class="news-card-title">' +
      (item.title || '') +
      '</h3>' +
      '<p class="news-card-excerpt">' +
      (item.excerpt || '') +
      '</p>' +
      '<div class="news-card-footer">' +
      '<a href="' +
      readHref +
      '" class="news-card-link" data-news-id="' +
      item.id +
      '">' +
      readMoreText +
      ' <i class="fas fa-arrow-' +
      arrowDir +
      '"></i></a>' +
      '</div></div></article>'
    );
  }

  function updateFeaturedCard(index) {
    if (!featuredNewsItems.length || index < 0 || index >= featuredNewsItems.length) return;

    var direction = index > featuredNewsCurrentIndex ? 'next' : 'prev';
    featuredNewsCurrentIndex = index;
    var $container = $('#featured-news-container');
    if (!$container.length) return;

    var slideFrom = direction === 'next' ? '100%' : '-100%';
    var slideTo = direction === 'next' ? '-100%' : '100%';
    $container.get(0).style.setProperty('--featured-slide-from', slideFrom);
    $container.get(0).style.setProperty('--featured-slide-to', slideTo);

    $container.removeClass('featured-card-anim-in featured-card-anim-out');
    $container.addClass('featured-card-anim-out');

    window.setTimeout(function () {
      $container.empty().addClass('news-grid').append(buildFeaturedCardHtml(featuredNewsItems[index]));
      $container.removeClass('featured-card-anim-out');
      void $container.get(0).offsetWidth;
      $container.addClass('featured-card-anim-in');
    }, 140);

    $('#featured-news-dots .featured-news-dot').removeClass('active').eq(index).addClass('active');
    var $prev = $('#featured-news-prev');
    var $next = $('#featured-news-next');
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
    featuredNewsAutoTimer = window.setInterval(function () {
      if (featuredNewsIsHovering) return;
      if (!$('.featured-news-section:visible').length) return;
      if (featuredNewsCurrentIndex >= featuredNewsItems.length - 1) {
        updateFeaturedCard(0);
      } else {
        updateFeaturedCard(featuredNewsCurrentIndex + 1);
      }
    }, 5000);
  }

  function dotAriaLabel(i) {
    if (isArabic) return 'شريحة ' + (i + 1);
    return 'Slide ' + (i + 1);
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

    var $prev = $('#featured-news-prev');
    var $next = $('#featured-news-next');
    var $dots = $('#featured-news-dots');

    $prev
      .show()
      .prop('disabled', featuredNewsCurrentIndex === 0 || featuredNewsItems.length <= 1);
    $next
      .show()
      .prop(
        'disabled',
        featuredNewsItems.length <= 1 ||
          featuredNewsCurrentIndex === featuredNewsItems.length - 1
      );

    $dots.empty();
    for (var i = 0; i < featuredNewsItems.length; i++) {
      $dots.append(
        '<button type="button" class="featured-news-dot' +
          (i === 0 ? ' active' : '') +
          '" data-index="' +
          i +
          '" aria-label="' +
          dotAriaLabel(i) +
          '"></button>'
      );
    }

    $prev.off('click').on('click', function () {
      if (featuredNewsCurrentIndex > 0) updateFeaturedCard(featuredNewsCurrentIndex - 1);
    });
    $next.off('click').on('click', function () {
      if (featuredNewsCurrentIndex < featuredNewsItems.length - 1) {
        updateFeaturedCard(featuredNewsCurrentIndex + 1);
      }
    });
    $dots.off('click').on('click', '.featured-news-dot', function () {
      var idx = parseInt($(this).data('index'), 10);
      if (!isNaN(idx)) updateFeaturedCard(idx);
    });

    $('.featured-news-slider-wrapper')
      .off('mouseenter mouseleave focusin focusout')
      .on('mouseenter focusin', function () {
        featuredNewsIsHovering = true;
      })
      .on('mouseleave focusout', function () {
        featuredNewsIsHovering = false;
      });

    startFeaturedAutoScroll();
  }

  function loadFeaturedNews() {
    var container = document.getElementById('featured-news-container');
    if (!container) return;

    var newsJsonFile = '../data/news-' + currentLang + '.json';

    fetch(newsJsonFile)
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to load news data');
        return response.json();
      })
      .then(function (data) {
        var allNews = (data.news || []).filter(function (item) {
          return isPostActivePublic(item);
        });
        var featuredItems = allNews.filter(function (item) {
          return item.isFeatured === true;
        });
        renderFeaturedNewsSection(featuredItems);
      })
      .catch(function (err) {
        console.error('Error loading featured news:', err);
        var $c = $('#featured-news-container');
        if ($c.length) $c.closest('.featured-news-section').hide();
      });
  }

  $(function () {
    loadFeaturedNews();
  });
})();
