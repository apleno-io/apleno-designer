"use strict";
(() => {
  // src/webview/gui/gui-iframe.ts
  var IframeContent = new class {
    // Selection
    lastHoverWidget = null;
    selectedWidget = null;
    // Dropping
    isDropping = false;
    dropTop = null;
    dropBottom = null;
    dragLast = Date.now();
    // Debug
    debug = false;
    inject() {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.addEventListener("mousemove", this.onMouseMove.bind(this));
        document.body.addEventListener("click", this.onMouseClick.bind(this));
        document.body.addEventListener("dragover", (e) => {
          e.preventDefault();
          this.dragLast = Date.now();
          if (this.isDropping === false) {
            this.setDrop(true);
          }
          this.onMouseMove(e);
        }, { capture: true });
        document.body.addEventListener("drop", (e) => {
          e.preventDefault();
          const wtype = `${e.dataTransfer?.getData("text/plain")}`;
          const position = this.getWidgetFromPosition(e.clientX, e.clientY);
          this.setDrop(false);
          if (position && (position.mouse === "top" || position.mouse === "bottom")) {
            parent.postMessage({
              type: "onDidDropWidget",
              widgetType: wtype,
              positionWidget: position.widget.dataset.widgetId,
              position: position.mouse === "top" ? "before" : "after"
            });
          }
        }, { capture: true });
        setInterval(() => {
          if (Date.now() - this.dragLast > 200) {
            this.setDrop(false);
          }
        }, 50);
      });
    }
    setDrop(isDropping) {
      if (this.isDropping === isDropping) {
        return;
      }
      this.isDropping = isDropping;
      if (this.isDropping) {
        document.body.insertAdjacentHTML("beforeend", `<div id="drop"></div>${this.debug ? '<div id="dropt"></div><div id="dropb"></div>' : ""}`);
      } else {
        document.getElementById("drop")?.remove();
        document.getElementById("dropt")?.remove();
        document.getElementById("dropb")?.remove();
      }
    }
    isPositionInRect(x, y, rect) {
      return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height;
    }
    getWidgetFromPosition(x, y) {
      const topElement = document.elementFromPoint(x, y);
      if (topElement === null) {
        return null;
      }
      const w = topElement.closest("[data-widget-id]");
      if (w === null) {
        return null;
      }
      const wRect = w.getBoundingClientRect();
      const zonesHeight = wRect.height * 0.2 < 15 ? wRect.height * 0.5 : wRect.height * 0.2;
      const top = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY, wRect.width, zonesHeight);
      const bottom = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY + wRect.height - zonesHeight, wRect.width, zonesHeight);
      const isOnTop = this.isPositionInRect(x, y, top);
      const isOnBottom = this.isPositionInRect(x, y, bottom);
      return {
        widget: w,
        topZone: top,
        bottomZone: bottom,
        mouse: isOnTop ? "top" : isOnBottom ? "bottom" : null
      };
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
