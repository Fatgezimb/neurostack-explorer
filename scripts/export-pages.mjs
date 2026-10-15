import { cp, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const pagesRoutes = ["/", "/about", "/data", "/lab", "/limitations", "/methods", "/models", "/notebooks", "/pipeline", "/sources", "/tools", "/visualizations", "/tools/python", "/tools/jupyterlab", "/tools/pynapple", "/tools/nemos", "/tools/plenoptic", "/tools/stan", "/tools/bridgestan", "/tools/figurl", "/tools/pytorch", "/tools/scikit-learn", "/tools/plotly", "/tools/nwb"];

export function normalizeBasePath(value = "") {
  const basePath = value.replace(/\/+$/, "");
  if (basePath && (!/^\/[A-Za-z0-9_./-]+$/.test(basePath) || basePath.includes("//") || basePath.split("/").some((part) => part === "." || part === ".."))) {
    throw new Error("Invalid PAGES_BASE_PATH");
  }
  return basePath;
}

export function assertBaseAwareHtml(html, basePath, route) {
  if (!html.includes("__VINEXT_RSC_DONE__")) throw new Error(`${route}: incomplete streamed HTML/RSC payload`);
  for (const match of html.matchAll(/(?:href|src|action|poster)=["'](\/(?!\/)[^"']*)/g)) {
    if (basePath && match[1] !== basePath && !match[1].startsWith(`${basePath}/`)) {
      throw new Error(`${route}: unprefixed URL ${match[1]}; rebuild and render with PAGES_BASE_PATH`);
    }
  }
  for (const match of html.matchAll(/\bimport\(["'](\/(?!\/)[^"']*)/g)) {
    if (basePath && !match[1].startsWith(`${basePath}/`)) throw new Error(`${route}: unprefixed client bootstrap ${match[1]}`);
  }
}

export function extractEmbeddedRsc(html) {
  const prefix = "self.__VINEXT_RSC_CHUNKS__=self.__VINEXT_RSC_CHUNKS__||[];self.__VINEXT_RSC_CHUNKS__.push(";
  const chunks = [];
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    const script = match[1];
    if (!script.startsWith(prefix)) continue;
    if (!script.endsWith(")")) throw new Error("Malformed embedded RSC chunk");
    const chunk = JSON.parse(script.slice(prefix.length, -1));
    if (typeof chunk !== "string") throw new Error("Embedded RSC chunk must be a string");
    chunks.push(chunk);
  }
  if (!chunks.length) throw new Error("Missing embedded RSC payload");
  return chunks.join("");
}

export function notFoundHtml(basePath) {
  const home = `${basePath}/`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | NeuroStack Explorer</title><style>body{font:1.1rem/1.6 system-ui,sans-serif;max-width:40rem;margin:12vh auto;padding:1.5rem;color:#15352f;background:#f4f8f6}a{color:#075e50}a:focus-visible{outline:3px solid #075e50;outline-offset:4px}</style></head><body><main><h1>Page not found</h1><p>The requested page is unavailable.</p><p><a href="${home}">Return to NeuroStack Explorer</a></p><p><a href="${home}lab/">Open the analysis workspace</a></p></main></body></html>`;
}

export function cssUrls(source) {
  // Consume quoted URL tokens whole: SVG data URIs can themselves contain
  // parentheses and url(...) strings that are not separate CSS resources.
  const tokens = /\burl\(\s*(?:"((?:\\[\s\S]|[^"\\])*)"|'((?:\\[\s\S]|[^'\\])*)'|([^\s)]+))\s*\)|@import\s+(?:"((?:\\[\s\S]|[^"\\])*)"|'((?:\\[\s\S]|[^'\\])*)')/gi;
  return [...source.matchAll(tokens)].map((match) => match.slice(1).find((value) => value !== undefined));
}

export function srcsetUrls(value) {
  const urls = [];
  let rest = value;
  while ((rest = rest.replace(/^[\s,]+/, ""))) {
    const token = /^\S+/.exec(rest)[0];
    rest = rest.slice(token.length);
    if (token.endsWith(",")) urls.push(token.replace(/,+$/, ""));
    else {
      urls.push(token);
      const descriptorEnd = rest.indexOf(",");
      rest = descriptorEnd === -1 ? "" : rest.slice(descriptorEnd + 1);
    }
  }
  return urls;
}

export function htmlUrls(html) {
  const urls = [...html.matchAll(/\b(?:href|src|action|poster|data-src|data-poster)=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const [, srcset] of html.matchAll(/\b(?:srcset|imagesrcset)=["']([^"']+)["']/gi)) urls.push(...srcsetUrls(srcset));
  for (const [, scriptImport] of html.matchAll(/\bimport\(["']([^"']+)["']/g)) urls.push(scriptImport);
  return [...urls, ...cssUrls(html)];
}

/** Validate the prospective artifact without rewriting files or replacing an existing export. */
export async function validateResources({ basePath, client, rendered }) {
  const clientRoot = await realpath(client);
  const available = new Set(rendered.map(([file]) => file));
  const stylesheets = [];
  for (const file of await readdir(clientRoot, { recursive: true })) {
    const path = join(clientRoot, file);
    if (!(await stat(path)).isFile()) continue;
    const actualPath = await realpath(path);
    if (!actualPath.startsWith(`${clientRoot}${sep}`)) throw new Error(`Client asset escapes its source directory: ${file}`);
    const normalizedFile = file.split(sep).join("/");
    available.add(normalizedFile);
    if (file.endsWith(".css")) stylesheets.push([normalizedFile, await readFile(path, "utf8")]);
  }
  function checkUrl(file, rawUrl) {
    const value = rawUrl.replaceAll("&amp;", "&");
    if (!value || value.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return;
    const documentPath = file.endsWith("index.html") ? file.slice(0, -"index.html".length) : file;
    const url = new URL(value, `https://pages-export.invalid${basePath}/${documentPath}`);
    if (basePath && url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
      throw new Error(`${file} contains a URL outside PAGES_BASE_PATH: ${rawUrl}`);
    }
    const pathname = decodeURIComponent(url.pathname.slice(basePath.length));
    const decodedPath = pathname === "" ? "/" : pathname;
    const target = posix.normalize(decodedPath).replace(/^\//, "");
    if (decodedPath.split("/").some((part) => part === "..") || target.startsWith("../")) throw new Error(`${file} contains a path outside the export: ${rawUrl}`);
    const normalized = target.replace(/\/$/, "");
    if (!available.has(normalized) && !available.has(`${normalized ? `${normalized}/` : ""}index.html`)) {
      throw new Error(`${file} points to a missing static file: ${rawUrl}`);
    }
  }
  for (const [file, html] of rendered) {
    if (file.endsWith(".html")) for (const url of htmlUrls(html)) checkUrl(file, url);
  }
  for (const [file, css] of stylesheets) for (const url of cssUrls(css)) checkUrl(file, url);
}

export async function exportPages({
  basePath = normalizeBasePath(process.env.PAGES_BASE_PATH),
  output = process.env.PAGES_OUTPUT ?? "pages-dist",
  client = "dist/client",
  server = process.env.PAGES_SERVER ?? "http://127.0.0.1:4173",
} = {}) {
  basePath = normalizeBasePath(basePath);
  const outputPath = resolve(output);
  const localOutput = relative(process.cwd(), outputPath);
  const clientWithinOutput = relative(outputPath, resolve(client));
  const generatedOutput = localOutput === "pages-dist" || localOutput.startsWith(`work${sep}`) || localOutput.startsWith(`tmp${sep}`);
  if (!generatedOutput || !clientWithinOutput.startsWith(`..${sep}`)) {
    throw new Error("PAGES_OUTPUT must be pages-dist or a generated work/tmp subdirectory, separate from the client source");
  }
  const rendered = [];
  async function fetchText(path, contentType, options = {}) {
    const response = await fetch(`${server.replace(/\/$/, "")}${path}`, options);
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes(contentType)) {
      throw new Error(`${path}: expected ${contentType}, received ${response.status} ${response.headers.get("content-type")}`);
    }
    return response.text();
  }
  for (const route of pagesRoutes) {
    const requestPath = `${basePath}${route}${route === "/" ? "" : "/"}`;
    const html = await fetchText(requestPath, "text/html");
    assertBaseAwareHtml(html, basePath, route);
    rendered.push([route === "/" ? "index.html" : `${route.slice(1)}/index.html`, html]);
    // Preserve the framework payload alongside each HTML route for client refresh/navigation.
    const rsc = extractEmbeddedRsc(html);
    rendered.push([route === "/" ? "index.rsc" : `${route.slice(1)}.rsc`, rsc]);
  }
  rendered.push(["robots.txt", "User-agent: *\nAllow: /\nSitemap: https://fatgezimb.github.io/neurostack-explorer/sitemap.xml\n"]);
  rendered.push(["sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pagesRoutes.map(route => `<url><loc>https://fatgezimb.github.io/neurostack-explorer${route === "/" ? "/" : route}</loc></url>`).join("")}</urlset>`]);
  rendered.push(["404.html", notFoundHtml(basePath)]);
  rendered.push([".nojekyll", ""]);
  await validateResources({ basePath, client, rendered });
  // Fetch and validate everything before replacing a previous generated export.
  await rm(outputPath, { recursive: true, force: true });
  await cp(client, outputPath, { recursive: true });
  for (const [file, text] of rendered) {
    await mkdir(dirname(join(outputPath, file)), { recursive: true });
    await writeFile(join(outputPath, file), text);
  }
  console.log(`Exported and checked ${pagesRoutes.length} routes, RSC payloads, and metadata to ${relative(process.cwd(), outputPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await exportPages();
