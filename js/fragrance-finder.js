/* ============================================================
   AR-RAHMANI — Fragrance Finder
   Interactive mood-based fragrance browser
   ============================================================ */

const FragranceFinder = {
  fragrances: [
    {
      name: 'Hamood',
      family: 'Woody Oud',
      mood: ['dark-oud', 'statement', 'evening'],
      description: 'A commanding presence of rare oud with smoky undertones and royal amber.',
      image: 'assets/images/collection-1.png'
    },
    {
      name: 'Sabr',
      family: 'Oriental',
      mood: ['dark-oud', 'evening'],
      description: 'Patience distilled — deep amber, sacred incense, and aged sandalwood.',
      image: 'assets/images/collection-1.png'
    },
    {
      name: 'Rahna',
      family: 'Floral Oriental',
      mood: ['floral', 'romantic', 'sweet'],
      description: 'An enchanting bouquet of Damascus rose, jasmine, and soft musk.',
      image: 'assets/images/collection-2.png'
    },
    {
      name: 'Baby Powder',
      family: 'Powdery Musk',
      mood: ['sweet', 'fresh', 'luxury-daily'],
      description: 'Clean innocence wrapped in powdery iris, white musk, and soft vanilla.',
      image: 'assets/images/collection-2.png'
    },
    {
      name: 'Miami Breez',
      family: 'Fresh Aquatic',
      mood: ['fresh', 'luxury-daily'],
      description: 'Ocean winds meet citrus gardens — bergamot, sea salt, and driftwood.',
      image: 'assets/images/collection-3.png'
    },
    {
      name: 'Mi Amor',
      family: 'Romantic Gourmand',
      mood: ['romantic', 'sweet', 'evening'],
      description: 'Love letter in a bottle — velvet rose, caramel, and warm tonka.',
      image: 'assets/images/collection-3.png'
    },
    {
      name: 'Aura',
      family: 'Mystical Amber',
      mood: ['statement', 'evening', 'dark-oud'],
      description: 'An ethereal aura of golden amber, saffron, and mystical frankincense.',
      image: 'assets/images/collection-1.png'
    },
    {
      name: 'Fathima',
      family: 'Floral Oud',
      mood: ['floral', 'romantic', 'statement'],
      description: 'Graceful femininity — Turkish rose, precious oud, and delicate saffron.',
      image: 'assets/images/collection-2.png'
    },
    {
      name: 'Crystal Oud',
      family: 'Premium Oud',
      mood: ['dark-oud', 'statement', 'evening'],
      description: 'Crystal clarity meets ancient oud — transparent, powerful, unforgettable.',
      image: 'assets/images/collection-3.png'
    },
    {
      name: 'Ramadan',
      family: 'Sacred Blend',
      mood: ['dark-oud', 'evening'],
      description: 'Spiritual elegance — blessed oud, bakhoor, and precious musk tahara.',
      image: 'assets/images/collection-1.png'
    },
    {
      name: 'Bin Rahman',
      family: 'Royal Heritage',
      mood: ['dark-oud', 'statement'],
      description: 'A legacy in every drop — royal oud, leather, and aged Indian sandalwood.',
      image: 'assets/images/collection-2.png'
    },
    {
      name: 'Oud400',
      family: 'Vintage Oud',
      mood: ['dark-oud', 'statement', 'evening'],
      description: 'Four centuries of oud mastery concentrated into one legendary extrait.',
      image: 'assets/images/collection-3.png'
    },
    {
      name: 'Paradise Fusion',
      family: 'Exotic Blend',
      mood: ['fresh', 'sweet', 'luxury-daily', 'romantic'],
      description: 'A paradise of tropical fruits, white flowers, and silky musk.',
      image: 'assets/images/collection-1.png'
    }
  ],

  activeMood: null,
  resultsContainer: null,

  init() {
    this.resultsContainer = document.getElementById('finder-results');
    if (!this.resultsContainer) return;

    this.setupMoodButtons();
    this.showAll();
  },

  setupMoodButtons() {
    const pills = document.querySelectorAll('.mood-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const mood = pill.dataset.mood;

        // Toggle active state
        pills.forEach(p => p.classList.remove('active'));

        if (this.activeMood === mood) {
          this.activeMood = null;
          this.showAll();
        } else {
          this.activeMood = mood;
          pill.classList.add('active');
          this.filterByMood(mood);
        }
      });
    });
  },

  filterByMood(mood) {
    const filtered = this.fragrances.filter(f => f.mood.includes(mood));
    this.renderResults(filtered);
  },

  showAll() {
    this.renderResults(this.fragrances);
  },

  renderResults(fragrances) {
    if (!this.resultsContainer) return;

    // Fade out
    this.resultsContainer.style.opacity = '0';
    this.resultsContainer.style.transform = 'translateY(20px)';

    setTimeout(() => {
      if (fragrances.length === 0) {
        this.resultsContainer.innerHTML = `
          <div class="finder-empty">
            <p>No fragrances found for this mood</p>
          </div>
        `;
      } else {
        this.resultsContainer.innerHTML = fragrances.map(f => `
          <div class="product-card reveal-up revealed">
            <div class="product-card-image">
              <img src="${f.image}" alt="${f.name}" loading="lazy">
            </div>
            <div class="product-card-content">
              <div class="product-card-family">${f.family}</div>
              <h3 class="product-card-name">${f.name}</h3>
              <p class="product-card-desc">${f.description}</p>
              <a href="#" class="product-card-btn">
                Explore <span class="arrow">→</span>
              </a>
            </div>
          </div>
        `).join('');

        // Re-setup tilt for new cards
        if (typeof Animations !== 'undefined') {
          Animations.setupTiltCards();
        }
        if (typeof Cursor !== 'undefined' && !Cursor.isTouch) {
          Cursor.setupHoverTargets();
        }
      }

      // Fade in
      requestAnimationFrame(() => {
        this.resultsContainer.style.opacity = '1';
        this.resultsContainer.style.transform = 'translateY(0)';
      });
    }, 300);
  }
};
