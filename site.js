(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
  const progress = document.querySelector(".scroll-progress span");
  const header = document.querySelector("[data-header]");
  const hero = document.querySelector("[data-hero]");
  const heroMedia = document.querySelector("[data-parallax]");
  const standardImage = document.querySelector(".standard-image");

  root.classList.add("motion-ready");

  revealItems.forEach((item) => {
    const delay = item.getAttribute("data-delay");
    if (delay) item.style.setProperty("--reveal-delay", `${delay}ms`);
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    if (standardImage) standardImage.classList.add("is-active");
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7%" });

    revealItems.forEach((item) => observer.observe(item));

    if (standardImage) {
      const visualObserver = new IntersectionObserver((entries) => {
        if (!entries[0]?.isIntersecting) return;
        standardImage.classList.add("is-active");
        visualObserver.disconnect();
      }, { threshold: 0.28 });
      visualObserver.observe(standardImage);
    }
  }

  let framePending = false;
  const updateScroll = () => {
    const y = window.scrollY;
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    if (progress) progress.style.transform = `scaleX(${Math.min(y / scrollable, 1)})`;
    if (header) header.classList.toggle("is-scrolled", y > 24);
    if (!reduceMotion && heroMedia && y < window.innerHeight * 1.35) {
      heroMedia.style.setProperty("--parallax-y", `${Math.min(y * 0.09, 92)}px`);
    }
    framePending = false;
  };

  window.addEventListener("scroll", () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateScroll);
  }, { passive: true });

  if (!reduceMotion && hero) {
    hero.addEventListener("pointermove", (event) => {
      const bounds = hero.getBoundingClientRect();
      hero.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
      hero.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    }, { passive: true });
  }

  updateScroll();
})();
