class SequenceEditor extends EventTarget {
  constructor() {
    super();
    // Data
    this.state = {
      steps: [
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
    this.parent = document.getElementById("pseq-editor");
    this.canvas = document.getElementById("pseq-canvas");
    this.ctx = this.canvas.getContext("2d");

    // Events
    document.getElementById('pseq-controls').addEventListener('click', this.onClickControls.bind(this));
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('resize', this.resize.bind(this));

    // Camera
    this.cameraZoom = 5;
    this.cameraZoomFactor = 1;
    this.cameraX = 0;
    this.cameraY = 0;

    // Various editor state
    this.mouseState = 'idle'; // down, moveCamera
    this.mouseStartX = 0;
    this.mouseStartY = 0;
    this.selectedStep = null;

    // Get colors
    this.colorGrid = window.getComputedStyle(document.body).getPropertyValue('--vscode-widget-border');
    this.colorSteps = {
      start: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-red'),
      script: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-green'),
      gui: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-blue'),
      condition: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-yellow'),
      sequence: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-orange'),
      end: window.getComputedStyle(document.body).getPropertyValue('--vscode-charts-red')
    };
    this.colorSelected = window.getComputedStyle(document.body).getPropertyValue('--vscode-foreground');

    // Draw
    this.resize();
  }

  setState(state) {

  }

  resize() {
    this.canvas.width = this.parent.clientWidth;
    this.canvas.height = this.parent.clientHeight;
    this.draw();
  }

  worldToScreen(x, y) {
    return {
      x: (x - (((-1 * (this.canvas.width * 0.5)) / this.cameraZoomFactor) + this.cameraX)) * this.cameraZoomFactor,
      y: (y - (((-1 * (this.canvas.height * 0.5)) / this.cameraZoomFactor) + this.cameraY)) * this.cameraZoomFactor
    };
  }

  screenToWorld(x, y) {
    return {
      x: (((-1 * (this.canvas.width * 0.5)) / this.cameraZoomFactor) + this.cameraX) + (x / this.cameraZoomFactor),
      y: (((-1 * (this.canvas.height * 0.5)) / this.cameraZoomFactor) + this.cameraY) + (y / this.cameraZoomFactor)
    };
  }

  snapWorldCoordinate(x, y, snap = 50) {
    return {
      x: Math.round(x / snap) * snap,
      y: Math.round(y / snap) * snap
    };
  }

  setCameraZoom(zoom) {
    this.cameraZoom = Math.min(7, Math.max(3, Math.round(zoom)));
    this.cameraZoomFactor = Math.pow(2, this.cameraZoom - 5);
  }

  setCameraPosition(x, y) {
    this.cameraX = x;
    this.cameraY = y;
  }

  draw() {
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
  }

  drawGrid(color, width, spacing) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();

    const bigGridSpace = spacing * this.cameraZoomFactor;
    const bigVerticalGrids = Math.ceil(this.canvas.width / bigGridSpace);
    const bigHorizontalGrids = Math.ceil(this.canvas.height / bigGridSpace);
    const coordWorld = this.screenToWorld(0, 0);
    const coordSnaped = this.snapWorldCoordinate(coordWorld.x, coordWorld.y, 250);
    for (let i = 0; i < bigVerticalGrids; i++) {
      const x = this.worldToScreen(Math.round(coordSnaped.x + (i * spacing)), 0).x;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    for (let i = 0; i < bigHorizontalGrids; i++) {
      const y = this.worldToScreen(0, Math.round(coordSnaped.y + (i * spacing))).y;
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }

    this.ctx.stroke();
  }

  drawSteps(){
    this.state.steps.forEach(step => {
      this.drawStep(step);
    });
  }

  drawStep(step){
    const coordStart = this.worldToScreen(step.x - 100, step.y - 25);
    const coordEnd = this.worldToScreen(step.x + 100, step.y + 25);    
    this.ctx.fillStyle = this.colorSteps[step.type];
    this.ctx.fillRect(coordStart.x, coordStart.y, coordEnd.x - coordStart.x, coordEnd.y - coordStart.y);

    if(this.selectedStep === step.id){
      this.ctx.strokeStyle = this.colorSelected;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(coordStart.x, coordStart.y, coordEnd.x - coordStart.x, coordEnd.y - coordStart.y);
    }
  }

  /**
   * Detect what is at world coordinate x/y. Can return {anchor: id} or {step: id}
   */
  detectElementOnPosition(x, y){
    // 2: steps
    for(let i = 0; i < this.state.steps.length; ++i){
      const step = this.state.steps[i];
      if(x >= step.x - 100 && x <= step.x + 100 && y >= step.y - 25 && y <= step.y + 25){
        return {step: step.id};
      }
    }

    // 3: nothing
    return null;
  }

  /**
   * Return the distance in pixels from the initial memorized click.
   */
  distanceFromInitialClick(x, y){
    return Math.sqrt(Math.pow(this.mouseStartX-x, 2)+Math.pow(this.mouseStartY-y, 2));
  }

  onMouseWheel(e) {
    this.setCameraZoom(this.cameraZoom + (e.deltaY * -0.01));
    this.draw();
  }

  onMouseDown(e) {
    const worldClick = this.screenToWorld(e.offsetX, e.offsetY);
    const element = this.detectElementOnPosition(worldClick.x, worldClick.y);
    if(element !== null && 'step' in element){
      this.selectedStep = element.step;
      this.mouseState = 'step';
      this.mouseStartX = e.offsetX;
      this.mouseStartY = e.offsetY;
      this.draw();
    }
    else if(element === null){
      this.selectedStep = null;
      this.mouseState = 'moveCamera';
      this.draw();
    }
  }

  onMouseMove(e) {
    if (this.mouseState === 'step' && this.selectedStep !== null && this.distanceFromInitialClick(e.offsetX, e.offsetY) > 5) {
      this.mouseState = 'moveStep';
    }
    else if (this.mouseState === 'moveCamera') {
      this.cameraX -= (e.movementX / this.cameraZoomFactor);
      this.cameraY -= (e.movementY / this.cameraZoomFactor);
      this.draw();
    }
    else if (this.selectedStep !== null && this.mouseState === 'moveStep') {
      const step = this.state.steps.find(s => s.id === this.selectedStep);
      if(!step){
        return;
      }
      const newCoord = this.screenToWorld(e.offsetX, e.offsetY);
      step.x = newCoord.x;
      step.y = newCoord.y;
      this.draw();
    }
  }

  onMouseUp() {
    this.mouseState = 'idle';
  }

  onClickControls(e) {
    const button = e.target.closest('button[data-role]');
    if (!button) {
      return;
    }
    const role = button.getAttribute('data-role');
    if (role === 'center') {
      this.setCameraZoom(5);
      this.setCameraPosition(0, 0);
      this.draw();
    }
    else if (role === 'dd') {
      this.setCameraZoom(5);
      this.setCameraPosition(100, 100);
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