import { open, read_dir, read, create, write, dump_inodes } from './disk.js';
import { string_to_ascii } from './ascii.js'
const WELCOME = `Welcome to my stupid website`;

const term = document.getElementById("terminal");
term.value = WELCOME + "\n" + ">>> ";
term.selectionStart = term.selectionEnd = term.value.length;
term.focus();
term.addEventListener("blur", () => term.focus());

// Higher-level principles
// calls to functions are actually executions
// of $PATH/bin. Can I implement actual functions in my file system?
// I have no OS and therefore no runtime.
// The principle of pipes, stdin, stdout, stderr 
// I should adhere to even if I don't have an interpreter of some kind.
// $PROMPT
// env vars?

function input() {
  return term.value.split("\n")?.at(-1)?.replace(">>> ", "");
}

term.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const cmd = input();
    term.value += "\n";
    command(cmd);
    term.value += ">>> ";
  }
});

function ls() {
  const files = read_dir();
  let s = "";
  for (const f of files) {
    if (!f.name)
      continue
    s += f.inode_id.toString().padStart(2, 0) + " ";
    s += f.inode.type === 1 ? "DIR  " : "FILE "
    s += f.inode.size.toString().padStart(4, 0) + " ";
    s += f.inode.offset.toString().padStart(5, 0) + " ";
    s += f.name
    s += '\n';
  }
  return s;
}

function echo(arg) {
  if (arg.length > 1) {
    alert("invalid");
  }
  return arg + "\n";
}

function cat(args) {
  const path = args[0];
  const fd = open(path);
  console.log(fd);
  if (fd === -1) {
    console.error("couldn't find file", path);
    return "";
  }
  if (fd.type === 1) {
    return "";
  }
  const buffer = new Array(fd.size);
  read(fd, buffer, fd.size);
  console.log(buffer);
  return buffer.map(x => String.fromCharCode(x)).join("") + "\n";
}

function clear() {
  term.value = "";
}

function touch(args) {
  const path = args[0];
  const content = args[1];
  const fd = create(path, content.length);
  if (fd === -1) {
    console.error("create failed");
    return;
  }
  const buffer = string_to_ascii(content);
  console.log("Writing", buffer, content);
  write(fd, buffer);
}

function command(cmd) {
  const split = cmd.trim().split(" ");
  const bin = split[0];
  const args = split.slice(1);
  if (bin == "ls") {
    term.value += ls();
  }
  if (bin === "echo") {
    term.value += echo(args);
  }
  if (bin === "clear") {
    clear();
  }
  if (bin === "cat") {
    term.value += cat(args);
  }
  if (bin === "touch") {
    touch(args);
  }
  if (bin === "debug") {
    dump_inodes();
  }
}

