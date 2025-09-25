// emit
// - didSelectStep
// - wantMoveStep
// - didMoveStep
// - wantStartCreatingLink
// - didCreatLink
// - wantMoveLink
// - didMoveLink
// fc
// - setState
// - getState
// - setSelectedStep
// - setCameraZoom
// - setCameraPosition

type StepType = 'start' | 'gui';
type StepHandle = 'top' | 'right' | 'bottom';

interface Point {
  x: number;
  y: number;
}

/**
 * ```
 *  p1 --------------
 *  |               |
 *   ---------------p2
 * ```
 */
class Rectangle {
  private static DEFAULT_WIDTH: number = 200;
  private static DEFAULT_HEIGHT: number = 50;

  public p1: Point = { x: 0, y: 0 };
  public p2: Point = { x: 0, y: 0 };

  public center: Point;
  public width: number;
  public height: number;

  public constructor(center: Point, width: number = Rectangle.DEFAULT_WIDTH, height: number = Rectangle.DEFAULT_HEIGHT) {
    this.center = center;
    this.width = width;
    this.height = height;
    this.recalculate();
  }

  public recalculate() {
    this.p1 = { x: this.center.x - this.width * 0.5, y: this.center.y - this.height * 0.5 };
    this.p2 = { x: this.center.x + this.width * 0.5, y: this.center.y + this.height * 0.5 };
  }
}

class CanvasStep {
  private static HANDLE_RADIUS: number = 20;

  public id: string;
  public rectangle: Rectangle;
  public type: StepType;
  public name: string;

  public constructor(id: string, center: Point, type: StepType, name: string) {
    this.id = id;
    this.rectangle = new Rectangle(center);
    this.type = type;
    this.name = name;
  }

  public setPosition(point: Point): void {
    this.rectangle.center = point;
    this.rectangle.recalculate();
  }

  public getHandlePosition(handle: StepHandle): Point {
    if (handle === 'top') {
      return { x: this.rectangle.center.x, y: this.rectangle.p1.y };
    }
    else if (handle === 'bottom') {
      return { x: this.rectangle.center.x, y: this.rectangle.p2.y };
    }
    else if (handle === 'right') {
      return { x: this.rectangle.p2.x, y: this.rectangle.center.y };
    }
    return { x: 0, y: 0 };
  }

  public getElementOnPoint(point: Point): 'step' | StepHandle | null {
    // Handles (first because they are over the step)
    if (this.type === 'start') {
      if (CanvasStep.isPointInCircle(point, this.getHandlePosition('bottom'), CanvasStep.HANDLE_RADIUS)) {
        return 'bottom';
      }
    }
    else if (this.type === 'gui') {
      if (CanvasStep.isPointInCircle(point, this.getHandlePosition('top'), CanvasStep.HANDLE_RADIUS)) {
        return 'top';
      }
      if (CanvasStep.isPointInCircle(point, this.getHandlePosition('bottom'), CanvasStep.HANDLE_RADIUS)) {
        return 'bottom';
      }
    }

    // Step
    if (point.x >= this.rectangle.p1.x && point.x <= this.rectangle.p2.x && point.y >= this.rectangle.p1.y && point.y <= this.rectangle.p2.y) {
      return 'step';
    }

    // Nothing
    return null;
  }

  private static isPointInCircle(point: Point, circleCenter: Point, circleRadius: number): boolean {
    const dx = point.x - circleCenter.x;
    const dy = point.y - circleCenter.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= circleRadius * circleRadius;
  }
}

interface CanvasElement {
  step: CanvasStep;
  type: 'step' | 'handle';
  handle: StepHandle | null;
}

class SequenceEditor extends EventTarget {
  // State
  private steps: CanvasStep[] = [];

  // DOM pointers
  private parent: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Camera
  private cameraZoom: number = 5;
  private cameraZoomFactor: number = 1;
  private cameraX: number = 0;
  private cameraY: number = 0;

  // Various editor state
  private mouseState: 'idle' | 'down' | 'moveCamera' | 'step' | 'moveStep' = 'idle'; // down, moveCamera
  private mouseStartX: number = 0;
  private mouseStartY: number = 0;
  private selectedStep: CanvasStep | null = null;

