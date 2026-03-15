import { stat, read } from '../disk.js';

export function cat(args) {
  const path = args[0];
  const fd = stat(path);
  if (fd === -1) {
    console.error("couldn't find file", path);
    return "";
  }
  if (fd.type === 1) {
    return "";
  }
  const buffer = new Array(fd.size);
  read(fd, buffer, fd.size);
  return buffer.map(x => String.fromCharCode(x)).join("") + "\n";
}
