import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { assertBaseAwareHtml, cssUrls, exportPages, extractEmbeddedRsc, htmlUrls, normalizeBasePath, notFoundHtml, pagesRoutes, srcsetUrls, validateResources } from "../scripts/export-pages.mjs";
import { createPagesAdapters } from "../build/pages-vite-adapters.mjs";
import { runInNewContext } from "node:vm";

test("Pages export rejects incomplete streams and root-only build assets", () => {
  assert.throws(() => assertBaseAwareHtml("<html></html>", "/portfolio", "/resume"), /incomplete/);
  assert.throws(() => assertBaseAwareHtml('<script>self.__VINEXT_RSC_DONE__=true;import("/assets/app.js")</script>', "/portfolio", "/resume"), /unprefixed client bootstrap/);
  assert.throws(() => assertBaseAwareHtml('<a href="/resume">Résumé</a><script>self.__VINEXT_RSC_DONE__=true</script>', "/portfolio", "/"), /unprefixed URL/);
  assert.doesNotThrow(() => assertBaseAwareHtml('<a href="/portfolio/lab/">Résumé</a><script>self.__VINEXT_RSC_DONE__=true;import("/portfolio/assets/app.js")</script>', "/portfolio", "/"));
  assert.throws(() => extractEmbeddedRsc('<script>self.__VINEXT_RSC_DONE__=true</script>'), /Missing embedded/);
});

test("deployment paths reject traversal and 404 preserves the project path", () => {
  assert.equal(normalizeBasePath("/portfolio/"), "/portfolio");
  for (const invalid of ["../portfolio", "/a/../b", "/a//b", "/a?b", "/a#b"]) assert.throws(() => normalizeBasePath(invalid));
  const html = notFoundHtml("/portfolio");
  assert.match(html, /Page not found/);
  assert.match(html, /href="\/portfolio\/"/);
  assert.match(html, /href="\/portfolio\/lab\/"/);
  assert.doesNotMatch(html, /<script/);
});

