import { rmdir as _rmdir } from '../disk.js';

export function rmdir(args) {
  if (!args)
    return "arg required";
  const path = args[0];
  if (_rmdir(path) === -1) {
    return "Failed to remove dir";
  }
  return "";
}


