/**
 * Standalone featured-news detail page: loads ../../data/news-{ar|en}.json
 * and renders the same template as the news page detail view (showNewsDetails).
 * Expects ?id= in the URL. Requires jQuery (loaded before this file).
 */
(function () {
  'use strict';

  if (typeof window.jQuery === 'undefined') {
    console.error('featured-news-detail.js requires jQuery');
    return;
  }

  var $ = window.jQuery;

  var isAr =
    document.documentElement.getAttribute('dir') === 'rtl' ||
    (document.documentElement.lang || '').toLowerCase().indexOf('ar') === 0 ||
    window.location.pathname.indexOf('/ar/') !== -1;

  var I = isAr
    ? {
        json: '../../data/news-ar.json',
        notFound: 'تعذر العثور على هذا الخبر.',
        notActive: 'هذا المحتوى غير متاح حالياً.',
        missingId: 'لم يتم تحديد رقم الخبر. افتح الرابط من الصفحة الرئيسية أو من الأخبار.',
        galleryTitle: 'معرض الصور',
        loading: 'جاري التحميل...',
        siteName: 'مركز الدفاع الإلكتروني',
        category: { news: 'أخبار', event: 'فعالية', announcement: 'إعلان' }
      }
    : {
        json: '../../data/news-en.json',
        notFound: 'This article could not be found.',
        notActive: 'This content is not available.',
        missingId: 'No article id was specified. Open a link from the home page or news section.',
        galleryTitle: 'Gallery',
        loading: 'Loading...',
        siteName: 'Cyber Defense Centre',
        category: { news: 'News', event: 'Event', announcement: 'Announcement' }
      };

  var currentGalleryImages = [];
  var currentGalleryIndex = 0;

  function getQueryId() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get('id');
    if (raw === null || raw === '') return null;
    var n = parseInt(raw, 10);
    return isNaN(n) ? raw : n;
  }

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

  function updateGalleryModalView() {
    var modalImage = document.getElementById('gallery-modal-image');
    var counter = document.getElementById('gallery-modal-counter');
    if (!modalImage || !counter || !currentGalleryImages.length) return;
    modalImage.src = currentGalleryImages[currentGalleryIndex];
    counter.textContent = currentGalleryIndex + 1 + ' / ' + currentGalleryImages.length;
  }

  function openGalleryModal(index) {
    var modal = document.getElementById('gallery-modal');
    if (!modal || !currentGalleryImages.length) return;
    currentGalleryIndex = Math.max(0, Math.min(index, currentGalleryImages.length - 1));
    updateGalleryModalView();
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeGalleryModal() {
    var modal = document.getElementById('gallery-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function showNextGalleryImage() {
    if (!currentGalleryImages.length) return;
    currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
    updateGalleryModalView();
  }

  function showPrevGalleryImage() {
    if (!currentGalleryImages.length) return;
    currentGalleryIndex =
      (currentGalleryIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
    updateGalleryModalView();
  }

  function bindGalleryModal() {
    $(document).on('click', '#featured-news-detail-content .gallery-item img', function () {
      var clickedSrc = $(this).attr('src');
      if (!clickedSrc || !currentGalleryImages.length) return;
      var foundIndex = currentGalleryImages.indexOf(clickedSrc);
      openGalleryModal(foundIndex >= 0 ? foundIndex : 0);
    });

    $('#gallery-modal-close').on('click', closeGalleryModal);
    $('#gallery-modal-next').on('click', showNextGalleryImage);
    $('#gallery-modal-prev').on('click', showPrevGalleryImage);
    $('#gallery-modal').on('click', function (e) {
      if (e.target === this) closeGalleryModal();
    });
    $(document).on('keydown', function (e) {
      var modal = document.getElementById('gallery-modal');
      if (!modal || modal.style.display !== 'block') return;
      if (e.key === 'Escape') closeGalleryModal();
      else if (e.key === 'ArrowLeft') showNextGalleryImage();
      else if (e.key === 'ArrowRight') showPrevGalleryImage();
    });
  }

  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
  }

  function renderDetails(newsItem) {
    currentGalleryImages = Array.isArray(newsItem.galleryImages)
      ? newsItem.galleryImages.map(function (imgPath) {
          return '../../' + imgPath;
        })
      : [];

    var galleryHtml = '';
    if (Array.isArray(newsItem.galleryImages) && newsItem.galleryImages.length > 0) {
      var galleryItemsHtml = newsItem.galleryImages
        .map(function (imgPath) {
          return (
            '<div class="gallery-item">' +
            '<img src="../../' +
            imgPath +
            '" alt="' +
            escapeAttr(newsItem.title) +
            '">' +
            '</div>'
          );
        })
        .join('');
      galleryHtml =
        '<div class="news-gallery-section">' +
        '<h2 class="gallery-title">' +
        I.galleryTitle +
        '</h2>' +
        '<div class="news-gallery-grid">' +
        galleryItemsHtml +
        '</div>' +
        '</div>';
    }

    var cat = I.category[newsItem.category] || I.category.news;

    var detailsHtml =
      '<div class="news-details-header">' +
      '<div class="news-details-meta">' +
      '<span class="news-details-category outline' +
      (newsItem.category !== 'news' ? ' ' + newsItem.category : '') +
      '">' +
      cat +
      '</span>' +
      '<div class="news-details-date">' +
      '<i class="far fa-calendar-alt"></i>' +
      '<span>' +
      (newsItem.date || '') +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="news-details-image-large' +
      (newsItem.image ? '' : ' has-icon-only') +
      '">' +
      (newsItem.image
        ? '<img src="../../' +
          newsItem.image +
          '" alt="' +
          escapeAttr(newsItem.title) +
          '">'
        : '<i class="fas ' + (newsItem.icon || 'fa-newspaper') + '"></i>') +
      '</div>' +
      '<h1 class="news-details-title">' +
      (newsItem.title || '') +
      '</h1>' +
      '<div class="news-details-body">' +
      (newsItem.content || '') +
      '</div>' +
      galleryHtml;

    $('#featured-news-detail-content').html(detailsHtml);
    document.title = (newsItem.title || I.siteName) + ' — ' + I.siteName;
  }

  function renderMessage(html) {
    $('#featured-news-detail-content').html(
      '<div class="news-details-body text-center py-5"><p>' + html + '</p></div>'
    );
  }

  function load() {
    var id = getQueryId();
    if (id === null) {
      renderMessage(I.missingId);
      document.title = I.siteName;
      return;
    }

    $('#featured-news-detail-content').html(
      '<div class="text-center py-5" id="featured-news-detail-loading"><i class="fas fa-spinner fa-spin"></i> ' +
        I.loading +
        '</div>'
    );

    fetch(I.json)
      .then(function (r) {
        if (!r.ok) throw new Error('json');
        return r.json();
      })
      .then(function (data) {
        var list = data.news || [];
        var newsItem = list.find(function (item) {
          return item.id == id;
        });

        if (!newsItem) {
          renderMessage(I.notFound);
          document.title = I.siteName;
          return;
        }

        if (!isPostActivePublic(newsItem)) {
          renderMessage(I.notActive);
          document.title = I.siteName;
          return;
        }

        renderDetails(newsItem);
      })
      .catch(function () {
        renderMessage(I.notFound);
        document.title = I.siteName;
      });
  }

  $(function () {
    bindGalleryModal();
    load();
  });
})();
