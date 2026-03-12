import { read_dir, read, create, append, mkdir, stat } from './disk.js';
import { string_to_ascii } from './ascii.js'
const WELCOME = `Welcome to my stupid website`;

let INPUT_START = 0;
const PROMPT = "~ ";

const term = document.getElementById("terminal");
term.value = WELCOME + "\n" + PROMPT;
term.selectionStart = term.selectionEnd = term.value.length;
INPUT_START = term.selectionStart + 1;
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
  return term.value.split("\n")?.at(-1)?.replace(PROMPT, "");
}

term.addEventListener("keydown", (event) => {
  // Prevent writing if selected before the prompt
  if (event.key === "Enter") {
    event.preventDefault();
    const cmd = input();
    term.value += "\n";
    command(cmd);
    term.value += PROMPT;
    INPUT_START = term.selectionStart + 1;
  }
  if (event.key === "Backspace") {
    if (term.selectionStart < INPUT_START) {
      event.preventDefault();
    }
  }
});

function ls(args) {
  const path = args.length > 0 ? args[0] : ".";
  const files = read_dir(path);
  if (files === -1) {
    return "error";
  }
  let s = "";
  for (const f of files) {
    if (!f.name)
      continue
    s += f.inode_id.toString().padStart(2, 0) + " ";
    s += f.inode.type === 1 ? "DIR " : "FILE"
    s += f.inode.size.toString().padStart(2, 0) + " ";
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
  const fd = stat(path);
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

function make_dir(args) {
  const path = args[0]
  mkdir(path);
  return "";
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
  append(fd, buffer);
}

function _stat(args) {
  if (!args)
    return "";
  const path = args[0];
  const fd = stat(path);
  if (fd === -1) {
    return "not found\n";
  }
  const { type, size, offset } = fd;
  return `${type === 1 ? "DIR " : "FILE"} ${size} ${offset}\n`
}

function command(cmd) {
  const split = cmd.trim().split(" ");
  const bin = split[0];
  const args = split.slice(1);
  if (bin == "ls") {
    term.value += ls(args);
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
  if (bin === "mkdir") {
    make_dir(args);
  }
  if (bin === "stat") {
    term.value += _stat(args)
  }
}

