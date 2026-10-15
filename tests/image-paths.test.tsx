import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ToolSignatureVisual } from "../app/components/ToolSignatureVisual";
import plenoptic from "../public/artifacts/v1/plenoptic-demo.json";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("loads computed scientific images from static Pages resources without an optimizer", async () => {
  vi.stubEnv("NEXT_PUBLIC_NEUROSTACK_BASE_PATH", "/neurostack-explorer");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: url.includes("plenoptic-demo.json"),
    status: url.includes("plenoptic-demo.json") ? 200 : 404,
    json: async () => plenoptic,
  })));
  render(<ToolSignatureVisual slug="plenoptic" name="plenoptic" />);
  const image = await screen.findByAltText("Deterministic procedural grayscale source image used by the plenoptic demonstration.");
  expect(image).toHaveAttribute("src", "/neurostack-explorer/artifacts/v1/plenoptic-source.png");
  await waitFor(() => {
    const images = screen.getAllByRole("img").filter(entry => entry.tagName === "IMG");
    expect(images).toHaveLength(3);
    for (const entry of images) {
      expect(entry.getAttribute("src")).toMatch(/^\/neurostack-explorer\/artifacts\/v1\//);
      expect(entry.getAttribute("src")).not.toMatch(/_vinext\/image|_next\/image/);
    }
  });
});
