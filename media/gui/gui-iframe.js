"use strict";
(() => {
  // src/webview/gui/gui-iframe.ts
  var IframeContent = new class {
    // Selection
    lastHoverWidget = null;
    selectedWidget = null;
    // Dropping
    mouseMode = "none" /* None */;
    dragLast = Date.now();
    mouseMoveDebouncer = null;
    // Internal drop
    internalDropStartX = 0;
    internalDropStartY = 0;
    internalDropWidgetId = null;
    internalDropIndicator = null;
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
          if (position && position.type === "widget" && (position.mouse === "top" || position.mouse === "bottom")) {
            parent.postMessage({
              type: "onDidDropWidget",
              widgetType: wtype,
              positionWidget: parseInt(position.widget.dataset.widgetId),
              position: position.mouse === "top" ? "before" : "after"
            });
          } else if (position && position.type === "placeholder") {
            parent.postMessage({
              type: "onDidDropWidget",
              widgetType: wtype,
              positionContainer: parseInt(position.widget.dataset.widgetId),
              positionIndex: position.widgetContainerIndex
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
        document.body.classList.add("dragging");
        document.body.insertAdjacentHTML("beforeend", `<div id="drop"></div>`);
        if (this.mouseMode === "int" /* InternalDrag */) {
          this.internalDropIndicator = document.createElement("div");
          this.internalDropIndicator.id = "drag-indicator";
          document.body.appendChild(this.internalDropIndicator);
        }
      } else {
        document.body.classList.remove("dragging");
        document.getElementById("drop")?.remove();
        if (this.internalDropIndicator) {
          this.internalDropIndicator.remove();
          this.internalDropIndicator = null;
        }
      }
    }
    isPositionInRect(x, y, rect) {
      return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height;
    }
    /**
     * x/y are from clientX/Y (relative to viewport)
     */
    getWidgetFromPosition(x, y) {
      const topElement = document.elementFromPoint(x, y);
      if (topElement === null) {
        return null;
      }
      const w = topElement.closest("[data-widget-id]");
      if (w === null) {
        return null;
      }
      const container = topElement.closest(".pgm-emptycontainer");
      if (container) {
        return {
          type: "placeholder",
          widget: w,
          widgetZone: container.getBoundingClientRect(),
          widgetContainerIndex: parseInt(container.dataset.index),
          mouse: null
        };
      }
      const wRect = w.getBoundingClientRect();
      const zonesHeight = wRect.height * 0.5;
      const top = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY, wRect.width, zonesHeight);
      const bottom = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY + wRect.height - zonesHeight, wRect.width, zonesHeight);
      const isOnTop = this.isPositionInRect(x + window.scrollX, y + window.scrollY, top);
      const isOnBottom = this.isPositionInRect(x + window.scrollX, y + window.scrollY, bottom);
      return {
        type: "widget",
        widget: w,
        widgetTopZone: top,
        widgetBottomZone: bottom,
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
      if (position === null || position.type !== "widget") {
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
      const position = this.getWidgetFromPosition(ev.clientX, ev.clientY);
      if (position === null) {
        return;
      }
      if (this.mouseMode !== "none" /* None */) {
        const drop = document.getElementById("drop");
        if (position.type === "widget" && position.mouse === "top" && position.widgetTopZone) {
          drop.style.display = "block";
          drop.style.top = `${position.widgetTopZone.y}px`;
          drop.style.left = `${position.widgetTopZone.x}px`;
          drop.style.width = `${position.widgetTopZone.width}px`;
          drop.style.height = `${position.widgetTopZone.height}px`;
        } else if (position.type === "widget" && position.mouse === "bottom" && position.widgetBottomZone) {
          drop.style.display = "block";
          drop.style.top = `${position.widgetBottomZone.y}px`;
          drop.style.left = `${position.widgetBottomZone.x}px`;
          drop.style.width = `${position.widgetBottomZone.width}px`;
          drop.style.height = `${position.widgetBottomZone.height}px`;
        } else if (position.type === "placeholder" && position.widgetZone) {
          drop.style.display = "block";
          drop.style.top = `${position.widgetZone.y}px`;
          drop.style.left = `${position.widgetZone.x}px`;
          drop.style.width = `${position.widgetZone.width}px`;
          drop.style.height = `${position.widgetZone.height}px`;
        } else {
          drop.style.display = "none";
        }
        if (this.internalDropIndicator) {
          this.internalDropIndicator.style.left = `${ev.clientX}px`;
          this.internalDropIndicator.style.top = `${ev.clientY}px`;
        }
      } else if (this.mouseMode === "none" /* None */ && this.internalDropWidgetId !== null) {
        const dx = ev.clientX - this.internalDropStartX;
        const dy = ev.clientY - this.internalDropStartY;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          this.setMouseMode("int" /* InternalDrag */);
        }
      }
      if (position.widget !== this.lastHoverWidget) {
        this.lastHoverWidget = position.widget;
        document.body.querySelectorAll("[data-widget-id]").forEach((w) => w.classList.remove("gui-widget-hover"));
        if (position.widget) {
          position.widget.classList.add("gui-widget-hover");
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
        if (position && position.type === "widget" && (position.mouse === "top" || position.mouse === "bottom")) {
          parent.postMessage({
            type: "onDidDropWidget",
            widgetId: parseInt(this.internalDropWidgetId),
            positionWidget: parseInt(position.widget.dataset.widgetId),
            position: position.mouse === "top" ? "before" : "after"
          });
        } else if (position && position.type === "placeholder") {
          parent.postMessage({
            type: "onDidDropWidget",
            widgetId: parseInt(this.internalDropWidgetId),
            positionContainer: parseInt(position.widget.dataset.widgetId),
            positionIndex: position.widgetContainerIndex
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
