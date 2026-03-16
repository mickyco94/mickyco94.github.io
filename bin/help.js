export function help() {
  const commands = [
    "wat",
    "?",
    "wtf",
    "ls",
    "cmd",
    "echo",
    "clear",
    "cat",
    "touch",
    "mkdir",
    "stat",
    "date",
    "cd",
    "rm",
    "rmdir",
    "help",
    "claude",
    "cv",
  ];
  return "Available commands:\n" + commands.sort().join("\n") + "\n";
}
