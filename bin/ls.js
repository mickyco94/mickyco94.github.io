import { read_dir } from "../disk.js";
import * as env from '../env.js';

export function ls(args) {
  const base = env.ENV.get("PWD") ?? "";
  let path = args.length > 0 ? args[0] : ".";
  if (!path.startsWith("/")) {
    path = base + "/" + path;
  }
  console.log(path);
  const files = read_dir(path);
  if (files === -1) {
    return "error\n";
  }
  let s = "";
  for (const f of files) {
    const { name, inode: { id, type, size, ctime } } = f;
    s += id.toString().padStart(2, 0) + " ";
    s += type === 1 ? "DIR  " : "FILE "
    s += (ctime) + " ";
    s += size.toString().padStart(2, 0) + " ";
    s += name
    s += '\n';
  }
  return s;
}


