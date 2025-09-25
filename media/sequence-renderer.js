"use strict";

// src/webview/pseq/sequence-renderer.ts
var SequenceEditor = class extends EventTarget {
  state;
  // Pointer
  parent;
  canvas;
  ctx;
  // Camera
  cameraZoom = 5;
  cameraZoomFactor = 1;
  cameraX = 0;
  cameraY = 0;
  // Various editor state
  mouseState = "idle";
  // down, moveCamera
  mouseStartX = 0;
  mouseStartY = 0;
  selectedStep = null;
  // Design
  colorGrid = window.getComputedStyle(document.body).getPropertyValue("--vscode-widget-border");
  colorSelected = window.getComputedStyle(document.body).getPropertyValue("--vscode-foreground");
  fontUI = window.getComputedStyle(document.body).getPropertyValue("--vscode-font-family");
  fontColor = window.getComputedStyle(document.body).getPropertyValue("--vscode-foreground");
  colorSteps;
  constructor() {
    super();
    this.state = {
      steps: [
        {
          id: "start",
          type: "start",
          x: -200,
          y: -200,
          customId: "",
          customName: "",
          parameters: {
            target: "test"
          }
        },
        {
          id: "test",
          type: "gui",
          x: 0,
          y: 0,
          customId: "superuid",
          customName: "My GUI",
          parameters: {
            file: "first.pgui",
            target: null
          }
        }
      ]
    };
    this.parent = document.getElementById("pseq-editor");
    this.canvas = document.getElementById("pseq-canvas");
    this.ctx = this.canvas.getContext("2d");
    document.getElementById("pseq-controls").addEventListener("click", this.onClickControls.bind(this));
    this.canvas.addEventListener("wheel", this.onMouseWheel.bind(this));
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.onMouseLeave.bind(this));
    window.addEventListener("resize", this.resize.bind(this));
    this.colorSteps = {
      start: window.getComputedStyle(document.body).getPropertyValue("--vscode-charts-red"),
      script: window.getComputedStyle(document.body).getPropertyValue("--vscode-charts-green"),
      gui: window.getComputedStyle(document.body).getPropertyValue("--vscode-charts-blue"),
      condition: window.getComputedStyle(document.body).getPropertyValue("--vscode-charts-yellow"),
      sequence: window.getComputedStyle(document.body).getPropertyValue("--vscode-charts-orange"),
      end: window.getComputedStyle(document.body).getPropertyValue("--vscode-charts-red")
    };
    this.resize();
  }
  setState(state) {
  }
  getState() {
  }
  /**
   * Redraw the canvas when view was resized.
   */
  resize() {
    this.canvas.width = this.parent.clientWidth;
    this.canvas.height = this.parent.clientHeight;
    this.draw();
  }
  /**
   * Transform x/y from world to screen position.
   */
  worldToScreen(point) {
    return {
      x: (point.x - (-1 * (this.canvas.width * 0.5) / this.cameraZoomFactor + this.cameraX)) * this.cameraZoomFactor,
      y: (point.y - (-1 * (this.canvas.height * 0.5) / this.cameraZoomFactor + this.cameraY)) * this.cameraZoomFactor
    };
  }
  /**
   * Transform x/y from screen to world position.
   */
  screenToWorld(point) {
    return {
      x: -1 * (this.canvas.width * 0.5) / this.cameraZoomFactor + this.cameraX + point.x / this.cameraZoomFactor,
      y: -1 * (this.canvas.height * 0.5) / this.cameraZoomFactor + this.cameraY + point.y / this.cameraZoomFactor
    };
  }
  /**
   * Snap a point into the grid.
   */
  snapWorldCoordinate(point, snap = 50) {
    return {
      x: Math.round(point.x / snap) * snap,
      y: Math.round(point.y / snap) * snap
    };
  }
  /**
   * Set the camera zoom.
   */
  setCameraZoom(zoom) {
    this.cameraZoom = Math.min(7, Math.max(3, Math.round(zoom)));
    this.cameraZoomFactor = Math.pow(2, this.cameraZoom - 5);
  }
  /**
   * Set the camera position
   */
  setCameraPosition(point) {
    this.cameraX = point.x;
    this.cameraY = point.y;
  }
  /**
   * Completly draw the sequence.
   */
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid(this.colorGrid, 1, 50);
    this.drawGrid(this.colorGrid, 3, 250);
    this.drawSteps();
    this.drawConnections();
  }
  /**
   * Draw the grid of the sequence
   */
  drawGrid(color, width, spacing) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    const bigGridSpace = spacing * this.cameraZoomFactor;
    const bigVerticalGrids = Math.ceil(this.canvas.width / bigGridSpace);
    const bigHorizontalGrids = Math.ceil(this.canvas.height / bigGridSpace);
    const coordWorld = this.screenToWorld({ x: 0, y: 0 });
    const coordSnaped = this.snapWorldCoordinate(coordWorld, 250);
    for (let i = 0; i < bigVerticalGrids; i++) {
      const x = this.worldToScreen({ x: Math.round(coordSnaped.x + i * spacing), y: 0 }).x;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    for (let i = 0; i < bigHorizontalGrids; i++) {
      const y = this.worldToScreen({ x: 0, y: Math.round(coordSnaped.y + i * spacing) }).y;
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }
    this.ctx.stroke();
  }
  /**
   * Draw steps.
   */
  drawSteps() {
    this.state.steps.forEach((step) => {
      this.drawStep(step);
    });
  }
  /**
   * Draw a single step.
   */
  drawStep(step) {
    const coordCenter = this.worldToScreen({ x: step.x, y: step.y });
    const coordStart = this.worldToScreen({ x: step.x - 100, y: step.y - 25 });
    const coordEnd = this.worldToScreen({ x: step.x + 100, y: step.y + 25 });
    this.ctx.fillStyle = this.colorSteps[step.type];
    this.ctx.fillRect(coordStart.x, coordStart.y, coordEnd.x - coordStart.x, coordEnd.y - coordStart.y);
    if (step.type === "start") {
      this.ctx.fillStyle = this.fontColor;
      this.ctx.font = `${20 * this.cameraZoomFactor}px ${this.fontUI}`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("Start", coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    } else if (step.type === "gui") {
      this.ctx.fillStyle = this.fontColor;
      this.ctx.font = `${20 * this.cameraZoomFactor}px ${this.fontUI}`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(step.customName, coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    }
    if (step.type === "start") {
      this.drawHandle({ x: coordCenter.x, y: coordEnd.y });
    } else if (step.type === "gui") {
      this.drawHandle({ x: coordCenter.x, y: coordStart.y });
      this.drawHandle({ x: coordCenter.x, y: coordEnd.y });
    }
    if (this.selectedStep === step.id) {
      this.ctx.strokeStyle = this.colorSelected;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(coordStart.x, coordStart.y, coordEnd.x - coordStart.x, coordEnd.y - coordStart.y);
    }
  }
  /**
   * Draw step handles for connections.
   */
  drawHandle(screenPoint) {
    this.ctx.fillStyle = this.fontColor;
    this.ctx.beginPath();
    this.ctx.arc(screenPoint.x, screenPoint.y, 20 * this.cameraZoomFactor, 0, 2 * Math.PI);
    this.ctx.fill();
  }
  /**
   * Draw connections between handles.
   */
  drawConnections() {
    this.state.steps.forEach((step) => {
      const target = step.parameters.target;
      if (typeof target !== "string") {
        return;
      }
      const targetStep = this.state.steps.find((s) => s.id === target);
      if (targetStep === void 0) {
        return;
      }
      this.drawConnection(this.getStepHandleScreenCoord(step, "target"), this.getStepHandleScreenCoord(targetStep, "start"));
    });
  }
  /**
   * Draw a single connection.
   */
  drawConnection(coordStartScreen, coordEndScreen) {
    this.ctx.strokeStyle = this.fontColor;
    this.ctx.beginPath();
    this.ctx.moveTo(coordStartScreen.x, coordStartScreen.y);
    const dx = coordEndScreen.x - coordStartScreen.x;
    const dy = coordEndScreen.y - coordStartScreen.y;
    let cx1, cy1, cx2, cy2;
    {
      const offset = dy / 2;
      cx1 = coordStartScreen.x;
      cy1 = coordStartScreen.y + offset;
      cx2 = coordEndScreen.x;
      cy2 = coordEndScreen.y - offset;
    }
    this.ctx.bezierCurveTo(
      cx1,
      cy1,
      cx2,
      cy2,
      coordEndScreen.x,
      coordEndScreen.y
    );
    this.ctx.stroke();
  }
  // utils
  getStepHandleScreenCoord(step, handle = "start") {
    const coordCenter = this.worldToScreen({ x: step.x, y: step.y });
    const coordStart = this.worldToScreen({ x: step.x - 100, y: step.y - 25 });
    const coordEnd = this.worldToScreen({ x: step.x + 100, y: step.y + 25 });
    if (handle === "start") {
      return { x: coordCenter.x, y: coordStart.y };
    } else if (handle === "target") {
      return { x: coordCenter.x, y: coordEnd.y };
    } else if (handle === "target2") {
      return { x: coordEnd.x, y: coordEnd.x };
    }
    return { x: 0, y: 0 };
  }
  /**
   * Detect what is at world coordinate x/y. Can return {anchor: id} or {step: id}
   */
  detectElementOnPosition(point) {
    for (let i = 0; i < this.state.steps.length; ++i) {
      const step = this.state.steps[i];
      if (point.x >= step.x - 100 && point.x <= step.x + 100 && point.y >= step.y - 25 && point.y <= step.y + 25) {
        return { step: step.id };
      }
    }
    return null;
  }
  /**
   * Return the distance in pixels from the initial memorized click.
   */
  distanceFromInitialClick(point) {
    return Math.sqrt(Math.pow(this.mouseStartX - point.x, 2) + Math.pow(this.mouseStartY - point.y, 2));
  }
  onMouseWheel(e) {
    this.setCameraZoom(this.cameraZoom + e.deltaY * -0.01);
    this.draw();
  }
  onMouseDown(e) {
    const worldClick = this.screenToWorld({ x: e.offsetX, y: e.offsetY });
    const element = this.detectElementOnPosition({ x: worldClick.x, y: worldClick.y });
    if (element !== null && "step" in element) {
      this.selectedStep = element.step;
      this.mouseState = "step";
      this.mouseStartX = e.offsetX;
      this.mouseStartY = e.offsetY;
      this.draw();
    } else if (element === null) {
      this.selectedStep = null;
      this.mouseState = "moveCamera";
      this.draw();
    }
  }
  onMouseMove(e) {
    if (this.mouseState === "step" && this.selectedStep !== null && this.distanceFromInitialClick({ x: e.offsetX, y: e.offsetY }) > 5) {
      this.mouseState = "moveStep";
    } else if (this.mouseState === "moveCamera") {
      this.cameraX -= e.movementX / this.cameraZoomFactor;
      this.cameraY -= e.movementY / this.cameraZoomFactor;
      this.draw();
    } else if (this.selectedStep !== null && this.mouseState === "moveStep") {
      const step = this.state.steps.find((s) => s.id === this.selectedStep);
      if (!step) {
        return;
      }
      const newCoord = this.screenToWorld({ x: e.offsetX, y: e.offsetY });
      step.x = newCoord.x;
      step.y = newCoord.y;
      this.draw();
    }
  }
  onMouseUp() {
    this.mouseState = "idle";
  }
  onMouseLeave() {
    this.mouseState = "idle";
  }
  onClickControls(e) {
    const button = e.target.closest("button[data-role]");
    if (!button) {
      return;
    }
    const role = button.getAttribute("data-role");
    if (role === "center") {
      this.setCameraZoom(5);
      this.setCameraPosition({ x: 0, y: 0 });
      this.draw();
    } else if (role === "dd") {
      this.setCameraZoom(5);
      this.setCameraPosition({ x: 100, y: 100 });
      this.draw();
    }
  }
};
(function() {
  const vscode = acquireVsCodeApi();
  const editor = new SequenceEditor();
  window.addEventListener("message", async (e) => {
    const { type, body, requestId } = e.data;
    if (type === "init") {
      editor.setState(body.untitled ? {} : body.value);
    } else if (type === "update") {
      if (body.edits.length > 0) {
        editor.setState(body.edits[body.edits.length - 1].state);
      }
      return;
    } else if (type === "getFileData") {
      vscode.postMessage({ type: "response", requestId, body: editor.getState() });
      return;
    }
  });
  vscode.postMessage({ type: "ready" });
})();
//# sourceMappingURL=sequence-renderer.js.map
