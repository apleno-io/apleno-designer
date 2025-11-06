"use strict";
(() => {
  // src/webview/gui/gui-iframe.ts
  var IframeContent = new class {
    lastHoverWidget = null;
    selectedWidget = null;
    inject() {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.addEventListener("mousemove", this.onMouseMove.bind(this));
        document.body.addEventListener("click", this.onMouseClick.bind(this));
      });
    }
    setUI(widgets) {
    }
    setWidget(widget) {
    }
    onMouseMove(ev) {
      const topElement = document.elementFromPoint(ev.clientX, ev.clientY);
      if (topElement === null) {
        return;
      }
      const w = topElement.closest("[data-widget-id]");
      if (w !== this.lastHoverWidget) {
        this.lastHoverWidget = w;
        document.body.querySelectorAll("[data-widget-id]").forEach((w2) => w2.classList.remove("gui-widget-hover"));
        if (w) {
          w.classList.add("gui-widget-hover");
        }
      }
    }
    onMouseClick(ev) {
      const topElement = document.elementFromPoint(ev.clientX, ev.clientY);
      if (topElement === null) {
        return;
      }
      const w = topElement.closest("[data-widget-id]");
      if (w !== this.selectedWidget) {
        this.selectedWidget = w;
        parent.postMessage({ type: "onDidClickWidet", widgetId: this.selectedWidget !== null ? parseInt(`${this.selectedWidget.dataset.widgetId}`) : null });
        document.body.querySelectorAll("[data-widget-id]").forEach((w2) => w2.classList.remove("gui-widget-selected"));
        if (w) {
          w.classList.add("gui-widget-selected");
        }
      }
    }
  }();
  (() => {
    IframeContent.inject();
  })();
})();
//# sourceMappingURL=gui-iframe.js.map
