import assert from "node:assert/strict";
import test from "node:test";

const routes = [
  ["/", /Open neural data, made inspectable/],
  ["/lab", /Neural-data analysis workspace/],
  ["/pipeline", /pipeline/i],
  ["/data", /DANDI 000582/],
  ["/tools", /technology stack/i],
  ["/models", /model/i],
  ["/visualizations", /Scientific Figure Viewer/],
  ["/notebooks", /notebook/i],
  ["/methods", /methods/i],
  ["/sources", /source/i],
  ["/about", /Fatgezim/],
  ["/limitations", /limitations/i],
  ...[
    "python",
    "jupyterlab",
    "pynapple",
    "nemos",
    "plenoptic",
    "stan",
    "bridgestan",
    "figurl",
    "pytorch",
    "scikit-learn",
    "plotly",
    "nwb",
  ].map((slug) => [`/tools/${slug}`, /Scientific stage contract/i]),
];

let workerPromise;

async function worker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

async function render(pathname) {
  const server = await worker();
  return server.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

for (const [pathname, expected] of routes) {
  test(`server-renders ${pathname}`, async () => {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, expected);
    assert.match(html, /Skip to main content/);
    assert.match(html, /NeuroStack Explorer/);
    assert.doesNotMatch(html, /Your site is taking shape|Codex is working|react-loading-skeleton/i);
  });
}

test("home exposes scope, provenance, and safe external links", async () => {
  const response = await render("/");
  const html = await response.text();

  assert.match(html, /educational technical demonstration/i);
  assert.match(html, /not a laboratory, medical device, diagnostic system/i);
  assert.match(html, /DANDI 000582/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer noopener"|rel="noopener noreferrer"/);
});

test("unknown tool routes return not found", async () => {
  const response = await render("/tools/not-a-tool");
  assert.equal(response.status, 404);
});
