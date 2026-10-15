/** Resolve public resources and native links for the selected deployment target. */
export function sitePath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_NEUROSTACK_BASE_PATH ?? "";
  if (!basePath || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === basePath || path.startsWith(`${basePath}/`) || path.startsWith(`${basePath}?`) || path.startsWith(`${basePath}#`)) return path;
  return `${basePath}${path}`;
}
