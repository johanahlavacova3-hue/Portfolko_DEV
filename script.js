// Kontrola podpory aspect-ratio + fallback
(function () {
  function supportsAspectRatio() {
    return CSS && CSS.supports && CSS.supports("aspect-ratio", "1 / 1");
  }

  if (!supportsAspectRatio()) {
    document.querySelectorAll(".media").forEach((el) => {
      const wrapper = document.createElement("div");
      wrapper.className = "media-fallback";
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.paddingTop = (720 / 1855) * 100 + "%";
      el.style.position = "absolute";
      el.style.top = 0;
      el.style.left = 0;
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.objectFit = "cover";
      el.parentNode.replaceChild(wrapper, el);
      wrapper.appendChild(el);
    });
  }

  // Nastaví šířku médií podle velikosti okna
  function resizeMedia() {
    const safeLeft = 20;
    const maxWidth = 1855;
    const winW = window.innerWidth;
    const newW = Math.min(maxWidth, winW - safeLeft * 2);
    document.querySelectorAll(".media").forEach((el) => {
      el.style.width = newW + "px";
    });
  }

  resizeMedia();
  window.addEventListener("resize", resizeMedia);
})();
