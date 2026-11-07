// Sidebar shortcuts are independent of command editing and the slash shortcut.
(() => {
  "use strict";
  let initialized = false;

  function anotherEditor(node) {
    if (node?.tagName === "INPUT" && node.id === "command-input") return false;
    for (let element = node; element; element = element.parentElement) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable) return true;
      const editable = element.getAttribute?.("contenteditable")?.toLowerCase();
      const roles = (element.getAttribute?.("role") || "").toLowerCase().split(/\s+/);
      if (["", "true", "plaintext-only"].includes(editable) || roles.includes("textbox")) return true;
    }
    return false;
  }

  function init({ toggleLeft, toggleRight } = {}) {
    if (initialized) return;
    initialized = true;
    let altGraphDown = false;
    // Firefox may report AltGraph modifier state for ordinary Ctrl+Alt. Track
    // the actual AltGraph key value; a physical right Alt can still be normal Alt.
    document.addEventListener("keyup", event => {
      if (event.code === "AltRight" || event.key === "AltGraph") altGraphDown = false;
    }, true);
    window.addEventListener("blur", () => { altGraphDown = false; });
    document.addEventListener("keydown", event => {
      if (event.key === "AltGraph") { altGraphDown = true; return; }
      if (event.defaultPrevented || !event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey ||
          event.repeat || event.isComposing || event.keyCode === 229 || altGraphDown) return;

      let key;
      if (event.code === "KeyA") key = "a";
      else if (event.code === "KeyB") key = "b";
      else if (!event.code || event.code === "Unidentified") key = event.key?.toLowerCase();
      if (key !== "a" && key !== "b") return;

      const origin = event.composedPath?.()[0] || event.target || document.activeElement;
      if (anotherEditor(origin) || anotherEditor(document.activeElement)) return;
      const toggle = key === "a" ? toggleLeft : toggleRight;
      if (typeof toggle === "function" && toggle() === true) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  window.LIZPINK_SIDEBAR_SHORTCUTS = Object.freeze({ init });
})();
