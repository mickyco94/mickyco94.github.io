import { stat as _stat } from './disk.js';
import { cat, date, echo, ls, mkdir, rm, rmdir, touch, stat } from './bin/index.js';

const WELCOME = `Welcome to my stupid website`;

// Maybe lets just create an env.js
let INPUT_START = 0;
let PWD = "/";

const PROMPT = () => {
  return `${PWD} > `
}

const term = document.getElementById("terminal");
term.value = WELCOME + "\n" + PROMPT();
term.selectionStart = term.selectionEnd = term.value.length;
INPUT_START = term.selectionStart + 1;
term.focus();
term.addEventListener("blur", () => term.focus());

function input() {
  return term.value.split("\n")?.at(-1)?.replace(PROMPT(), "");
}

term.addEventListener("keydown", (event) => {
  // Prevent writing if selected before the prompt
  if (event.key === "Enter") {
    event.preventDefault();
    const cmd = input();
    term.value += "\n";
    const stdout = command(cmd);
    if (stdout)
      term.value += stdout;
    term.value += PROMPT();
    INPUT_START = term.selectionStart + 1;
  }
  if (event.key === "Backspace") {
    if (term.selectionStart < INPUT_START) {
      event.preventDefault();
    }
  }
});

function clear() {
  term.value = "";
}

function cd(args) {
  if (!args)
    return "";
  const path = args[0];
  const fd = _stat(path);
  if (fd === -1) {
    return "not found";
  }
  PWD = path;
  return "\n";
}

function command(cmd) {
  const split = cmd.trim().split(" ");
  const bin = split[0];
  const args = split.slice(1);

  switch (bin) {
    case "ls":
      return ls(args);
    case "echo":
      return echo(args);
    case "clear":
      return clear();
    case "cat":
      return cat(args);
    case "touch":
      return touch(args);
    case "mkdir":
      return mkdir(args);
    case "stat":
      return stat(args);
    case "date":
      return date();
    case "cd":
      return cd(args);
    case "rm":
      return rm(args);
    case "rmdir":
      return rmdir(args);
    default:
      return "Unknown command\n";
  }
}

