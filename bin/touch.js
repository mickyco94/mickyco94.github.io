import { string_to_ascii } from "../ascii.js";
import { append, create } from "../disk.js";

export function touch(args) {
  const path = args[0];
  const content = args[1];
  const fd = create(path, content.length);
  if (fd === -1) {
    return -1;
  }
  const buffer = string_to_ascii(content);
  append(fd, buffer);
}


