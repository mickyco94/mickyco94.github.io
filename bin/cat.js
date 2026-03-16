import { stat, read } from '../disk.js';
import { ENV } from '../env.js';

export function cat(args) {
  let res = "";
  for (const path of args) {
    let full_path = path.startsWith("/") ? path : ENV.get("PWD") + path;
    const fd = stat(full_path);
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
