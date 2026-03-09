FG = "green";
BG = "gray";

const canvas = document.getElementById("game");
canvas.width = 400;
canvas.height = 400;
const ctx = canvas.getContext("2d");

function clear() {
  ctx.fillStyle = BG;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function point({ x, y }) {
  ctx.fillStyle = FG;
  const size = 5;
  ctx.fillRect((x - size / 2), (y - size / 2), size, size);
}

function line(a, b) {
  ctx.strokeStyle = FG;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}


function screen({ x, y }) {
  return {
    x: ((x + 1) / 2) * canvas.width,
    y: (1 - ((y + 1) / 2)) * canvas.height,
  }
}

function project({ x, y, z }) {
  return {
    x: x / z,
    y: y / z,
  }
}

function translate_z({ x, y, z }, dz) {
  return {
    x,
    y,
    z: z + dz,
  }
}

// x' = xcos(theta) - ysin(theta) 
// y' = xsin(theta) + ycos(theta)
function rotate_xz({ x, y, z }, angle) {
  const c_theta = Math.cos(angle);
  const s_theta = Math.sin(angle);
  return {
    x: x * c_theta - z * s_theta,
    y,
    z: x * s_theta + z * c_theta,
  }
}

function rotate_xy({ y, x, z }, angle) {
  const c_theta = Math.cos(angle);
  const s_theta = Math.sin(angle);
  return {
    x: x * c_theta - y * s_theta,
    y: x * s_theta + y * c_theta,
    z,
  }
}

const vs = [
  { x: 0.25, y: 0.25, z: 0.25 },
  { x: -0.25, y: 0.25, z: 0.25 },
  { x: -0.25, y: -0.25, z: 0.25 },
  { x: 0.25, y: -0.25, z: 0.25 },

  { x: 0.25, y: 0.25, z: -0.25 },
  { x: -0.25, y: 0.25, z: -0.25 },
  { x: -0.25, y: -0.25, z: -0.25 },
  { x: 0.25, y: -0.25, z: -0.25 },
]

const fs = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
]

const FPS = 60;
const dt = 1 / FPS;
let angle = 0;
let time = 0;

function frame() {
  clear();
  time += dt;
  angle = Math.PI * Math.sin(time);
  const transform = (p) => screen(project(translate_z(rotate_xz(p, angle), 1)));
  for (const f of fs) {
    for (let i = 0; i < f.length; i++) {
      const a = vs[f[i]];
      const b = vs[f[(i + 1) % f.length]];
      line(transform(a), transform(b));
    }
  }
  setTimeout(frame, 1000 / FPS);
}

setTimeout(frame, 1000 / FPS);


