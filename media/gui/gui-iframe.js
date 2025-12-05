"use strict";
(() => {
  // src/webview/gui/gui-iframe.ts
  var IframeContent = new class {
    // Selection
    lastHoverWidget = null;
    selectedWidget = null;
    // Dropping
    mouseMode = "none" /* None */;
    dropTop = null;
    dropBottom = null;
    dragLast = Date.now();
    // Internal drop
    internalDropStartX = 0;
    internalDropStartY = 0;
    internalDropWidgetId = null;
    // Debug
    debug = false;
    inject() {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.addEventListener("mousedown", this.onMouseDown.bind(this));
        document.body.addEventListener("mousemove", this.onMouseMove.bind(this));
        document.body.addEventListener("mouseup", this.onMouseUp.bind(this));
        document.body.addEventListener("click", this.onMouseClick.bind(this));
        document.body.addEventListener("dragover", (e) => {
          e.preventDefault();
          this.dragLast = Date.now();
          if (this.mouseMode === "none" /* None */) {
            this.setMouseMode("ext" /* ExternalDrag */);
          }
          this.onMouseMove(e);
        }, { capture: true });
        document.body.addEventListener("drop", (e) => {
          e.preventDefault();
          const wtype = `${e.dataTransfer?.getData("text/plain")}`;
          const position = this.getWidgetFromPosition(e.clientX, e.clientY);
          this.setMouseMode("none" /* None */);
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
          if (this.mouseMode === "ext" /* ExternalDrag */ && Date.now() - this.dragLast > 200) {
            this.setMouseMode("none" /* None */);
          }
        }, 50);
      });
    }
    setMouseMode(mouseMode) {
      if (this.mouseMode === mouseMode) {
        return;
      }
      this.mouseMode = mouseMode;
      if (this.mouseMode !== "none" /* None */) {
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
    /**
     * User pressed mouse: start _possible_ internal drag
     */
    onMouseDown(ev) {
      if (this.mouseMode !== "none" /* None */) {
        return;
      }
      const position = this.getWidgetFromPosition(ev.clientX, ev.clientY);
      if (position === null) {
        return;
      }
      this.internalDropStartX = ev.clientX;
      this.internalDropStartY = ev.clientY;
      this.internalDropWidgetId = position.widget.dataset.widgetId;
    }
    /**
     * User moved the mouse:
     * - Hover widget below cursor
     * - DnD: Show drop indicators
     */
    onMouseMove(ev) {
      const topElement = document.elementFromPoint(ev.clientX, ev.clientY);
      if (topElement === null) {
        return;
      }
      const w = topElement.closest("[data-widget-id]");
      if (this.mouseMode !== "none" /* None */) {
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
        }
        const drop = document.getElementById("drop");
        if (this.dropTop && this.isPositionInRect(ev.pageX, ev.pageY, this.dropTop)) {
          drop.style.display = "block";
          drop.style.top = `${this.dropTop.y}px`;
          drop.style.left = `${this.dropTop.x}px`;
          drop.style.width = `${this.dropTop.width}px`;
          drop.style.height = `${this.dropTop.height}px`;
        } else if (this.dropBottom && this.isPositionInRect(ev.pageX, ev.pageY, this.dropBottom)) {
          drop.style.display = "block";
          drop.style.top = `${this.dropBottom.y}px`;
          drop.style.left = `${this.dropBottom.x}px`;
          drop.style.width = `${this.dropBottom.width}px`;
          drop.style.height = `${this.dropBottom.height}px`;
        } else {
          drop.style.display = "none";
        }
      } else if (this.mouseMode === "none" /* None */ && this.internalDropWidgetId !== null) {
        const dx = ev.clientX - this.internalDropStartX;
        const dy = ev.clientY - this.internalDropStartY;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          this.setMouseMode("int" /* InternalDrag */);
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
    /**
     * User releases mouse: validate internal DnD
     */
    onMouseUp(ev) {
      if (this.mouseMode === "int" /* InternalDrag */) {
        const position = this.getWidgetFromPosition(ev.clientX, ev.clientY);
        this.setMouseMode("none" /* None */);
        if (position && (position.mouse === "top" || position.mouse === "bottom")) {
          parent.postMessage({
            type: "onDidDropWidget",
            widgetId: this.internalDropWidgetId,
            positionWidget: position.widget.dataset.widgetId,
            position: position.mouse === "top" ? "before" : "after"
          });
        }
      }
      this.internalDropWidgetId = null;
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
