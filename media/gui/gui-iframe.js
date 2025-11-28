"use strict";
(() => {
  // src/webview/gui/gui-iframe.ts
  var IframeContent = new class {
    lastHoverWidget = null;
    selectedWidget = null;
    // Dropping
    isDropping = false;
    dropTop = null;
    dropBottom = null;
    // Debug
    debug = false;
    inject() {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.addEventListener("mousemove", this.onMouseMove.bind(this));
        document.body.addEventListener("click", this.onMouseClick.bind(this));
      });
      this.setDrop(true);
    }
    setDrop(isDropping) {
      this.isDropping = isDropping;
      if (this.isDropping) {
        document.body.insertAdjacentHTML("beforeend", `<div id="drop"></div>${this.debug ? '<div id="dropt"></div><div id="dropb"></div>' : ""}`);
      } else {
        document.getElementById("#drop")?.remove();
        document.getElementById("#dropt")?.remove();
        document.getElementById("#dropb")?.remove();
      }
    }
    isPositionInRect(x, y, rect) {
      return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height;
    }
    onMouseMove(ev) {
      const topElement = document.elementFromPoint(ev.clientX, ev.clientY);
      if (topElement === null) {
        return;
      }
      const w = topElement.closest("[data-widget-id]");
      if (this.isDropping) {
        if (w && w !== this.lastHoverWidget) {
          const wRect = w.getBoundingClientRect();
          const boxesHeight = wRect.height * 0.2 < 15 ? wRect.height * 0.5 : wRect.height * 0.2;
          this.dropTop = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY, wRect.width, boxesHeight);
          this.dropBottom = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY + wRect.height - boxesHeight, wRect.width, boxesHeight);
          if (this.debug) {
            const dropt = document.getElementById("dropt");
            const dropb = document.getElementById("dropb");
            dropt.style.top = `${this.dropTop.y}px`;
            dropt.style.left = `${this.dropTop.x}px`;
            dropt.style.width = `${this.dropTop.width}px`;
            dropt.style.height = `${this.dropTop.height}px`;
            dropb.style.top = `${this.dropBottom.y}px`;
            dropb.style.left = `${this.dropBottom.x}px`;
            dropb.style.width = `${this.dropBottom.width}px`;
            dropb.style.height = `${this.dropBottom.height}px`;
          }
        } else if (w === null) {
        }
        if (this.dropTop && this.isPositionInRect(ev.pageX, ev.pageY, this.dropTop)) {
          const drop = document.getElementById("drop");
          drop.style.display = "block";
          drop.style.top = `${this.dropTop.y}px`;
          drop.style.left = `${this.dropTop.x}px`;
          drop.style.width = `${this.dropTop.width}px`;
          drop.style.height = `${this.dropTop.height}px`;
        } else if (this.dropBottom && this.isPositionInRect(ev.pageX, ev.pageY, this.dropBottom)) {
          const drop = document.getElementById("drop");
          drop.style.display = "block";
          drop.style.top = `${this.dropBottom.y}px`;
          drop.style.left = `${this.dropBottom.x}px`;
          drop.style.width = `${this.dropBottom.width}px`;
          drop.style.height = `${this.dropBottom.height}px`;
        } else {
        }
      }
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
        parent.postMessage({ type: "onDidClickWidget", widgetId: this.selectedWidget !== null ? parseInt(`${this.selectedWidget.dataset.widgetId}`) : null });
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
