/**
 * DecayCard - Vanilla JS Port
 * Ported from React component to Vanilla JS.
 */

class DecayCard {
  constructor(container, options = {}) {
    this.container = container;
    if (!this.container) return;

    this.imageSrc = this.container.dataset.image || options.image;
    this.baseFrequency = options.baseFrequency || 0.015;
    this.numOctaves = options.numOctaves || 5;
    this.seed = options.seed || Math.floor(Math.random() * 10);
    this.maxDisplacement = options.maxDisplacement || 400;
    this.movementBound = options.movementBound || 50;

    // Generate unique ID for the SVG filter so multiple instances don't clash
    this.filterId = `decayFilter_${Math.random().toString(36).substr(2, 9)}`;

    this.cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.cachedCursor = { ...this.cursor };
    this.winsize = { width: window.innerWidth, height: window.innerHeight };

    this.imgValues = {
      x: 0,
      y: 0,
      rz: 0,
      displacementScale: 0
    };

    this.init();
  }

  init() {
    // 1. Build the SVG structure
    this.container.innerHTML = `
      <svg viewBox="-60 -75 720 900" preserveAspectRatio="xMidYMid slice" class="decay-card-svg">
        <filter id="${this.filterId}">
          <feTurbulence
            type="turbulence"
            baseFrequency="${this.baseFrequency}"
            numOctaves="${this.numOctaves}"
            seed="${this.seed}"
            stitchTiles="stitch"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="turbulence1"
          />
          <feDisplacementMap
            class="displacement-map"
            in="SourceGraphic"
            in2="turbulence1"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="B"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="displacementMap"
          />
        </filter>
        <g>
          <image
            href="${this.imageSrc}"
            x="0"
            y="0"
            width="600"
            height="750"
            filter="url(#${this.filterId})"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      </svg>
    `;

    this.svgElement = this.container.querySelector('.decay-card-svg');
    this.displacementMap = this.container.querySelector('.displacement-map');

    // 2. Bind event listeners
    this.handleResize = () => {
      this.winsize = { width: window.innerWidth, height: window.innerHeight };
    };

    this.handleMouseMove = (ev) => {
      this.cursor = { x: ev.clientX, y: ev.clientY };
    };

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);

    // 3. Start animation loop
    this.render();
  }

  lerp(a, b, n) {
    return (1 - n) * a + n * b;
  }

  map(x, a, b, c, d) {
    return ((x - a) * (d - c)) / (b - a) + c;
  }

  distance(x1, x2, y1, y2) {
    const a = x1 - x2;
    const b = y1 - y2;
    return Math.hypot(a, b);
  }

  render() {
    let targetX = this.lerp(this.imgValues.x, this.map(this.cursor.x, 0, this.winsize.width, -120, 120), 0.1);
    let targetY = this.lerp(this.imgValues.y, this.map(this.cursor.y, 0, this.winsize.height, -120, 120), 0.1);
    let targetRz = this.lerp(this.imgValues.rz, this.map(this.cursor.x, 0, this.winsize.width, -10, 10), 0.1);

    // Bound limits
    if (targetX > this.movementBound) targetX = this.movementBound + (targetX - this.movementBound) * 0.2;
    if (targetX < -this.movementBound) targetX = -this.movementBound + (targetX + this.movementBound) * 0.2;
    if (targetY > this.movementBound) targetY = this.movementBound + (targetY - this.movementBound) * 0.2;
    if (targetY < -this.movementBound) targetY = -this.movementBound + (targetY + this.movementBound) * 0.2;

    this.imgValues.x = targetX;
    this.imgValues.y = targetY;
    this.imgValues.rz = targetRz;

    if (this.svgElement) {
      gsap.set(this.svgElement, {
        x: this.imgValues.x,
        y: this.imgValues.y,
        rotateZ: this.imgValues.rz
      });
    }

    const cursorTravelledDistance = this.distance(
      this.cachedCursor.x,
      this.cursor.x,
      this.cachedCursor.y,
      this.cursor.y
    );
    
    this.imgValues.displacementScale = this.lerp(
      this.imgValues.displacementScale,
      this.map(cursorTravelledDistance, 0, 200, 0, this.maxDisplacement),
      0.06
    );

    if (this.displacementMap) {
      // Need to use setAttribute for SVG attributes, GSAP attr plugin does this too
      gsap.set(this.displacementMap, { attr: { scale: this.imgValues.displacementScale } });
    }

    this.cachedCursor = { ...this.cursor };

    this.rafId = requestAnimationFrame(this.render.bind(this));
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
  }
}

// Initialize all mounts on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const mounts = document.querySelectorAll('.decay-card-mount');
  mounts.forEach(mount => {
    new DecayCard(mount, {
      maxDisplacement: 400,
      movementBound: 50
    });
  });
});
