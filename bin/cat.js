import { stat, read } from '../disk.js';

export function cat(args) {
  let res = "";
  for (const path of args) {
    const fd = stat(path);
    if (fd === -1) {
      res += `${path}: No such file or directory\n`;
      continue;
    }
    if (fd.type === 1) {
      res += `${path} is a directory\n`;
      continue;
    }
    const buffer = new Array(fd.size);
    read(fd, buffer, fd.size);
    res += buffer.map(x => String.fromCharCode(x)).join("") + "\n";
  }
  return res;
}
