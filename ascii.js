export function string_to_ascii(s) {
  const buffer = new Array(s.length);
  for (let i = 0; i < s.length; i++) {

    buffer[i] = s.charCodeAt(i);
  }
  return buffer;
}
