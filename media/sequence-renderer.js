"use strict";

// src/webview/pseq/sequence-renderer.ts
var Rectangle = class _Rectangle {
  static DEFAULT_WIDTH = 200;
  static DEFAULT_HEIGHT = 50;
  p1 = { x: 0, y: 0 };
  p2 = { x: 0, y: 0 };
  center;
  width;
  height;
  constructor(center, width = _Rectangle.DEFAULT_WIDTH, height = _Rectangle.DEFAULT_HEIGHT) {
    this.center = center;
    this.width = width;
    this.height = height;
    this.recalculate();
  }
  recalculate() {
    this.p1 = { x: this.center.x - this.width * 0.5, y: this.center.y - this.height * 0.5 };
    this.p2 = { x: this.center.x + this.width * 0.5, y: this.center.y + this.height * 0.5 };
  }
};
var CanvasStep = class _CanvasStep {
  static HANDLE_RADIUS = 10;
  id;
  rectangle;
  type;
  customId;
  customName;
  parameters;
  constructor(id, center, type, customId, customName, params) {
    this.id = id;
    this.rectangle = new Rectangle(center);
    this.type = type;
    this.customId = customId;
    this.customName = customName;
    this.parameters = params;
  }
  setPosition(point) {
    this.rectangle.center = point;
    this.rectangle.recalculate();
  }
  /**
   * Return world position of a step handle.
   */
  getHandlePosition(handle) {
    if (handle === "top") {
      return { x: this.rectangle.center.x, y: this.rectangle.p1.y };
    } else if (handle === "bottom") {
      return { x: this.rectangle.center.x, y: this.rectangle.p2.y };
    } else if (handle === "right") {
      return { x: this.rectangle.p2.x, y: this.rectangle.center.y };
    }
    return { x: 0, y: 0 };
  }
  getElementOnPoint(point) {
    if (this.type === "start") {
      if (_CanvasStep.isPointInCircle(point, this.getHandlePosition("bottom"), _CanvasStep.HANDLE_RADIUS)) {
        return "bottom";
      }
    } else if (["gui", "script", "sequence"].includes(this.type)) {
      if (_CanvasStep.isPointInCircle(point, this.getHandlePosition("top"), _CanvasStep.HANDLE_RADIUS)) {
        return "top";
      }
      if (_CanvasStep.isPointInCircle(point, this.getHandlePosition("bottom"), _CanvasStep.HANDLE_RADIUS)) {
        return "bottom";
      }
    } else if (this.type === "condition") {
      if (_CanvasStep.isPointInCircle(point, this.getHandlePosition("top"), _CanvasStep.HANDLE_RADIUS)) {
        return "top";
      }
      if (_CanvasStep.isPointInCircle(point, this.getHandlePosition("right"), _CanvasStep.HANDLE_RADIUS)) {
        return "bottom";
      }
      if (_CanvasStep.isPointInCircle(point, this.getHandlePosition("bottom"), _CanvasStep.HANDLE_RADIUS)) {
        return "bottom";
      }
    } else if (this.type === "end") {
      if (_CanvasStep.isPointInCircle(point, this.getHandlePosition("bottom"), _CanvasStep.HANDLE_RADIUS)) {
        return "bottom";
      }
    }
    if (point.x >= this.rectangle.p1.x && point.x <= this.rectangle.p2.x && point.y >= this.rectangle.p1.y && point.y <= this.rectangle.p2.y) {
      return "step";
    }
    return null;
  }
  static isPointInCircle(point, circleCenter, circleRadius) {
    const dx = point.x - circleCenter.x;
    const dy = point.y - circleCenter.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= circleRadius * circleRadius;
  }
};
var SequenceEditor = class extends EventTarget {
  // State
  steps = [];
  // DOM pointers
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
  mouseCurrentScreenPoint = null;
  selectedStep = null;
  selectedHandle = null;
  // Design
  colorGrid = window.getComputedStyle(document.body).getPropertyValue("--vscode-widget-border");
  colorSelected = window.getComputedStyle(document.body).getPropertyValue("--vscode-foreground");
  fontUI = window.getComputedStyle(document.body).getPropertyValue("--vscode-font-family");
  fontColor = window.getComputedStyle(document.body).getPropertyValue("--vscode-foreground");
  colorSteps;
  constructor() {
    super();
    this.setState({
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
    });
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
    this.canvas.addEventListener("drop", this.onDrop.bind(this));
    this.canvas.addEventListener("dragover", this.onDragOver.bind(this));
    this.colorSteps = {
      //start: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-red'),
      //script: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-green'),
      //gui: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-blue'),
      //condition: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-yellow'),
      //sequence: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-orange'),
      //end: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-red'),
      start: "#c0392b",
      script: "#2ea043",
      gui: "#2980b9",
      condition: "#f39c12",
      sequence: "#c0392b",
      end: "#c0392b"
    };
    this.resize();
  }
  setState(state) {
    this.steps = [];
    for (let i = 0; i < state.steps.length; ++i) {
      const step = state.steps[i];
      this.steps.push(new CanvasStep(step.id, { x: step.x, y: step.y }, step.type, step.customId, step.customName, step.parameters));
    }
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
    if (this.selectedHandle && this.mouseCurrentScreenPoint && this.mouseState === "handleMove") {
      this.drawConnection(this.worldToScreen(this.selectedHandle.step.getHandlePosition(this.selectedHandle.handle)), this.mouseCurrentScreenPoint);
    }
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
    this.steps.forEach((step) => {
      this.drawStep(step);
    });
  }
  /**
   * Draw a single step.
   */
  drawStep(step) {
    const coordCenter = this.worldToScreen(step.rectangle.center);
    const coordStart = this.worldToScreen(step.rectangle.p1);
    const coordEnd = this.worldToScreen(step.rectangle.p2);
    this.ctx.fillStyle = this.colorSteps[step.type];
    this.ctx.fillRect(coordStart.x, coordStart.y, coordEnd.x - coordStart.x, coordEnd.y - coordStart.y);
    this.ctx.fillStyle = this.fontColor;
    this.ctx.font = `${15 * this.cameraZoomFactor}px ${this.fontUI}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    if (step.type === "start") {
      this.ctx.fillText("Start", coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    } else if (step.type === "gui") {
      this.ctx.fillText(step.customName, coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    } else if (step.type === "script") {
      this.ctx.fillText(step.customName, coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    } else if (step.type === "condition") {
      this.ctx.fillText("Condition", coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    } else if (step.type === "sequence") {
      this.ctx.fillText(step.customName, coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    } else if (step.type === "end") {
      this.ctx.fillText("End", coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    }
    if (step.type === "start") {
      this.drawHandle(this.worldToScreen(step.getHandlePosition("bottom")));
    } else if (step.type === "gui") {
      this.drawHandle(this.worldToScreen(step.getHandlePosition("top")));
      this.drawHandle(this.worldToScreen(step.getHandlePosition("bottom")));
    } else if (step.type === "script") {
      this.drawHandle(this.worldToScreen(step.getHandlePosition("top")));
      this.drawHandle(this.worldToScreen(step.getHandlePosition("bottom")));
    } else if (step.type === "condition") {
      this.drawHandle(this.worldToScreen(step.getHandlePosition("top")));
      this.drawHandle(this.worldToScreen(step.getHandlePosition("bottom")));
      this.drawHandle(this.worldToScreen(step.getHandlePosition("right")));
    } else if (step.type === "sequence") {
      this.drawHandle(this.worldToScreen(step.getHandlePosition("top")));
      this.drawHandle(this.worldToScreen(step.getHandlePosition("bottom")));
    } else if (step.type === "end") {
      this.drawHandle(this.worldToScreen(step.getHandlePosition("top")));
    }
    if (this.selectedStep?.id === step.id) {
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
    this.ctx.arc(screenPoint.x, screenPoint.y, 10 * this.cameraZoomFactor, 0, 2 * Math.PI);
    this.ctx.fill();
  }
  /**
   * Draw connections between handles.
   */
  drawConnections() {
    this.steps.forEach((step) => {
      const target = step.parameters.target;
      const targetOnFalse = step.parameters.targetOnFalse;
      if (typeof target === "number") {
        const targetStep = this.steps.find((s) => s.id === target);
        if (targetStep) {
          this.drawConnection(this.worldToScreen(step.getHandlePosition("bottom")), this.worldToScreen(targetStep.getHandlePosition("top")));
        }
      }
      if (typeof targetOnFalse === "number") {
        const targetStep = this.steps.find((s) => s.id === targetOnFalse);
        if (targetStep) {
          this.drawConnection(this.worldToScreen(step.getHandlePosition("right")), this.worldToScreen(targetStep.getHandlePosition("top")));
        }
      }
    });
  }
  /**
   * Draw a single connection.
   */
  drawConnection(coordStartScreen, coordEndScreen, mode = "state") {
    this.ctx.strokeStyle = mode === "state" ? this.fontColor : "#1abc9c";
    this.ctx.lineWidth = 2;
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
  /**
   * Detect what is at world coordinate x/y. Can return {anchor: id} or {step: id}
   */
  detectElementOnPosition(point) {
    for (let i = 0; i < this.steps.length; ++i) {
      const step = this.steps[i];
      const r = this.steps[i].getElementOnPoint(point);
      if (r === "step") {
        return { type: "step", step, handle: null };
      } else if (r !== null) {
        return { type: "handle", step, handle: r };
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
    if (element !== null && element.type === "step") {
      this.selectedStep = element.step;
      this.mouseState = "stepClick";
      this.mouseStartX = e.offsetX;
      this.mouseStartY = e.offsetY;
      this.draw();
    } else if (element && element.type === "handle") {
      this.selectedHandle = element;
      this.mouseState = "handleClick";
      this.mouseStartX = e.offsetX;
      this.mouseStartY = e.offsetY;
    } else if (element === null) {
      this.selectedStep = null;
      this.mouseState = "cameraMove";
      this.draw();
    }
  }
  onMouseMove(e) {
    if (this.mouseState === "stepClick" && this.selectedStep !== null && this.distanceFromInitialClick({ x: e.offsetX, y: e.offsetY }) > 5) {
      this.mouseState = "stepMove";
    } else if (this.selectedStep !== null && this.mouseState === "stepMove") {
      const newCoord = this.screenToWorld({ x: e.offsetX, y: e.offsetY });
      this.selectedStep.setPosition(newCoord);
      this.draw();
    } else if (this.mouseState === "handleClick" && this.selectedHandle !== null && this.distanceFromInitialClick({ x: e.offsetX, y: e.offsetY }) > 5) {
      this.mouseState = "handleMove";
    } else if (this.selectedHandle !== null && this.mouseState === "handleMove") {
      this.mouseCurrentScreenPoint = { x: e.offsetX, y: e.offsetY };
      this.draw();
    } else if (this.mouseState === "cameraMove") {
      this.cameraX -= e.movementX / this.cameraZoomFactor;
      this.cameraY -= e.movementY / this.cameraZoomFactor;
      this.draw();
    }
  }
  onMouseUp(e) {
    if (this.selectedHandle !== null && this.mouseState === "handleMove") {
      const el = this.detectElementOnPosition(this.screenToWorld({ x: e.offsetX, y: e.offsetY }));
      if (el && el.type === "handle" && this.selectedHandle.step.id !== el.step.id) {
      } else {
      }
    }
    this.mouseState = "idle";
    this.draw();
  }
  onMouseLeave() {
    this.mouseState = "idle";
    this.draw();
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
  onDrop(ev) {
    if (ev.dataTransfer === null) {
      return;
    }
    const allDropVariations = JSON.stringify({
      "dataTransfer.types": Array.from(ev.dataTransfer.types),
      "dataTransfer.getData(text/uri-list)": ev.dataTransfer.getData("text/uri-list"),
      "dataTransfer.getData(text/plain)": ev.dataTransfer.getData("text/plain"),
      "dataTransfer.files.0.name": ev.dataTransfer.files.item(0)?.name
    }, null, 2);
    console.log(allDropVariations);
    ev.preventDefault();
  }
  onDragOver(ev) {
    console.log("File(s) over drop zone");
    ev.preventDefault();
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
