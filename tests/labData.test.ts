import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSyntheticFallback, isDemoDataset, loadDemoDataset, normalizeDemoDataset } from "../lib/labData";

describe("scientific artifact boundary", () => {
  it("creates a deterministic, visibly synthetic fallback", () => {
    const first = createSyntheticFallback();
    const second = createSyntheticFallback();

    expect(first).toEqual(second);
    expect(first.metadata.origin).toBe("synthetic");
    expect(first.metadata.datasetId).toBe("SYNTHETIC:neurostack-emergency-fallback");
    expect(first.metadata.datasetId).not.toContain("DANDI");
    expect(first.metadata.assetUuid).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27,}/i);
    expect(first.metadata.sha256).not.toMatch(/^[0-9a-f]{64}$/i);
    expect(first.metadata.species).toContain("synthetic");
    expect(first.units).toHaveLength(8);
    expect(first.derived.unitRates).toHaveLength(8);
    expect(first.models.nemos.origin).toBe("illustrative");
    expect(first.accessibleSummaries.raster).toContain("synthetic");
  });

  it("rejects incomplete artifact-shaped values", () => {
    expect(isDemoDataset(null)).toBe(false);
    expect(isDemoDataset({ metadata: { datasetId: "DANDI:000582" } })).toBe(false);
    expect(isDemoDataset(createSyntheticFallback())).toBe(true);
  });

  it("normalizes the generated public artifact into the browser contract", () => {
    const raw = JSON.parse(readFileSync(resolve(process.cwd(), "public/artifacts/v1/demo-dataset.json"), "utf8"));
    const normalized = normalizeDemoDataset(raw);

    expect(normalized?.metadata.origin).toBe("public-derived");
    expect(normalized?.metadata.datasetId).toBe("DANDI:000582");
    expect(normalized?.metadata.version).toBe("0.251111.2151");
    expect(normalized?.derived.unitRates).toHaveLength(8);
    expect(normalized?.accessibleSummaries.raster).toMatch(/8 sorted units|public-derived/i);
    if (normalized?.models.nemos.artifactAvailable) {
      expect(normalized.models.nemos.metricValue).toEqual(expect.any(Number));
      expect(normalized.models.stan.posteriorDrawSamples?.parameters).toHaveLength(5);
      expect(normalized.models.stan.posteriorDrawSamples?.displayDrawCount).toBe(200);
    } else {
      expect(normalized?.models.nemos.metricValue).toBeNull();
    }
  });

  it("loads a valid public artifact from the versioned endpoint", async () => {
    const artifact = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/artifacts/v1/demo-dataset.json"), "utf8"),
    );
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(artifact), { status: 200 }),
    );

    const loaded = await loadDemoDataset();
    expect(loaded.metadata.origin).toBe("public-derived");
    expect(loaded.metadata.datasetId).toBe("DANDI:000582");
    expect(loaded.metadata.version).toBe("0.251111.2151");
    expect(loaded.position).toEqual(artifact.position);
    expect(loaded.models.nemos).toMatchObject(artifact.models.nemos);
    expect(loaded.models.nemos.artifactAvailable).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/artifacts/v1/demo-dataset.json?sha=e56d1ded0dad948c",
      expect.objectContaining({ cache: "force-cache" }),
    );
    fetchMock.mockRestore();
  });

  it("falls back deterministically when the artifact cannot be fetched", async () => {
    const synthetic = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/artifacts/v1/synthetic-dataset.json"), "utf8"),
    );
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("public artifact offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify(synthetic), { status: 200 }));
    const dataset = await loadDemoDataset();

    expect(dataset.metadata.origin).toBe("synthetic");
    expect(dataset.metadata.datasetId).toBe("synthetic-neurostack-20260714");
    expect(dataset.metadata.datasetId).not.toContain("DANDI");
    expect(dataset.units).toHaveLength(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/artifacts/v1/synthetic-dataset.json?sha=ad63cff4be0401f2",
      expect.objectContaining({ cache: "force-cache" }),
    );
    fetchMock.mockRestore();
  });

  it("uses an in-memory synthetic fixture only when both artifacts are unavailable", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const dataset = await loadDemoDataset();

    expect(dataset.metadata.origin).toBe("synthetic");
    expect(dataset.metadata.datasetId).toBe("SYNTHETIC:neurostack-emergency-fallback");
    expect(dataset.metadata.datasetId).not.toContain("DANDI");
    expect(dataset.units.every((unit) => unit.id.startsWith("synthetic-unit-"))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockRestore();
  });
});
