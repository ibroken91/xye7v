/**
 * News SEO Enhancement for Static Websites
 * This file handles URL parameters, dynamic meta tags, and SEO optimization
 * for news pages without requiring server-side rendering.
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    baseUrl: window.location.origin + window.location.pathname,
    siteName: {
      ar: 'مركز الدفاع الإلكتروني',
      en: 'Cyber Defense Center'
    }
  };

  /**
   * Get URL parameter value
   */
  function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  /**
   * Update page metadata for SEO
   */
  function updatePageMetadata(newsItem, lang) {
    if (!newsItem) return;

    // Update page title
    const siteName = config.siteName[lang] || config.siteName.ar;
    document.title = newsItem.title + ' - ' + siteName;

    // Update or create meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    // Remove HTML tags from excerpt for meta description
    const cleanExcerpt = newsItem.excerpt.replace(/<[^>]*>/g, '').substring(0, 160);
    metaDesc.content = cleanExcerpt;

    // Update or create Open Graph tags
    updateOpenGraphTags(newsItem, lang);

    // Update canonical URL (critical for SEO)
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;

    // Update structured data (JSON-LD) for rich snippets
    updateStructuredData(newsItem, lang);
  }

  /**
   * Update Open Graph tags for social media sharing
   */
  function updateOpenGraphTags(newsItem, lang) {
    const ogTags = {
      'og:title': newsItem.title,
      'og:description': newsItem.excerpt.replace(/<[^>]*>/g, '').substring(0, 200),
      'og:type': 'article',
      'og:url': window.location.href
    };

    // Add og:image if available (you can add image field to JSON later)
    if (newsItem.image) {
      ogTags['og:image'] = newsItem.image;
    }

    Object.keys(ogTags).forEach(property => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.content = ogTags[property];
    });
  }

  /**
   * Update structured data (JSON-LD) for Google rich snippets
   */
  function updateStructuredData(newsItem, lang) {
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"][data-news-seo]');
    if (existingScript) {
      existingScript.remove();
    }

    // Parse date for proper format
    const datePublished = parseDateForStructuredData(newsItem.date, lang);

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'headline': newsItem.title,
      'description': newsItem.excerpt.replace(/<[^>]*>/g, ''),
      'datePublished': datePublished,
      'dateModified': datePublished,
      'author': {
        '@type': 'Organization',
        'name': config.siteName[lang] || config.siteName.ar
      },
      'publisher': {
        '@type': 'Organization',
        'name': config.siteName[lang] || config.siteName.ar
      }
    };

    // Add image if available
    if (newsItem.image) {
      structuredData.image = newsItem.image;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-news-seo', 'true');
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  /**
   * Parse date for structured data format (ISO 8601)
   */
  function parseDateForStructuredData(dateText, lang) {
    if (!dateText) return new Date().toISOString();

    // Try to parse Arabic date format: "15 نوفمبر 2024"
    const arabicMonths = {
      'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04',
      'مايو': '05', 'يونيو': '06', 'يوليو': '07', 'أغسطس': '08',
      'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12'
    };

    if (lang === 'ar') {
      const arabicPattern = /(\d+)\s+([أ-ي]+)\s+(\d+)/;
      const match = dateText.match(arabicPattern);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = arabicMonths[match[2]] || '01';
        const year = match[3];
        return `${year}-${month}-${day}T00:00:00+04:00`; // Adjust timezone as needed
      }
    }

    // Try English format: "November 15, 2024"
    const englishPattern = /([A-Za-z]+)\s+(\d+)[,\s]+(\d+)/;
    const englishMatch = dateText.match(englishPattern);
    if (englishMatch) {
      const englishMonths = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      const month = englishMonths[englishMatch[1]] || '01';
      const day = englishMatch[2].padStart(2, '0');
      const year = englishMatch[3];
      return `${year}-${month}-${day}T00:00:00+04:00`;
    }

    // Fallback to current date
    return new Date().toISOString();
  }

  /**
   * Update URL without page reload (for better UX)
   */
  function updateURL(newsId, replace) {
    const newUrl = newsId ? `?id=${newsId}` : window.location.pathname;
    if (replace) {
      window.history.replaceState({ id: newsId }, '', newUrl);
    } else {
      window.history.pushState({ id: newsId }, '', newUrl);
    }
  }

  /**
   * Reset page metadata to default (for news list page)
   */
  function resetPageMetadata(lang) {
    const siteName = config.siteName[lang] || config.siteName.ar;
    const defaultTitle = lang === 'ar' ? 'المركز الإعلامي' : 'Media Center';
    document.title = defaultTitle + ' - ' + siteName;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const defaultDesc = lang === 'ar' 
        ? 'آخر الأخبار والفعاليات والإعلانات من مركز الدفاع الإلكتروني في سلطنة عمان.'
        : 'Latest news, events, and announcements from the Cyber Defense Center in Oman.';
      metaDesc.content = defaultDesc;
    }

    // Remove canonical or set to base URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = config.baseUrl;
    }

    // Remove structured data for individual article
    const structuredData = document.querySelector('script[type="application/ld+json"][data-news-seo]');
    if (structuredData) {
      structuredData.remove();
    }
  }

  /**
   * Initialize SEO functionality
   * This should be called after news data is loaded
   */
  function initNewsSEO(newsData, lang, showNewsDetailsCallback) {
    // Check if we have an ID in the URL
    const newsId = getUrlParameter('id');

    if (newsId) {
      const id = parseInt(newsId);
      const newsItem = newsData.find(item => item.id === id);
      
      if (newsItem) {
        // Update metadata immediately
        updatePageMetadata(newsItem, lang);
        
        // Show the news details (call the callback function)
        if (showNewsDetailsCallback && typeof showNewsDetailsCallback === 'function') {
          showNewsDetailsCallback(id);
        }
      } else {
        // Invalid ID, reset to list view
        resetPageMetadata(lang);
        updateURL(null, true);
      }
    } else {
      // No ID, we're on the list page
      resetPageMetadata(lang);
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(event) {
      const id = event.state ? event.state.id : null;
      const urlId = getUrlParameter('id');
      const currentId = id || (urlId ? parseInt(urlId) : null);

      if (currentId) {
        const newsItem = newsData.find(item => item.id === currentId);
        if (newsItem) {
          updatePageMetadata(newsItem, lang);
          if (showNewsDetailsCallback) {
            showNewsDetailsCallback(currentId);
          }
        }
      } else {
        resetPageMetadata(lang);
        if (showNewsDetailsCallback) {
          // Call back to grid function if it exists
          if (typeof window.backToNewsGrid === 'function') {
            window.backToNewsGrid();
          }
        }
      }
    });
  }

  /**
   * Enhanced showNewsDetails wrapper
   * Call this instead of the original showNewsDetails to get SEO benefits
   */
  function showNewsDetailsWithSEO(newsId, newsData, lang, originalShowDetails) {
    const newsItem = newsData.find(item => item.id === newsId);
    
    if (!newsItem) return;

    // Update URL
    updateURL(newsId, false);

    // Update metadata
    updatePageMetadata(newsItem, lang);

    // Call original function
    if (originalShowDetails && typeof originalShowDetails === 'function') {
      originalShowDetails(newsId);
    }
  }

  /**
   * Enhanced backToNewsGrid wrapper
   */
  function backToNewsGridWithSEO(lang, originalBackToGrid) {
    // Update URL
    updateURL(null, false);

    // Reset metadata
    resetPageMetadata(lang);

    // Call original function
    if (originalBackToGrid && typeof originalBackToGrid === 'function') {
      originalBackToGrid();
    }
  }

  // Export functions to global scope
  window.NewsSEO = {
    init: initNewsSEO,
    showDetails: showNewsDetailsWithSEO,
    backToGrid: backToNewsGridWithSEO,
    updateMetadata: updatePageMetadata,
    resetMetadata: resetPageMetadata,
    getUrlParameter: getUrlParameter
  };

})();


