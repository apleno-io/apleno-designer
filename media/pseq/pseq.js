class SequenceEditor extends EventTarget {
	constructor() {
		super();
    this.parent = document.getElementById("pseq-editor");
    this.canvas = document.getElementById("pseq-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('resize', this.resize.bind(this));


    this.cameraZoom = 5;
    this.cameraZoomFactor = 1;
    this.cameraX = 0;
    this.cameraY = 0;

    this.mouseState = 'idle'; // down, moveCamera
    this.resize();
  }

  setState(state){

  }

  resize(){
    this.canvas.width = this.parent.clientWidth;
    this.canvas.height = this.parent.clientHeight;
    this.draw();
  }

  worldToScreen(x, y){
    return {
      x: x*this.cameraZoomFactor + (this.cameraX + this.canvas.width * 0.5),
      y: y*this.cameraZoomFactor + (this.cameraY + this.canvas.height * 0.5)
    };
  }

  screenToWorld(x, y){
    return {
      x: (x - (this.cameraX + this.canvas.width * 0.5)) / this.cameraZoomFactor,
      y: (y - (this.cameraY + this.canvas.height * 0.5)) / this.cameraZoomFactor,
    };
  }

  snapWorldCoordinate(x, y){
    return {
      x: Math.round(x / 50) * 50,
      y: Math.round(y / 50) * 50
    };
  }

  draw(){
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Debug
    const topLeft = this.screenToWorld(0, 0);
    document.getElementById('debug-1').innerText = `Top left (world): ${Math.round(topLeft.x)}, ${Math.round(topLeft.y)}`;
    const center = this.screenToWorld(this.canvas.width * 0.5, this.canvas.height * 0.5);
    document.getElementById('debug-2').innerText = `Center (world): ${Math.round(center.x)}, ${Math.round(center.y)}`;
    document.getElementById('debug-3').innerText = `Zoom (zoomfactor): ${this.cameraZoom} ${Math.round(this.cameraZoomFactor*10)/10}`;

    // Draw grid depending on zoom and camera position
    /*const gridSpace = 50 * zoomFactor;
    const verticalGrids = Math.ceil(this.canvas.width / gridSpace);
    const horizontalGrids = Math.ceil(this.canvas.height / gridSpace);
    this.ctx.strokeStyle = '#999';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 0; i < verticalGrids; i++) {
      this.ctx.moveTo(i * gridSpace + this.cameraX, 0 + this.cameraY);
      this.ctx.lineTo(i * gridSpace + this.cameraX, this.canvas.height + this.cameraY);
    }
    for (let i = 0; i < horizontalGrids; i++) {
      this.ctx.moveTo(0 + this.cameraX, i * gridSpace + this.cameraY);
      this.ctx.lineTo(this.canvas.width + this.cameraX, i * gridSpace + this.cameraY);
    }
    this.ctx.stroke();*/

    // Draw major grid
    /*const bigGridSpace = 250 * zoomFactor;
    const bigVerticalGrids = Math.ceil(this.canvas.width / bigGridSpace);
    const bigHorizontalGrids = Math.ceil(this.canvas.height / bigGridSpace);
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    for (let i = 0; i < bigVerticalGrids; i++) {
      this.ctx.moveTo(i * bigGridSpace + this.cameraX, 0 + this.cameraY);
      this.ctx.lineTo(i * bigGridSpace + this.cameraX, this.canvas.height + this.cameraY);
    }
    for (let i = 0; i < bigHorizontalGrids; i++) {
      this.ctx.moveTo(0 + this.cameraX, i * bigGridSpace + this.cameraY);
      this.ctx.lineTo(this.canvas.width + this.cameraX, i * bigGridSpace + this.cameraY);
    }
    this.ctx.stroke();*/
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    const bigGridSpace = 50 * (this.cameraZoom / 5);
    const bigVerticalGrids = Math.ceil(this.canvas.width / bigGridSpace);
    const bigHorizontalGrids = Math.ceil(this.canvas.height / bigGridSpace);
    const coordWorld = this.screenToWorld(0, 0);
    console.log('bigVerticalGrids ' + bigVerticalGrids);
    for (let i = 0; i < bigVerticalGrids; i++) {
      const snaped = this.snapWorldCoordinate(coordWorld.x + (i * bigGridSpace), 0);
      const coordScreen = this.worldToScreen(snaped.x, 0);
      this.ctx.moveTo(coordScreen.x, 0);
      this.ctx.lineTo(coordScreen.x, this.canvas.height);
    }
    for (let i = 0; i < bigHorizontalGrids; i++) {
      const snaped = this.snapWorldCoordinate(0, coordWorld.y + (i * bigGridSpace));
      const coordScreen = this.worldToScreen(0, snaped.y);
      this.ctx.moveTo(0, coordScreen.y);
      this.ctx.lineTo(this.canvas.width, coordScreen.y);
    }

    this.ctx.stroke();

    // Draw blocks
    const X = 0;
    const Y = 0;
    const WIDTH = 200;
    const HEIGHT = 50;
    this.ctx.fillStyle = "rgb(0 200 200)";
    const coord = this.worldToScreen(X - Math.round(WIDTH*this.cameraZoomFactor * 0.5), Y - Math.round(HEIGHT*this.cameraZoomFactor * 0.5));
    this.ctx.fillRect(
      coord.x,
      coord.y,
      //(coord.x - Math.round(WIDTH * 0.5))*this.cameraZoomFactor + (this.cameraX + this.canvas.width * 0.5),
      //(coord.y - Math.round(HEIGHT * 0.5))*this.cameraZoomFactor + (this.cameraY + this.canvas.height * 0.5),
      //coord.x*this.cameraZoomFactor + (this.cameraX + this.canvas.width * 0.5),
      //coord.y*this.cameraZoomFactor + (this.cameraY + this.canvas.height * 0.5),
      WIDTH*this.cameraZoomFactor,
      HEIGHT*this.cameraZoomFactor
    );

    /*this.ctx.fillStyle = "rgb(200 0 200)";
    this.ctx.fillRect(
      (400 - Math.round(WIDTH * 0.5))*zoomFactor + (this.cameraX + this.canvas.width * 0.5),
      (100 - Math.round(HEIGHT * 0.5))*zoomFactor + (this.cameraY + this.canvas.height * 0.5),
      WIDTH*zoomFactor,
      HEIGHT*zoomFactor
    );

    // Draw
    this.ctx.fillStyle = "rgb(200 0 0)";
    this.ctx.fillRect(this.canvas.width-100, this.canvas.height-100, 100, 100);

    this.ctx.fillStyle = "rgb(0 0 200 / 50%)";
    this.ctx.fillRect(0, 0, 100, 100);*/
  }

  onMouseWheel(e){
    this.cameraZoom = Math.round(this.cameraZoom + (e.deltaY * -0.01));
    this.cameraZoom = Math.max(1, this.cameraZoom);
    this.cameraZoom = Math.min(10, this.cameraZoom);
    console.log('ZOOM:' + this.cameraZoom);
    this.cameraZoomFactor = this.cameraZoom / 5;
    this.draw();
  }

  onMouseDown(e){
    this.mouseState = 'down';
  }

  onMouseMove(e){
    if(this.mouseState === 'down'){
      this.mouseState = 'moveCamera';
    }
    if(this.mouseState === 'moveCamera'){
      this.cameraX += e.movementX;
      this.cameraY += e.movementY;
      this.draw();
    }
  }

  onMouseUp(e){
    if(this.mouseState === 'down' || this.mouseState === 'moveCamera'){
      this.mouseState = 'idle';
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