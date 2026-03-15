import { read_dir } from "../disk.js";

export function ls(args) {
  const path = args.length > 0 ? args[0] : ".";
  const files = read_dir(path);
  if (files === -1) {
    return "error";
  }
  let s = "";
  for (const f of files) {
    if (!f.name)
      continue
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


