import { afterEach, describe, expect, it, vi } from "vitest";
import { sitePath } from "../lib/paths";

afterEach(() => vi.unstubAllEnvs());

describe("deployment-aware resource paths", () => {
  it("keeps the root development target unchanged", () => {
    vi.stubEnv("NEXT_PUBLIC_NEUROSTACK_BASE_PATH", "");
    expect(sitePath("/artifacts/v1/demo-dataset.json?sha=verified")).toBe("/artifacts/v1/demo-dataset.json?sha=verified");
  });

  it("keeps navigation and public artifacts inside the Pages project", () => {
    vi.stubEnv("NEXT_PUBLIC_NEUROSTACK_BASE_PATH", "/neurostack-explorer");
    expect(sitePath("/lab?unit=t2c1#summary")).toBe("/neurostack-explorer/lab?unit=t2c1#summary");
    expect(sitePath("/artifacts/v1/demo-dataset.json?sha=verified")).toBe("/neurostack-explorer/artifacts/v1/demo-dataset.json?sha=verified");
    expect(sitePath("/neurostack-explorer/lab")).toBe("/neurostack-explorer/lab");
    expect(sitePath("#main-content")).toBe("#main-content");
    expect(sitePath("https://dandiarchive.org/")).toBe("https://dandiarchive.org/");
    expect(sitePath("//example.com/source")).toBe("//example.com/source");
  });
});
