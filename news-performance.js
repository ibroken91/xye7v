/**
 * News Performance Optimization Module
 * Handles pagination, lazy loading, caching, and performance optimizations
 * for large news datasets stored in JSON files.
 */

(function() {
  'use strict';

  const NewsPerformance = {
    // Configuration
    config: {
      itemsPerPage: 6, // Number of items to load per page
      cacheEnabled: true, // Enable IndexedDB caching
      cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      debounceDelay: 300, // Debounce delay for scroll events
      preloadNextPage: true, // Preload next page while user scrolls
      virtualScrolling: false // Use virtual scrolling for very large lists
    },

    // State
    state: {
      currentPage: 1,
      totalPages: 0,
      allNews: [],
      cachedNews: null,
      isLoading: false,
      lastCacheTime: null
    },

    /**
     * Initialize performance optimizations
     */
    init: function(config) {
      if (config) {
        Object.assign(this.config, config);
      }

      // Initialize IndexedDB cache if enabled
      if (this.config.cacheEnabled) {
        this.initCache();
      }

      // Setup intersection observer for lazy loading images (if you add images later)
      this.setupLazyLoading();

      // Setup scroll debouncing for pagination
      this.setupScrollHandler();
    },

    /**
     * Initialize IndexedDB for caching news data
     */
    initCache: function() {
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB not supported, caching disabled');
        this.config.cacheEnabled = false;
        return;
      }

      const request = indexedDB.open('NewsCache', 1);

      request.onerror = () => {
        console.warn('IndexedDB error, caching disabled');
        this.config.cacheEnabled = false;
      };

      request.onsuccess = () => {
        this.db = request.result;
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('news')) {
          const store = db.createObjectStore('news', { keyPath: 'lang' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    },

    /**
     * Load news with pagination and caching
     * Prefers network over cache so manual activation from admin is visible after refresh.
     */
    loadNews: function(lang, page, callback) {
      if (this.state.isLoading) {
        return; // Prevent multiple simultaneous loads
      }

      this.state.isLoading = true;
      this.state.currentPage = page || 1;

      // Always load from JSON first (fresh data); use cache only when network fails
      if (this.config.cacheEnabled && this.db) {
        this.loadFromJSON(lang, page, (pageNews, totalPages, totalItems) => {
          if (callback) callback(pageNews, totalPages, totalItems);
        }, (fallbackToCache) => {
          if (fallbackToCache) {
            this.loadFromCache(lang, (cachedData) => {
              if (cachedData && cachedData.news && cachedData.news.length > 0) {
                const cachedNews = cachedData.news || [];
                const activeCachedNews = cachedNews.filter(item => this.isPostActive(item));
                this.state.allNews = activeCachedNews;
                this.processAndRender(activeCachedNews, page, (pn, tp, ti) => {
                  this.state.isLoading = false;
                  if (callback) callback(pn, tp, ti);
                });
                return;
              }
              this.state.isLoading = false;
              if (callback) callback([], 0, 0);
            });
          } else {
            this.state.isLoading = false;
            if (callback) callback([], 0, 0);
          }
        });
      } else {
        this.loadFromJSON(lang, page, (pageNews, totalPages, totalItems) => {
          this.state.isLoading = false;
          if (callback) callback(pageNews, totalPages, totalItems);
        });
      }
    },

    /**
     * Load news from JSON file with pagination
     * @param {string} lang - Language code
     * @param {number} page - Page number
     * @param {function} callback - Success callback(pageNews, totalPages, totalItems)
     * @param {function} [errorCallback] - Optional. Called on fetch failure with (fallbackToCache). If provided, caller may try cache.
     */
    loadFromJSON: function(lang, page, callback, errorCallback) {
      const startTime = performance.now();
      // Cache-bust so manual activation from admin is visible (avoid stale HTTP cache)
      const jsonFile = `../../data/news-${lang}.json?t=${Date.now()}`;

      // Use fetch API for better performance than jQuery
      fetch(jsonFile)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => {
          const loadTime = performance.now() - startTime;
          console.log(`News loaded in ${loadTime.toFixed(2)}ms`);

          const newsArray = data.news || [];
          // Filter out inactive posts before storing
          const activeNews = newsArray.filter(item => this.isPostActive(item));
          this.state.allNews = activeNews;

          // Cache the data if enabled (cache only active news)
          if (this.config.cacheEnabled && this.db) {
            this.saveToCache(lang, activeNews);
          }

          // Process and render with pagination
          this.processAndRender(activeNews, page, callback);
        })
        .catch(error => {
          console.error('Failed to load news:', error);
          this.state.isLoading = false;
          if (errorCallback && typeof errorCallback === 'function') {
            errorCallback(true);
          } else if (callback) {
            callback([], 0, 0);
          }
        });
    },

    /**
     * Check if a post is active (not manually deactivated and not expired)
     */
    isPostActive: function(item) {
      // Check for manual override first
      if (item.isManuallyActive !== undefined) {
        return item.isManuallyActive;
      }
      
      if (!item.activeDuration || !item.createdDate) {
        // If no duration/date set, consider it active by default
        return true;
      }
      
      const createdDate = new Date(item.createdDate);
      const expirationDate = new Date(createdDate);
      expirationDate.setDate(expirationDate.getDate() + parseInt(item.activeDuration));
      
      return new Date() <= expirationDate;
    },

    /**
     * Process news array and apply pagination
     */
    processAndRender: function(newsArray, page, callback) {
      // Filter out inactive posts first
      const activeNews = newsArray.filter(item => this.isPostActive(item));
      
      // Sort news by date (if not already sorted)
      const sortedNews = this.sortNews(activeNews);

      // Calculate pagination
      const totalItems = sortedNews.length;
      const itemsPerPage = this.config.itemsPerPage;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      this.state.totalPages = totalPages;

      // Get items for current page
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageNews = sortedNews.slice(startIndex, endIndex);

      this.state.isLoading = false;

      // Call callback with paginated data
      if (callback) {
        callback(pageNews, totalPages, totalItems);
      }
    },

    /**
     * Sort news by date (newest first, featured first)
     */
    sortNews: function(newsArray) {
      if (!newsArray || newsArray.length === 0) return [];

      // Create a copy to avoid mutating original
      const sorted = newsArray.slice();

      // Order by publication `date` only (never createdDate / JSON insertion order)
      sorted.sort((a, b) => {
        // Featured items first
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;

        const dateA = this.parseDate(a.date);
        const dateB = this.parseDate(b.date);
        const byTime = dateB.getTime() - dateA.getTime();
        if (byTime !== 0) return byTime;
        const idA = a.id != null ? Number(a.id) : 0;
        const idB = b.id != null ? Number(b.id) : 0;
        return idB - idA;
      });

      return sorted;
    },

    /**
     * Parse date string to Date object
     */
    parseDate: function(dateText) {
      if (!dateText) return new Date(0);

      // Arabic months mapping
      const arabicMonths = {
        'يناير': 'January', 'فبراير': 'February', 'مارس': 'March', 'أبريل': 'April',
        'مايو': 'May', 'يونيو': 'June', 'يوليو': 'July', 'أغسطس': 'August',
        'سبتمبر': 'September', 'أكتوبر': 'October', 'نوفمبر': 'November', 'ديسمبر': 'December'
      };

      // Try Arabic format
      const arabicPattern = /(\d+)\s+([أ-ي]+)\s+(\d+)/;
      const arabicMatch = dateText.match(arabicPattern);
      if (arabicMatch) {
        const day = parseInt(arabicMatch[1]);
        const arabicMonth = arabicMatch[2];
        const englishMonth = arabicMonths[arabicMonth];
        if (englishMonth) {
          const months = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
          const monthIndex = months.indexOf(englishMonth);
          const year = parseInt(arabicMatch[3]);
          return new Date(year, monthIndex, day);
        }
      }

      // Try English format
      const englishPattern = /([A-Za-z]+)\s+(\d+)[,\s]+(\d+)/;
      const englishMatch = dateText.match(englishPattern);
      if (englishMatch) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = months.indexOf(englishMatch[1]);
        if (monthIndex !== -1) {
          const day = parseInt(englishMatch[2]);
          const year = parseInt(englishMatch[3]);
          return new Date(year, monthIndex, day);
        }
      }

      // Fallback
      const parsed = new Date(dateText);
      return isNaN(parsed.getTime()) ? new Date(0) : parsed;
    },

    /**
     * Load news from IndexedDB cache
     */
    loadFromCache: function(lang, callback) {
      if (!this.db) {
        callback(null);
        return;
      }

      const transaction = this.db.transaction(['news'], 'readonly');
      const store = transaction.objectStore('news');
      const request = store.get(lang);

      request.onsuccess = () => {
        callback(request.result || null);
      };

      request.onerror = () => {
        callback(null);
      };
    },

    /**
     * Save news to IndexedDB cache
     */
    saveToCache: function(lang, newsArray) {
      if (!this.db) return;

      const transaction = this.db.transaction(['news'], 'readwrite');
      const store = transaction.objectStore('news');
      const data = {
        lang: lang,
        news: newsArray,
        timestamp: Date.now()
      };

      store.put(data);
    },

    /**
     * Check if cache is still valid
     */
    isCacheValid: function(timestamp) {
      if (!timestamp) return false;
      const age = Date.now() - timestamp;
      return age < this.config.cacheExpiry;
    },

    /**
     * Setup lazy loading for images (if you add images to news items)
     */
    setupLazyLoading: function() {
      if ('IntersectionObserver' in window) {
        this.imageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                this.imageObserver.unobserve(img);
              }
            }
          });
        }, {
          rootMargin: '50px' // Start loading 50px before image enters viewport
        });
      }
    },

     /**
      * Setup scroll handler for infinite scroll pagination
      * Uses IntersectionObserver for better performance
      */
     setupScrollHandler: function() {
       // Only setup scroll handler if infinite scroll is enabled
       if (!this.config.preloadNextPage) {
         return;
       }
       
       // Use IntersectionObserver for better performance
       if ('IntersectionObserver' in window) {
         this.setupIntersectionObserver();
       } else {
         // Fallback to scroll event for older browsers
         let scrollTimeout;
         const self = this;

         window.addEventListener('scroll', () => {
           clearTimeout(scrollTimeout);
           scrollTimeout = setTimeout(() => {
             self.checkScrollPosition();
           }, this.config.debounceDelay);
         }, { passive: true });
       }
     },
     
     /**
      * Setup IntersectionObserver to watch the last card
      */
     setupIntersectionObserver: function() {
       const self = this;
       
       // Observer options: trigger when middle of element is visible
       const observerOptions = {
         root: null, // viewport
         rootMargin: '0px',
         threshold: 0.5 // Trigger when 50% (middle) of element is visible
       };
       
       this.scrollObserver = new IntersectionObserver((entries) => {
         entries.forEach(entry => {
           // If middle of last card is visible and we're not loading
           if (entry.isIntersecting && 
               !self.state.isLoading && 
               self.state.currentPage < self.state.totalPages) {
             self.loadNextPage();
           }
         });
       }, observerOptions);
       
       // Start observing after first page loads
       // We'll attach observer in checkScrollPosition or after initial render
     },
     
     /**
      * Observe the last card for intersection
      */
     observeLastCard: function() {
       if (!this.scrollObserver) return;
       
       const newsGrid = document.getElementById('news-grid');
       if (!newsGrid) return;
       
       const cards = newsGrid.querySelectorAll('.news-card');
       if (cards.length === 0) return;
       
       // Stop observing previous last card
       this.scrollObserver.disconnect();
       
       // Observe the new last card
       const lastCard = cards[cards.length - 1];
       this.scrollObserver.observe(lastCard);
     },

    /**
     * Check scroll position and load next page if needed
     * Triggers when middle of last card is visible
     * (Fallback method for browsers without IntersectionObserver)
     */
    checkScrollPosition: function() {
      if (this.state.isLoading || this.state.currentPage >= this.state.totalPages) {
        return;
      }

      // Find the last news card in the grid
      const newsGrid = document.getElementById('news-grid');
      if (!newsGrid) return;

      const cards = newsGrid.querySelectorAll('.news-card');
      if (cards.length === 0) return;

      // Get the last card
      const lastCard = cards[cards.length - 1];
      const lastCardRect = lastCard.getBoundingClientRect();
      
      // Calculate the middle point of the last card
      const lastCardMiddle = lastCardRect.top + (lastCardRect.height / 2);
      
      // Check if the middle of the last card is visible in viewport
      const viewportHeight = window.innerHeight;
      
      // If middle of last card is visible (between top and bottom of viewport)
      if (lastCardMiddle >= 0 && lastCardMiddle <= viewportHeight) {
        // Load next page
        this.loadNextPage();
      }
    },

     /**
      * Load next page of news (for infinite scroll)
      */
     loadNextPage: function() {
       if (this.state.currentPage < this.state.totalPages) {
         const nextPage = this.state.currentPage + 1;
         
         // Show loading indicator
         const loadingEl = document.getElementById('news-loading');
         if (loadingEl) {
           loadingEl.style.display = 'block';
         }
         
         this.loadNews(this.currentLang, nextPage, (news, totalPages, totalItems) => {
           // Hide loading indicator
           if (loadingEl) {
             loadingEl.style.display = 'none';
           }
           
           // Append news to existing grid with fade effect
           // The appendNewsCards function handles the fade-in animation
           if (window.appendNewsCards && typeof window.appendNewsCards === 'function') {
             window.appendNewsCards(news);
           }
           
           // Update IntersectionObserver to watch the new last card
           if (this.scrollObserver) {
             // Use setTimeout to ensure DOM is updated
             setTimeout(() => {
               this.observeLastCard();
             }, 100);
           }
         });
       }
     },

    /**
     * Clear cache (useful for testing or forced refresh)
     */
    clearCache: function() {
      if (!this.db) return;

      const transaction = this.db.transaction(['news'], 'readwrite');
      const store = transaction.objectStore('news');
      store.clear();
    },

    /**
     * Get performance metrics
     */
    getMetrics: function() {
      return {
        totalItems: this.state.allNews.length,
        currentPage: this.state.currentPage,
        totalPages: this.state.totalPages,
        itemsPerPage: this.config.itemsPerPage,
        cacheEnabled: this.config.cacheEnabled,
        hasCache: this.state.cachedNews !== null
      };
    }
  };

  // Export to global scope
  window.NewsPerformance = NewsPerformance;

})();

