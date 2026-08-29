(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n  const phoneViewport = window.matchMedia("(max-width: 700px)").matches;
  const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
  const progress = document.querySelector(".scroll-progress span");
  const header = document.querySelector("[data-header]");
  const hero = document.querySelector("[data-hero]");
  const heroMedia = document.querySelector("[data-parallax]");
  const scrollVideo = document.querySelector("[data-scroll-video]");
  const videoStage = scrollVideo?.closest(".hero-stage");
  const standardImage = document.querySelector(".standard-image");
  let targetVideoTime = 0;
  let renderedVideoTime = 0;
  let videoFrame = 0;
  let previousFrameTime = 0;
  const videoFrameDuration = 1 / 25;

  const renderVideoFrame = (timestamp) => {
    videoFrame = 0;
    if (!scrollVideo || reduceMotion || scrollVideo.readyState < 1 || !Number.isFinite(scrollVideo.duration)) return;

    const elapsed = previousFrameTime ? Math.min(timestamp - previousFrameTime, 64) : 16.67;
    previousFrameTime = timestamp;
    const easing = 1 - Math.exp(-elapsed / 62);
    const difference = targetVideoTime - renderedVideoTime;
    renderedVideoTime += difference * easing;
    const maxVideoTime = Math.max(scrollVideo.duration - videoFrameDuration, 0);
    const seekTime = Math.min(Math.max(Math.round(renderedVideoTime / videoFrameDuration) * videoFrameDuration, 0), maxVideoTime);

    if (!scrollVideo.seeking && Math.abs(scrollVideo.currentTime - seekTime) >= videoFrameDuration * 0.45) {
      scrollVideo.currentTime = seekTime;
    }

    if (Math.abs(difference) > 0.002) {
      videoFrame = window.requestAnimationFrame(renderVideoFrame);
    } else {
      renderedVideoTime = targetVideoTime;
      if (!scrollVideo.seeking && Math.abs(scrollVideo.currentTime - targetVideoTime) >= videoFrameDuration * 0.45) {
        scrollVideo.currentTime = targetVideoTime;
      }
      previousFrameTime = 0;
    }
  };

  const queueVideoFrame = () => {
    if (!videoFrame) videoFrame = window.requestAnimationFrame(renderVideoFrame);
  };

  root.classList.add("motion-ready");

  if (scrollVideo && !reduceMotion) {
    scrollVideo.muted = true;
    const revealScrollVideo = () => {
      if (scrollVideo.readyState < 2) return;
      scrollVideo.pause();
      scrollVideo.classList.add("is-ready");
      window.requestAnimationFrame(() => updateScroll());
    };

    scrollVideo.addEventListener("loadeddata", revealScrollVideo);
    scrollVideo.addEventListener("canplay", revealScrollVideo);
    scrollVideo.addEventListener("seeked", () => {
      if (Math.abs(targetVideoTime - renderedVideoTime) > 0.002) queueVideoFrame();
    });
    scrollVideo.addEventListener("error", () => scrollVideo.classList.remove("is-ready"));

    if (scrollVideo.readyState >= 2) revealScrollVideo();

    if (phoneViewport) {
      let unlockPending = false;
      let phoneVideoUnlocked = false;
      scrollVideo.setAttribute("webkit-playsinline", "");
      if (scrollVideo.readyState < 2) scrollVideo.load();

      const unlockPhoneVideo = () => {
        if (unlockPending || phoneVideoUnlocked) return;
        unlockPending = true;
        scrollVideo.muted = true;
        const playAttempt = scrollVideo.play();

        if (playAttempt && typeof playAttempt.then === "function") {
          playAttempt
            .then(() => {
              scrollVideo.pause();
              revealScrollVideo();
              phoneVideoUnlocked = true;
              unlockPending = false;
            })
            .catch(() => {
              unlockPending = false;
              if (scrollVideo.readyState < 1) scrollVideo.load();
            });
        } else {
          scrollVideo.pause();
          revealScrollVideo();
          phoneVideoUnlocked = true;
          unlockPending = false;
        }
      };

      window.addEventListener("touchstart", unlockPhoneVideo, { passive: true });
      window.addEventListener("pointerdown", unlockPhoneVideo, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) return;
        if (scrollVideo.readyState >= 2) revealScrollVideo();
        else scrollVideo.load();
      });
    }
  }

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
    if (!reduceMotion && scrollVideo && videoStage && scrollVideo.readyState >= 1 && Number.isFinite(scrollVideo.duration)) {
      const bounds = videoStage.getBoundingClientRect();
      const viewportAnchor = window.innerHeight * 0.9;
      const travel = viewportAnchor + bounds.height;
      const rawProgress = Math.min(Math.max((viewportAnchor - bounds.top) / travel, 0), 1);
      targetVideoTime = rawProgress * Math.max(scrollVideo.duration - videoFrameDuration, 0);
      queueVideoFrame();
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
