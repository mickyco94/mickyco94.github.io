export function echo(args) {
  let s = "";
  for (const a of args) {
    s += a + " ";
  }
  return s + "\n";
}