test("export retains hydration payloads and metadata without rewriting framework output", async () => {
  await mkdir("work", { recursive: true });
  const fixture = await mkdtemp(join(process.cwd(), "work", "pages-export-test-"));
  const client = join(fixture, "client");
  const output = join(fixture, "export");
  await mkdir(client);
  await mkdir(join(client, "assets"));
  await writeFile(join(client, "assets", "app.js"), "/* client bootstrap */");
  await mkdir(output);
  await writeFile(join(client, "asset.js"), "/* client asset */");
  await writeFile(join(output, "stale.html"), "stale previous export");
  const requests = [];
  let brokenAsset = false;
  const html = '<!doctype html><a href="/portfolio/lab/">Résumé</a><script>self.__VINEXT_RSC_CHUNKS__=self.__VINEXT_RSC_CHUNKS__||[];self.__VINEXT_RSC_CHUNKS__.push("0:{\\\"route\\\":\\\"fixture\\\"}\\n")</script><script>self.__VINEXT_RSC_DONE__=true;import("/portfolio/assets/app.js")</script>';
  const server = createServer((request, response) => {
    requests.push(request.url);
    if (request.headers.rsc === "1") response.writeHead(200, { "content-type": "text/x-component" }).end("0:{\"route\":\"fixture\"}\n");
    else if (request.url.endsWith("robots.txt")) response.writeHead(200, { "content-type": "text/plain" }).end("User-agent: *\nAllow: /\n");
    else if (request.url.endsWith("sitemap.xml")) response.writeHead(200, { "content-type": "application/xml" }).end("<urlset/>");
    else response.writeHead(200, { "content-type": "text/html" }).end(html + (brokenAsset ? '<video data-poster="/portfolio/missing.jpg"></video>' : ""));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await exportPages({ basePath: "/portfolio", output, client, server: `http://127.0.0.1:${server.address().port}` });
    assert.equal(await readFile(join(output, "index.html"), "utf8"), html);
    for (const route of pagesRoutes.slice(1)) {
      assert.equal(await readFile(join(output, route.slice(1), "index.html"), "utf8"), html);
      assert.match(await readFile(join(output, `${route.slice(1)}.rsc`), "utf8"), /fixture/);
    }
    assert.match(await readFile(join(output, "index.rsc"), "utf8"), /fixture/);
    assert.match(await readFile(join(output, "robots.txt"), "utf8"), /User-agent/);
    assert.match(await readFile(join(output, "sitemap.xml"), "utf8"), /neurostack-explorer/);
    assert.equal(await readFile(join(output, ".nojekyll"), "utf8"), "");
    assert.match(await readFile(join(output, "404.html"), "utf8"), /Page not found/);
    await assert.rejects(readFile(join(output, "stale.html")), { code: "ENOENT" });
    assert.ok(requests.every((url) => url.startsWith("/portfolio/")));
    await assert.rejects(exportPages({ output: "app", client }), /PAGES_OUTPUT/);
    brokenAsset = true;
    await assert.rejects(exportPages({ basePath: "/portfolio", output, client, server: `http://127.0.0.1:${server.address().port}` }), /missing static file/);
    assert.equal(await readFile(join(output, "index.html"), "utf8"), html, "a failed resource audit preserves the previous export");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(fixture, { recursive: true, force: true });
  }
});

test("resource audit checks srcset, deferred media, inline styles and relative CSS assets", async () => {
  await mkdir("work", { recursive: true });
  const fixture = await mkdtemp(join(process.cwd(), "work", "pages-resources-test-"));
  try {
    await mkdir(join(fixture, "assets"));
    await mkdir(join(fixture, "media"));
    await writeFile(join(fixture, "media", "poster.jpg"), "poster");
    await writeFile(join(fixture, "assets", "font.woff2"), "font");
    const svgUrl = "data:image/svg+xml,%3Csvg%3E%3Crect fill='url(%23n)'/%3E%3C/svg%3E";
    await writeFile(join(fixture, "assets", "style.css"), `@font-face{src:url("./font.woff2")}body{background:url("${svgUrl}"),url(../media/poster.jpg)}`);
    const html = '<img srcset="/portfolio/media/poster.jpg 1x, /portfolio/media/poster.jpg 2x"><video data-src="/portfolio/media/poster.jpg" data-poster="/portfolio/media/poster.jpg"></video><div style="background:url(/portfolio/media/poster.jpg)"></div>';
    const audit = (source) => validateResources({ basePath: "/portfolio", client: fixture, rendered: [["index.html", source]] });
    await audit(html);
    await assert.rejects(audit('<img srcset="/portfolio/media/poster.jpg 1x, /portfolio/media/missing.jpg 2x">'), /missing static file/);
    await assert.rejects(audit('<video data-src="/media/poster.jpg"></video>'), /outside PAGES_BASE_PATH/);
    await assert.rejects(audit('<div style="background:url(/portfolio/media/missing.jpg)"></div>'), /missing static file/);
    await writeFile(join(fixture, "assets", "style.css"), `body{background:url("${svgUrl}"),url(../media/missing.jpg)}`);
    await assert.rejects(audit(html), /missing static file.*missing\.jpg/);
    await writeFile(join(fixture, "assets", "style.css"), 'body{background:url(/assets/root-only.jpg)}');
    await assert.rejects(audit(html), /outside PAGES_BASE_PATH/);
    assert.deepEqual(srcsetUrls("data:image/png;base64,abc 1x, /poster.jpg 2x"), ["data:image/png;base64,abc", "/poster.jpg"]);
    assert.ok(htmlUrls('<source data-src="/video.mp4">').includes("/video.mp4"));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("CSS data SVG is one quoted token and does not conceal subsequent resource URLs", () => {
  const svg = "data:image/svg+xml,%3Csvg%3E%3Crect fill='url(%23n)'/%3E%3C/svg%3E";
  assert.deepEqual(cssUrls(`body{background:url("${svg}"),url('/portfolio/real.jpg')}@import "./extra.css";`), [svg, "/portfolio/real.jpg", "./extra.css"]);
});

test("Pages font adapter prefixes self-hosted font CSS before rendering and hydration", () => {
  const [font] = createPagesAdapters("/portfolio");
  const source = 'const _selfHostedCSS="@font-face{src:url(/assets/_vinext_fonts/geist/font.woff2)}";';
  const result = font.transform(source, "/font-module.js");
  assert.match(result.code, /url\(\/portfolio\/assets\/_vinext_fonts/);
  assert.equal(font.transform(result.code, "/font-module.js").code, result.code);
  assert.equal(createPagesAdapters("")[0].transform(source, "/font-module.js"), undefined);
});

test("Pages history adapter matches installed Vinext and handles hash/history without RSC fetches", async () => {
  const source = await readFile("node_modules/vinext/dist/server/app-browser-entry.js", "utf8");
  const [, historyAdapter] = createPagesAdapters("/portfolio");
  const result = historyAdapter.transform(source, "/node_modules/vinext/dist/server/app-browser-entry.js");
  const snippet = result.code.match(/const pagesDocumentPath = window\.location\.pathname[\s\S]*?commitClientNavigationState\(\);\n  \}\);/)[0];
  let onPopstate;
  let reloads = 0;
  let commits = 0;
  const window = {
    location: { pathname: "/portfolio/", search: "", hash: "", reload() { reloads++; } },
    addEventListener(type, listener) { assert.equal(type, "popstate"); onPopstate = listener; },
  };
  const history = { scrollRestoration: "manual" };
  runInNewContext(snippet, { window, history, commitClientNavigationState() { commits++; } });
  assert.equal(history.scrollRestoration, "auto");
  window.location.hash = "#work";
  onPopstate();
  window.location.hash = "#contact";
  onPopstate();
  assert.equal(commits, 2);
  assert.equal(reloads, 0);
  window.location.pathname = "/portfolio/lab/";
  onPopstate();
  assert.equal(reloads, 1);
  assert.throws(() => historyAdapter.transform("changed framework", "/node_modules/vinext/dist/server/app-browser-entry.js"), /Review the Pages history adapter/);
  assert.equal(createPagesAdapters("")[1].transform(source, "/node_modules/vinext/dist/server/app-browser-entry.js"), undefined);
});
