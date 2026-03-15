import { mkdir as _mkdir } from '../disk.js';

export function mkdir(args) {
  const path = args[0]
  _mkdir(path);
  return "";
}
