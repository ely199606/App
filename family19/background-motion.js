/* Fondo continuo del colegio: color difuminado que se mueve de verdad. */
(() => {
  'use strict';
  const canvas = document.getElementById('school-background');
  const context = canvas?.getContext?.('2d', { alpha: false });
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const interval = 1000 / 24;
  let width = 0, height = 0, frames = 0, elapsedMs = 0;
  let raf = 0, lastTick = 0, lastDraw = 0;
  const canMove = () => !!context && !document.hidden && !preference?.matches;

  function ellipse(x, y, radiusX, radiusY, colors) {
    context.save();
    context.translate(x, y);
    context.scale(radiusX, radiusY);
    const paint = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    colors.forEach(([position, color]) => paint.addColorStop(position, color));
    context.fillStyle = paint;
    context.fillRect(-x / radiusX, -y / radiusY,
      canvas.width / radiusX, canvas.height / radiusY);
    context.restore();
  }

  function draw() {
    if (!context || !canvas.width || !canvas.height) return;
    const t = elapsedMs / 1000, w = canvas.width, h = canvas.height;
    const drift = Math.sin(t * Math.PI * 2 / 30 - .65);
    const base = context.createLinearGradient(
      w * (-.22 + .22 * drift), 0,
      w * (1.12 + .22 * drift), h * .32);
    base.addColorStop(0, '#fa3d49');
    base.addColorStop(.22, '#ee443c');
    base.addColorStop(.51, '#a67c37');
    base.addColorStop(.77, '#299e3c');
    base.addColorStop(1, '#128d3c');
    context.fillStyle = base;
    context.fillRect(0, 0, w, h);

    // These large, transparent ellipses merge without solid wave outlines.
    ellipse(w * (.20 + .27 * Math.sin(t * Math.PI * 2 / 26 - .55)),
      h * (.40 + .22 * Math.sin(t * Math.PI * 2 / 30 + .35)),
      w * .92, h * .92,
      [[0, 'rgba(255,51,66,.90)'], [.36, 'rgba(251,61,65,.61)'],
       [.76, 'rgba(248,66,67,.14)'], [1, 'rgba(248,66,67,0)']]);
    ellipse(w * (.86 - .27 * Math.sin(t * Math.PI * 2 / 28 - .45)),
      h * (.62 + .23 * Math.sin(t * Math.PI * 2 / 29 + .75)),
      w * 1.02, h * .96,
      [[0, 'rgba(42,177,58,.93)'], [.37, 'rgba(35,163,56,.66)'],
       [.78, 'rgba(33,151,55,.17)'], [1, 'rgba(33,151,55,0)']]);
    frames++;
  }

  function tick(now) {
    raf = 0;
    if (!canMove()) { lastTick = 0; return; }
    if (lastTick) elapsedMs += Math.max(0, Math.min(now - lastTick, 100));
    lastTick = now;
    if (now - lastDraw >= interval) {
      draw();
      lastDraw = now - ((now - lastDraw) % interval);
    }
    raf = window.requestAnimationFrame(tick);
  }

  function sync() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    lastTick = 0;
    lastDraw = window.performance.now();
    if (canMove()) raf = window.requestAnimationFrame(tick);
  }

  function resize() {
    if (!context) return;
    const nextWidth = Math.max(1, Math.round(window.innerWidth));
    const nextHeight = Math.max(1, Math.round(window.innerHeight));
    if (width === nextWidth && height === nextHeight && canvas.width) return;
    width = nextWidth;
    height = nextHeight;
    // Low-resolution color fields are deliberately smooth and cheap to paint.
    const scale = .5 * Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.min(1080, Math.round(width * scale)));
    canvas.height = Math.max(1, Math.min(1920, Math.round(height * scale)));
    draw();
  }

  window.AppSchoolingBackground = Object.freeze({
    status: () => ({
      available: !!context, running: !!raf && canMove(), frames,
      reducedMotion: !!preference?.matches, hidden: !!document.hidden,
      elapsedMs: Math.round(elapsedMs), width, height,
      pixelWidth: canvas?.width || 0, pixelHeight: canvas?.height || 0, fps: 24
    })
  });
  if (!context) return;
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  if (preference?.addEventListener) preference.addEventListener('change', sync);
  else preference?.addListener?.(sync);
  resize();
  sync();
})();
