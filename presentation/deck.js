// Tiny dependency-free slide deck: arrow/space nav, dots, progress, fullscreen.
(() => {
  const slides = [...document.querySelectorAll(".slide")];
  const bar = document.getElementById("bar");
  const dotsWrap = document.getElementById("dots");
  let i = 0;

  slides.forEach((_, n) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", `Go to slide ${n + 1}`);
    b.addEventListener("click", () => go(n));
    dotsWrap.appendChild(b);
  });
  const dots = [...dotsWrap.children];

  function go(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle("active", k === i));
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
    bar.style.width = `${((i + 1) / slides.length) * 100}%`;
    location.hash = `#${i + 1}`;
  }

  function next() {
    go(i + 1);
  }
  function prev() {
    go(i - 1);
  }

  document.addEventListener("keydown", (e) => {
    if (["ArrowRight", " ", "PageDown", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      next();
    } else if (["ArrowLeft", "PageUp", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      prev();
    } else if (e.key === "Home") go(0);
    else if (e.key === "End") go(slides.length - 1);
    else if (e.key.toLowerCase() === "f") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  });

  // Swipe on touch devices.
  let x0 = null;
  document.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  document.addEventListener(
    "touchend",
    (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      x0 = null;
    },
    { passive: true },
  );

  const start = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(start) && start > 0 ? start - 1 : 0);
})();
