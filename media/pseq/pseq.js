function draw() {
  // Pointers
  const parent = document.getElementById("pseq-editor");
  const canvas = document.getElementById("pseq-canvas");
  const ctx = canvas.getContext("2d");

  // Resize canvas to parent
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;

  // Draw
  ctx.fillStyle = "rgb(200 0 0)";
  ctx.fillRect(canvas.width-100, canvas.height-100, 100, 100);

  ctx.fillStyle = "rgb(0 0 200 / 50%)";
  ctx.fillRect(0, 0, 100, 100);
}

document.addEventListener('DOMContentLoaded', function() {
  window.addEventListener('resize', ()=>{
    draw();
  });
  draw();
});