import { ENV } from "./env.js";

export function resolve_path(path) {
  if (path.startsWith("/")) return path;
  const pwd = ENV.get("PWD");
  return pwd === "/" ? `/${path}` : `${pwd}/${path}`;
}
