import { read_dir } from "../disk.js";
import { resolve_path } from "../utils.js";

export function ls(args) {
  let path = args.length > 0 ? args[0] : ".";
  const full_path = resolve_path(path);
  const files = read_dir(full_path);
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

