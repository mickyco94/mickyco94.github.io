FG = "#7d4e57";
FG = "#b166cc";
BG = "#11151c";

const canvas = document.getElementById("game");
canvas.width = 950;
canvas.height = 950;
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

function translate_y({ x, y, z }, dy) {
  return {
    x, y: y + dy, z,
  }
}

function translate_x({ x, y, z }, dx) {
  return { x: x + dx, y, z };
}

function scale({ x, y, z }, factor) {
  return {
    x: x * factor, y: y * factor, z: z * factor,
  }
}

function scale_y({ x, y, z }, factor) {
  return { x, y: y * factor, z };
}

function scale_z({ x, y, z }, factor) {
  return { x, y, z: z * factor };
}

function scale_x({ x, y, z }, factor) {
  return { x: x * factor, y, z };
}


function rotate_xz({ x, y, z }, angle, origin = { x: 0, y: 0, z: 0 }) {
  const c_theta = Math.cos(angle);
  const s_theta = Math.sin(angle);
  const p = {
    x: (x - origin.x),
    z: (z - origin.z),
  }
  return {
    x: origin.x + (p.x * c_theta - p.z * s_theta),
    y,
    z: origin.z + (p.x * s_theta + p.z * c_theta),
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

function helix(time) {
  res = []
  const radius = (0.1 * Math.sin(time)) + 0.2;
  const pitch = .3;
  for (let t = -10; t <= 10; t += 0.2) {
    res.push({ x: radius * Math.cos(t), y: (pitch * t) / (2 * Math.PI), z: radius * Math.sin(t) })
    res.push({ x: -radius * Math.cos(t), y: (pitch * t) / (2 * Math.PI), z: -radius * Math.sin(t) })
  }
  return res;
}

const cube_vs = [
  { x: 1, y: 1, z: 1 },
  { x: -1, y: 1, z: 1 },
  { x: -1, y: -1, z: 1 },
  { x: 1, y: -1, z: 1 },

  { x: 1, y: 1, z: -1 },
  { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: -1 },
  { x: 1, y: -1, z: -1 },
]

const cube_fs = [
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

const rand = () => Math.random() * 2 - 1;

const random_points = [...Array(500)].map(() => ({
  x: rand(),
  y: rand(),
  z: rand(),
}));



function draw_cube() {
  const speed = 0.5;
  time += dt;
  angle = (Math.PI / 2) * Math.cos(speed * time);

  const transform = (v) => {
    const rotated = rotate_xy(rotate_xz(v, Math.PI / 2 * speed * time), angle);
    const scaled = scale(rotated, 0.3);
    const translated = translate_z(scaled, 1);
    return screen(project(translated));
  }
  for (const f of cube_fs) {
    for (let i = 0; i < f.length; i++) {
      const a = cube_vs[f[i]];
      const b = cube_vs[f[(i + 1) % f.length]];
      line(transform(a), transform(b));
    }
  }
  random_points.map(v => {
    const oscillateTowardsCenter = (v, time, f = 0.2) => ({
      x: v.x * (f + (1 - f) * (1 + Math.cos(time)) / 2),
      y: v.y * (f + (1 - f) * (1 + Math.cos(time + Math.PI / 6)) / 2),
      z: v.z * (f + (1 - f) * (1 + Math.cos(time + Math.PI / 3)) / 2)
    });
    const oscillate = oscillateTowardsCenter(v, time);
    const rotated = rotate_xy(rotate_xz(oscillate, Math.PI / 2 * speed * time), angle);
    const scaled = scale(rotated, 0.3);
    const translated = translate_z(scaled, 1);
    return point(screen(project(translated)));
  });
}

function frame() {
  clear();
  draw_cube();
  setTimeout(frame, 1000 / FPS);
}

setTimeout(frame, 1000 / FPS);


