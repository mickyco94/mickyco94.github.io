import { rm as _rm } from "../disk.js";

export function rm(args) {
  if (!args)
    return -1;
  const path = args[0];
  if (_rm(path) === -1) {
    return -1
  }
  return "";
}

