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

interface Point {
  x: number;
  y: number;
}

class SequenceEditor extends EventTarget {
  private state: any;

  // Pointer
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
  private selectedStep: null = null;

  // Design
  private colorGrid = window.getComputedStyle(document.body).getPropertyValue('--vscode-widget-border');
  private colorSelected = window.getComputedStyle(document.body).getPropertyValue('--vscode-foreground');
  private fontUI = window.getComputedStyle(document.body).getPropertyValue('--vscode-font-family');
  private fontColor = window.getComputedStyle(document.body).getPropertyValue('--vscode-foreground');
  private colorSteps: any;

  public constructor() {
    super();
    // Data
    this.state = {
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
    };

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
    this.state.steps.forEach((step: any) => {
      this.drawStep(step);
    });
  }

  /**
   * Draw a single step.
   */
  private drawStep(step: any): void {
    const coordCenter = this.worldToScreen({ x: step.x, y: step.y });
    const coordStart = this.worldToScreen({ x: step.x - 100, y: step.y - 25 });
    const coordEnd = this.worldToScreen({ x: step.x + 100, y: step.y + 25 });
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
      this.ctx.fillText(step.customName, coordCenter.x, coordCenter.y, coordEnd.x - (coordStart.x + 20));
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

    if (this.selectedStep === step.id) {
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
    this.state.steps.forEach((step: any) => {
      const target = step.parameters.target;
      if (typeof target !== 'string') {
        return;
      }
      const targetStep = this.state.steps.find((s: any) => s.id === target);
      if (targetStep === undefined) {
        return;
      }
      this.drawConnection(this.getStepHandleScreenCoord(step, 'target'), this.getStepHandleScreenCoord(targetStep, 'start'));
    });
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
  private detectElementOnPosition(point: Point): any {
    // 2: steps
    for (let i = 0; i < this.state.steps.length; ++i) {
      const step = this.state.steps[i];
      if (point.x >= step.x - 100 && point.x <= step.x + 100 && point.y >= step.y - 25 && point.y <= step.y + 25) {
        return { step: step.id };
      }
    }

    // 3: nothing
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
    if (element !== null && 'step' in element) {
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
      const step = this.state.steps.find((s: any) => s.id === this.selectedStep);
      if (!step) {
        return;
      }
      const newCoord = this.screenToWorld({ x: e.offsetX, y: e.offsetY });
      step.x = newCoord.x;
      step.y = newCoord.y;
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