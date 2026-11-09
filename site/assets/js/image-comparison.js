// Page-specific enhancement for the locally bundled img-comparison-slider.
(() => {
  "use strict";

  const sessions = new WeakMap();
  const selector = "[data-image-comparison]";

  function prepare(frame) {
    const existing = sessions.get(frame);
    if (existing) { existing.update(); return frame; }
    const slider = frame.querySelector("img-comparison-slider");
    const first = slider?.querySelector('img[slot="first"]');
    const second = slider?.querySelector('img[slot="second"]');
    if (!slider || !first || !second) return null;

    const figure = frame.closest("figure.sample-comparison");
    const expand = figure?.querySelector("[data-comparison-expand]");
    const labels = frame.querySelector(".comparison-labels");
    const status = document.createElement("p");
    status.className = "comparison-status";
    status.setAttribute("role", "status");
    status.setAttribute("data-comparison-status", "");
    // Cloned comparisons have their own lifecycle, including their status text.
    frame.querySelectorAll("[data-comparison-status], [data-comparison-originals]").forEach(node => node.remove());
    frame.append(status);
    frame.classList.remove("comparison-ready");
    frame.dataset.comparisonState = "loading";
    if (figure) figure.dataset.comparisonState = "loading";
    if (expand) expand.disabled = true;
    slider.hidden = false;
    slider.keyboard = "disabled";
    slider.setAttribute("role", "slider");
    slider.setAttribute("aria-orientation", "horizontal");
    slider.setAttribute("aria-valuemin", "0");
    slider.setAttribute("aria-valuemax", "100");
    slider.setAttribute("aria-busy", "true");
    slider.setAttribute("aria-disabled", "true");
    status.textContent = "正在加载对比图片…";

    function describePosition() {
      const position = Number(slider.value);
      const value = Math.round(Number.isFinite(position) ? Math.min(100, Math.max(0, position)) : 50);
      slider.setAttribute("aria-valuenow", String(value));
      slider.setAttribute("aria-valuetext", `左图显示 ${value}%，右图显示 ${100 - value}%`);
    }

    function update() {
      if (first.naturalWidth > 0 && first.naturalHeight > 0) {
        frame.style.setProperty("--comparison-ratio", String(first.naturalWidth / first.naturalHeight));
        if (figure) figure.style.setProperty("--asset-width", `${first.naturalWidth}px`);
      }
      const images = [first, second];
      const failed = images.findIndex(image => image.complete && image.naturalWidth === 0);
      if (failed !== -1) {
        const changed = frame.dataset.comparisonState !== "error";
        frame.dataset.comparisonState = "error";
        frame.classList.remove("comparison-ready");
        if (figure) figure.dataset.comparisonState = "error";
        if (expand) expand.disabled = true;
        slider.hidden = true;
        slider.keyboard = "disabled";
        slider.setAttribute("aria-busy", "false");
        slider.setAttribute("aria-disabled", "true");
        if (labels) labels.hidden = true;
        status.hidden = false;
        status.textContent = `${failed === 0 ? "第一" : "第二"}张图片暂时无法加载，请刷新页面重试。`;
        if (!frame.querySelector("[data-comparison-originals]")) {
          const links = document.createElement("div");
          links.className = "comparison-originals";
          links.setAttribute("data-comparison-originals", "");
          images.forEach((image, index) => {
            const link = document.createElement("a");
            link.href = image.currentSrc || image.src;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = `打开第${index === 0 ? "一" : "二"}张原图`;
            links.append(link);
          });
          frame.append(links);
        }
        if (changed) frame.dispatchEvent(new CustomEvent("comparisonerror", { bubbles: true }));
        return;
      }
      if (!images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)) return;
      const changed = frame.dataset.comparisonState !== "ready";
      frame.dataset.comparisonState = "ready";
      frame.classList.add("comparison-ready");
      if (figure) figure.dataset.comparisonState = "ready";
      if (expand) expand.disabled = false;
      slider.hidden = false;
      slider.keyboard = "enabled";
      slider.setAttribute("aria-busy", "false");
      slider.setAttribute("aria-disabled", "false");
      status.hidden = true;
      if (labels) labels.hidden = false;
      frame.querySelector("[data-comparison-originals]")?.remove();
      describePosition();
      if (changed) frame.dispatchEvent(new CustomEvent("comparisonready", {
        bubbles: true, detail: { width: first.naturalWidth, height: first.naturalHeight }
      }));
    }

    sessions.set(frame, { update });
    [first, second].forEach(image => {
      image.addEventListener("load", update);
      image.addEventListener("error", update);
    });
    slider.addEventListener("slide", describePosition);
    // A vertical page scroll may cancel the touch stream. Give the upstream
    // component its normal end signal so the next horizontal drag starts fresh.
    slider.addEventListener("touchcancel", () => slider.dispatchEvent(new Event("touchend")));
    // The component moves the divider; these keys should not also scroll the
    // article or reach the site's command-line keyboard shortcuts.
    slider.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (frame.dataset.comparisonState !== "ready") return;
      if (event.key === "Home" || event.key === "End") {
        slider.value = event.key === "Home" ? 0 : 100;
        describePosition();
      }
    });
    slider.addEventListener("keyup", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
    });
    describePosition();
    update();
    return frame;
  }

  function init(root = document) {
    if (!window.customElements?.get("img-comparison-slider")) return [];
    const frames = [...(root.querySelectorAll?.(selector) || [])];
    if (root.matches?.(selector)) frames.unshift(root);
    return frames.map(prepare).filter(Boolean);
  }

  window.LIZPINK_IMAGE_COMPARISON = Object.freeze({ init });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init(), { once: true });
  else init();
})();