  // Design
  private colorGrid = window.getComputedStyle(document.body).getPropertyValue('--vscode-widget-border');
  private colorSelected = window.getComputedStyle(document.body).getPropertyValue('--vscode-foreground');
  private fontUI = window.getComputedStyle(document.body).getPropertyValue('--vscode-font-family');
  private fontColor = window.getComputedStyle(document.body).getPropertyValue('--vscode-foreground');
  private colorSteps: any;

  public constructor() {
    super();
    // Data
    this.setState({
      steps: [
        {
          id: 'start',
          type: 'start',
          x: -200,
          y: -200,
          customId: '',
          customName: '',
          parameters: {
            target: 'test'
          }
        },
        {
          id: 'test',
          type: 'gui',
          x: 0,
          y: 0,
          customId: 'superuid',
          customName: 'My GUI',
          parameters: {
            file: 'first.pgui',
            target: null
          }
        }
      ]
    });

    // Pointers
    this.parent = document.getElementById("pseq-editor") as HTMLElement;
    this.canvas = document.getElementById("pseq-canvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    // Events
    (document.getElementById('pseq-controls') as HTMLElement).addEventListener('click', this.onClickControls.bind(this));
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    window.addEventListener('resize', this.resize.bind(this));

    // Get colors
    this.colorSteps = {
      start: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-red'),
      script: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-green'),
      gui: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-blue'),
      condition: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-yellow'),
      sequence: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-orange'),
      end: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-red')
    };

    // Draw
    this.resize();
  }

  public setState(state: any) {
    this.steps = [];
    for (let i: number = 0; i < state.steps.length; ++i) {
      const step: any = state.steps[i];
      this.steps.push(new CanvasStep(step.id, { x: step.x, y: step.y }, step.type, step.customName));
    }
  }

  public getState(): any {

  }

  /**
   * Redraw the canvas when view was resized.
   */
  private resize(): void {
    this.canvas.width = this.parent.clientWidth;
    this.canvas.height = this.parent.clientHeight;
    this.draw();
  }

  /**
   * Transform x/y from world to screen position.
   */
  private worldToScreen(point: Point): Point {
    return {
      x: (point.x - (((-1 * (this.canvas.width * 0.5)) / this.cameraZoomFactor) + this.cameraX)) * this.cameraZoomFactor,
      y: (point.y - (((-1 * (this.canvas.height * 0.5)) / this.cameraZoomFactor) + this.cameraY)) * this.cameraZoomFactor
    };
  }

  /**
   * Transform x/y from screen to world position.
   */
  private screenToWorld(point: Point): Point {
    return {
      x: (((-1 * (this.canvas.width * 0.5)) / this.cameraZoomFactor) + this.cameraX) + (point.x / this.cameraZoomFactor),
      y: (((-1 * (this.canvas.height * 0.5)) / this.cameraZoomFactor) + this.cameraY) + (point.y / this.cameraZoomFactor)
    };
  }

  /**
   * Snap a point into the grid.
   */
  private snapWorldCoordinate(point: Point, snap: number = 50): Point {
    return {
      x: Math.round(point.x / snap) * snap,
      y: Math.round(point.y / snap) * snap
    };
  }

  /**
   * Set the camera zoom.
   */
  public setCameraZoom(zoom: number): void {
    this.cameraZoom = Math.min(7, Math.max(3, Math.round(zoom)));
    this.cameraZoomFactor = Math.pow(2, this.cameraZoom - 5);
  }

  /**
   * Set the camera position
   */
  public setCameraPosition(point: Point): void {
    this.cameraX = point.x;
    this.cameraY = point.y;
  }

  /**
   * Completly draw the sequence.
   */
  private draw(): void {
    // Debug
    /*
    const center = this.screenToWorld(this.canvas.width * 0.5, this.canvas.height * 0.5);
    document.getElementById('debug-1').innerText = `Camera X/Y: ${Math.round(this.cameraX)}, ${Math.round(this.cameraY)}`;
    document.getElementById('debug-2').innerText = `Center (world): ${Math.round(center.x)}, ${Math.round(center.y)}`;
    document.getElementById('debug-3').innerText = `Zoom (zoomfactor): ${this.cameraZoom} ${Math.round(this.cameraZoomFactor * 10) / 10}`;
    const tl = this.screenToWorld(0, 0);
    document.getElementById('debug-4').innerText = `TOP L (world): ${Math.round(tl.x)}, ${Math.round(tl.y)}`;
    */

    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grids
    this.drawGrid(this.colorGrid, 1, 50);
    this.drawGrid(this.colorGrid, 3, 250);

    // Steps
    this.drawSteps();

    // Connections
    this.drawConnections();
  }

  /**
   * Draw the grid of the sequence
   */
  private drawGrid(color: string, width: number, spacing: number): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();

    const bigGridSpace = spacing * this.cameraZoomFactor;
    const bigVerticalGrids = Math.ceil(this.canvas.width / bigGridSpace);
    const bigHorizontalGrids = Math.ceil(this.canvas.height / bigGridSpace);
    const coordWorld = this.screenToWorld({ x: 0, y: 0 });
    const coordSnaped = this.snapWorldCoordinate(coordWorld, 250);
    for (let i = 0; i < bigVerticalGrids; i++) {
      const x = this.worldToScreen({ x: Math.round(coordSnaped.x + (i * spacing)), y: 0 }).x;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    for (let i = 0; i < bigHorizontalGrids; i++) {
      const y = this.worldToScreen({ x: 0, y: Math.round(coordSnaped.y + (i * spacing)) }).y;
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }

    this.ctx.stroke();
  }

  /**
   * Draw steps.
   */
  private drawSteps(): void {
    this.steps.forEach((step: CanvasStep) => {
      this.drawStep(step);
    });
  }

  /**
   * Draw a single step.
   */
  private drawStep(step: CanvasStep): void {
    const coordCenter = this.worldToScreen(step.rectangle.center);
    const coordStart = this.worldToScreen(step.rectangle.p1);
    const coordEnd = this.worldToScreen(step.rectangle.p2);
    this.ctx.fillStyle = this.colorSteps[step.type];
    this.ctx.fillRect(coordStart.x, coordStart.y, coordEnd.x - coordStart.x, coordEnd.y - coordStart.y);

    // Name
    if (step.type === 'start') {
      this.ctx.fillStyle = this.fontColor;
      this.ctx.font = `${20 * this.cameraZoomFactor}px ${this.fontUI}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('Start', coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    }
    else if (step.type === 'gui') {
      this.ctx.fillStyle = this.fontColor;
      this.ctx.font = `${20 * this.cameraZoomFactor}px ${this.fontUI}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(step.name, coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
    }

    // Points
    if (step.type === 'start') {
      this.drawHandle({ x: coordCenter.x, y: coordEnd.y });
    }
    else if (step.type === 'gui') {
      this.drawHandle({ x: coordCenter.x, y: coordStart.y });
      this.drawHandle({ x: coordCenter.x, y: coordEnd.y });
    }

    // Extra labels (false/true)

    if (this.selectedStep?.id === step.id) {
      this.ctx.strokeStyle = this.colorSelected;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(coordStart.x, coordStart.y, coordEnd.x - coordStart.x, coordEnd.y - coordStart.y);
    }
  }

  /**
   * Draw step handles for connections.
   */
  private drawHandle(screenPoint: Point): void {
    this.ctx.fillStyle = this.fontColor;
    this.ctx.beginPath();
    this.ctx.arc(screenPoint.x, screenPoint.y, 20 * this.cameraZoomFactor, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  /**
   * Draw connections between handles.
   */
  private drawConnections(): void {
    /*this.steps.forEach((step: CanvasStep) => {
      const target = step.parameters.target;
      if (typeof target !== 'string') {
        return;
      }
      const targetStep = this.state.steps.find((s: any) => s.id === target);
      if (targetStep === undefined) {
        return;
      }
      this.drawConnection(this.getStepHandleScreenCoord(step, 'target'), this.getStepHandleScreenCoord(targetStep, 'start'));
    });*/
  }

  /**
   * Draw a single connection.
   */
  private drawConnection(coordStartScreen: Point, coordEndScreen: Point): void {
    this.ctx.strokeStyle = this.fontColor;
    this.ctx.beginPath();
    this.ctx.moveTo(coordStartScreen.x, coordStartScreen.y);

    const dx = coordEndScreen.x - coordStartScreen.x;
    const dy = coordEndScreen.y - coordStartScreen.y;

    let cx1, cy1, cx2, cy2;
    /*if (Math.abs(dx) > Math.abs(dy)) {
      const offset = dx / 2;
      cx1 = coordStartScreen.x + offset;
      cy1 = coordStartScreen.y;
      cx2 = coordEndScreen.x - offset;
      cy2 = coordEndScreen.y;
    } else*/ {
      const offset = dy / 2;
      cx1 = coordStartScreen.x;
      cy1 = coordStartScreen.y + offset;
      cx2 = coordEndScreen.x;
      cy2 = coordEndScreen.y - offset;
    }

    this.ctx.bezierCurveTo(
      cx1, cy1, cx2, cy2,
      coordEndScreen.x, coordEndScreen.y);
    this.ctx.stroke();
  }

  // utils
  private getStepHandleScreenCoord(step: any, handle = 'start'): Point {
    const coordCenter = this.worldToScreen({ x: step.x, y: step.y });
    const coordStart = this.worldToScreen({ x: step.x - 100, y: step.y - 25 });
    const coordEnd = this.worldToScreen({ x: step.x + 100, y: step.y + 25 });
    if (handle === 'start') {
      return { x: coordCenter.x, y: coordStart.y };
    }
    else if (handle === 'target') {
      return { x: coordCenter.x, y: coordEnd.y };
    }
    else if (handle === 'target2') {
      return { x: coordEnd.x, y: coordEnd.x };
    }
    return { x: 0, y: 0 };
  }

  /**
   * Detect what is at world coordinate x/y. Can return {anchor: id} or {step: id}
   */
  private detectElementOnPosition(point: Point): CanvasElement | null {
    for (let i = 0; i < this.steps.length; ++i) {
      const step = this.steps[i];
      const r = this.steps[i].getElementOnPoint(point);
      if (r === 'step') {
        return { type: 'step', step, handle: null };
      }
      else if (r !== null) {
        return { type: 'handle', step, handle: r };
      }
    }
    return null;
  }

  /**
   * Return the distance in pixels from the initial memorized click.
   */
  private distanceFromInitialClick(point: Point): number {
    return Math.sqrt(Math.pow(this.mouseStartX - point.x, 2) + Math.pow(this.mouseStartY - point.y, 2));
  }

  private onMouseWheel(e: WheelEvent): void {
    this.setCameraZoom(this.cameraZoom + (e.deltaY * -0.01));
    this.draw();
  }

  private onMouseDown(e: MouseEvent): void {
    const worldClick = this.screenToWorld({ x: e.offsetX, y: e.offsetY });
    const element = this.detectElementOnPosition({ x: worldClick.x, y: worldClick.y });
    if (element !== null && element.type === 'step') {
      this.selectedStep = element.step;
      this.mouseState = 'step';
      this.mouseStartX = e.offsetX;
      this.mouseStartY = e.offsetY;
      this.draw();
    }
    else if (element === null) {
      this.selectedStep = null;
      this.mouseState = 'moveCamera';
      this.draw();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.mouseState === 'step' && this.selectedStep !== null && this.distanceFromInitialClick({ x: e.offsetX, y: e.offsetY }) > 5) {
      this.mouseState = 'moveStep';
    }
    else if (this.mouseState === 'moveCamera') {
      this.cameraX -= (e.movementX / this.cameraZoomFactor);
      this.cameraY -= (e.movementY / this.cameraZoomFactor);
      this.draw();
    }
    else if (this.selectedStep !== null && this.mouseState === 'moveStep') {
      const newCoord = this.screenToWorld({ x: e.offsetX, y: e.offsetY });
      this.selectedStep.setPosition(newCoord);
      this.draw();
    }
  }

  private onMouseUp(): void {
    this.mouseState = 'idle';
  }

  private onMouseLeave(): void {
    this.mouseState = 'idle';
  }

  private onClickControls(e: MouseEvent): void {
    const button = (e.target as HTMLElement).closest('button[data-role]');
    if (!button) {
      return;
    }
    const role = button.getAttribute('data-role');
    if (role === 'center') {
      this.setCameraZoom(5);
      this.setCameraPosition({ x: 0, y: 0 });
      this.draw();
    }
    else if (role === 'dd') {
      this.setCameraZoom(5);
      this.setCameraPosition({ x: 100, y: 100 });
      this.draw();
    }
  }
}

(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();
  const editor = new SequenceEditor();

  window.addEventListener('message', async e => {
    const { type, body, requestId } = e.data;
    if (type === 'init') {
      editor.setState(body.untitled ? {} : body.value);
    }
    else if (type === 'update') {
      if (body.edits.length > 0) {
        editor.setState(body.edits[body.edits.length - 1].state);
      }
      return;
    }
    else if (type === 'getFileData') {
      vscode.postMessage({ type: 'response', requestId, body: editor.getState() });
      return;
    }
  });

  vscode.postMessage({ type: 'ready' });
}());