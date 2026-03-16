import { inode_count } from "./disk.js";

//const FG = "#7d4e57";
const FG = "#f1fa8c";
const BG = "#161616";

const canvas = document.getElementById("game");
canvas.width = 950;
canvas.height = 950;
const ctx = canvas.getContext("2d");

function clear() {
  ctx.fillStyle = BG;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function point({ x, y, color = FG, alpha = 0.3 }) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const size = 10;
  ctx.fillRect((x - size / 2), (y - size / 2), size, size);
  ctx.globalAlpha = 1;
}

function line(a, b, alpha = 1) {
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = FG;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
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

function translate({ x, y, z }, { dx = 0, dy = 0, dz = 0 }) {
  return {
    x: x + dx,
    y: y + dy,
    z: z + dz,
  }
}

function scale({ x, y, z }, factor) {
  return {
    x: x * factor, y: y * factor, z: z * factor,
  }
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

const COLORS = [
  "#F8F8F2",
  "#6272A4",
  "#8BE9FD",
  "#50FA7B",
  "#FFB86C",
  "#FF79C6",
  "#BD93F9",
  "#FF5555",
  "#F1FA8C"
]

function set_color(v, i) {
  if (i < inode_count()) {
    const color = COLORS.at(i % COLORS.length);
    const updated = {
      ...v,
      color: color,
      alpha: 1.0,
    }
    return updated;
  }
  return { ...v, color: "#6272A4" };
}

const vs = [
  { x: 1, y: 1, z: 1 },
  { x: -1, y: 1, z: 1 },
  { x: -1, y: -1, z: 1 },
  { x: 1, y: -1, z: 1 },

  { x: 1, y: 1, z: -1 },
  { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: -1 },
  { x: 1, y: -1, z: -1 },
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

const rand = () => Math.random() * 2 - 1;

const random_points = [...Array(256)].map(() => ({
  x: rand(),
  y: rand(),
  z: rand(),
}));

function draw_cube() {
  const speed = 0.5;
  time += dt;
  angle = (Math.PI / 2) * Math.cos(speed * time);

  const transform = (v, shift = 0) => {
    const rotated = rotate_xy(rotate_xz(v, Math.PI / 2 * speed * (time + shift)), angle);
    const scaled = scale(rotated, 0.3);
    const translated = translate(scaled, { dz: 1 });
    return screen(project(translated));
  }

  for (const f of fs) {
    for (let i = 0; i < f.length; i++) {
      const a = vs[f[i]];
      const b = vs[f[(i + 1) % f.length]];
      line(transform(a), transform(b));
      const amount = 5 * (1 + Math.sin(time)) / 2;
      for (let i = 0; i < amount; i++) {
        const shift = i / amount;
        line(transform(a, (1 - shift) / 2), transform(b, (1 - shift) / 2), 1 - shift);

      }
    }
  }

  const oscillateTowardsCenter = (v, time, f = 0.2) => ({
    x: v.x * (f + (1 - f) * (1 + Math.cos(time)) / 2),
    y: v.y * (f + (1 - f) * (1 + Math.cos(time + Math.PI / 6)) / 2),
    z: v.z * (f + (1 - f) * (1 + Math.cos(time + Math.PI / 3)) / 2)
  });

  random_points
    .map(v => oscillateTowardsCenter(v, time))
    .map(v => rotate_xz(v, Math.PI / 2 * speed * time))
    .map(v => rotate_xy(v, angle))
    .map(v => scale(v, 0.3))
    .map(v => translate(v, { dz: 1 }))
    .map(v => screen(project(v)))
    .map((v, i) => set_color(v, i))
    .map(v => point(v));
}


function frame() {
  clear();
  draw_cube();
  setTimeout(frame, 1000 / FPS);
}

export function init_render() {
  setTimeout(frame, 1000 / FPS);
}
