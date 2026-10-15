/**
 * Framework workarounds from the verified Pages deployment, scoped to its build.
 * @param {string} basePath
 * @returns {import("vite").Plugin[]}
 */
export function createPagesAdapters(basePath) {
  return [
    {
      name: "pages-font-base-path",
      enforce: "post",
      transform(code) {
        if (!basePath || !code.includes("_selfHostedCSS")) return;
        return {
          code: code.replaceAll("url(/assets/_vinext_fonts/", `url(${basePath}/assets/_vinext_fonts/`),
          map: null,
        };
      },
    },
    {
      name: "pages-static-history",
      enforce: "pre",
      transform(code, id) {
        if (!basePath || !id.endsWith("/vinext/dist/server/app-browser-entry.js")) return;
        const original = /\tif \("scrollRestoration" in history\) history\.scrollRestoration = "manual";\n\twindow\.addEventListener\("popstate", \(event\) => \{[\s\S]*?\n\t\}\);/;
        if (!original.test(code)) throw new Error("Review the Pages history adapter for this Vinext version.");
        return {
          code: code.replace(original, `
  const pagesDocumentPath = window.location.pathname + window.location.search;
  if ("scrollRestoration" in history) history.scrollRestoration = "auto";
  window.addEventListener("popstate", () => {
    if (window.location.pathname + window.location.search !== pagesDocumentPath) {
      window.location.reload();
      return;
    }
    commitClientNavigationState();
  });`),
          map: null,
        };
      },
    },
  ];
}
