import { stat as diskstat } from '../disk.js'

export function stat(args) {
  if (!args)
    return "\n";
  const path = args[0];
  const fd = diskstat(path);
  if (fd === -1) {
    return "not found\n";
  }
  const { id, type, size, blocks, ctime, atime, mtime } = fd;
  const typeD = type === 1 ? "DIR" : "FILE";
  return `${id} ${typeD} ${size} ${blocks.filter(x => x !== 0).length} ${ctime} ${atime} ${mtime}\n`
}
