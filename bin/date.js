import { now } from "../disk.js";

function to_real_time(base) {
  return new Date((base + EPOCH) * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '');
}

export function date() {
  return to_real_time(now()) + "\n";
}
