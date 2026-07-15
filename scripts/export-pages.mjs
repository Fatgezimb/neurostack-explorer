import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";

const basePath = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const output = process.env.PAGES_OUTPUT ?? "pages-dist";
const routes = ["/", "/about", "/data", "/lab", "/limitations", "/methods", "/models", "/notebooks", "/pipeline", "/sources", "/tools", "/visualizations", "/tools/python", "/tools/jupyterlab", "/tools/pynapple", "/tools/nemos", "/tools/plenoptic", "/tools/stan", "/tools/bridgestan", "/tools/figurl", "/tools/pytorch", "/tools/scikit-learn", "/tools/plotly", "/tools/nwb"];
const server = process.env.PAGES_SERVER ?? "http://127.0.0.1:4173";

await cp("dist/client", output, { recursive: true });
for (const route of routes) {
  const response = await fetch(`${server}${route}`);
  if (!response.ok) throw new Error(`${route}: ${response.status}`);
  let html = await response.text();
  html = html.replace(/(href|src|action|poster|content)=(['"])\/(?!\/)/g, `$1=$2${basePath}/`);
  const directory = route === "/" ? output : join(output, route.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "index.html"), html);
}
await writeFile(join(output, "404.html"), await readFile(join(output, "index.html")));
console.log(`Exported ${routes.length} routes to ${posix.normalize(output)}`);
