"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import styles from "./HeroSnapshot.module.css";

const spikes = Array.from({ length: 8 }, (_, unit) =>
  Array.from({ length: 18 }, (_, index) => ((index * 37 + unit * 19 + (index % 3) * 11) % 293) / 293),
);

type DataSavingConnection = EventTarget & { saveData?: boolean };

export function HeroSnapshot() {
  const snapshotRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: DataSavingConnection }).connection;
    setReducedMotion(media.matches);
    setSaveData(Boolean(connection?.saveData));
    let frame = 0;
    let animation = 0;

    const draw = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(box.width));
      const height = Math.max(1, Math.floor(box.height));
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const css = getComputedStyle(document.documentElement);
      const line = css.getPropertyValue("--line").trim();
      const teal = css.getPropertyValue("--teal").trim();
      const blue = css.getPropertyValue("--blue").trim();
      const violet = css.getPropertyValue("--violet").trim();
      const amber = css.getPropertyValue("--amber").trim();

      context.strokeStyle = line;
      context.lineWidth = 1;
      for (let x = 0; x <= width; x += 34) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
      }
      for (let y = 0; y <= height; y += 34) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
      }

      const staticPreference = media.matches || Boolean(connection?.saveData);
      const pointer = staticPreference || !playing ? { x: 0, y: 0 } : pointerRef.current;
      context.save();
      context.translate(pointer.x * 5, pointer.y * 3);

      const rasterTop = 38;
      const rasterHeight = Math.min(height * 0.42, 190);
      spikes.forEach((unitSpikes, unit) => {
        const y = rasterTop + (unit / 7) * rasterHeight;
        context.fillStyle = unit % 2 === 0 ? teal : blue;
        unitSpikes.forEach((value, spikeIndex) => {
          const phase = staticPreference ? 0 : ((frame * 0.00055 + unit * 0.003 + spikeIndex * 0.001) % 0.035);
          const x = 24 + ((value + phase) % 1) * (width - 48);
          context.fillRect(x, y - 4, 1.5, 8);
        });
      });

      const traceY = rasterTop + rasterHeight + 44;
      context.strokeStyle = violet;
      context.lineWidth = 1.7;
      context.beginPath();
      for (let x = 20; x < width - 20; x += 2) {
        const y = traceY + Math.sin(x * 0.052) * 10 + Math.sin(x * 0.13 + (staticPreference ? 0 : frame * 0.015)) * 3;
        if (x === 20) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();

      const plotBottom = height - 30;
      const centerX = width * 0.72;
      const centerY = Math.max(traceY + 62, plotBottom - 66);
      for (let point = 0; point < 58; point += 1) {
        const angle = point * 2.399 + (staticPreference ? 0 : frame * 0.0015);
        const radius = 8 + (point % 13) * 3.3;
        context.globalAlpha = 0.38 + (point % 5) * 0.11;
        context.fillStyle = point % 3 === 0 ? amber : teal;
        context.beginPath();
        context.arc(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius * 0.58, 2.2, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;

      context.strokeStyle = teal;
      context.lineWidth = 2;
      context.globalAlpha = 0.14;
      context.fillStyle = teal;
      context.beginPath();
      for (let i = 0; i <= 40; i += 1) {
        const x = 24 + (i / 40) * Math.max(90, width * 0.32);
        const normalized = i / 40;
        const response = Math.exp(-Math.pow((normalized - 0.62) / 0.18, 2));
        const y = plotBottom - response * 72 - (5 + response * 7);
        if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      for (let i = 40; i >= 0; i -= 1) {
        const x = 24 + (i / 40) * Math.max(90, width * 0.32);
        const normalized = i / 40;
        const response = Math.exp(-Math.pow((normalized - 0.62) / 0.18, 2));
        context.lineTo(x, plotBottom - response * 72 + (5 + response * 7));
      }
      context.closePath();
      context.fill();
      context.globalAlpha = 1;

      context.beginPath();
      const tuningWidth = Math.max(90, width * 0.32);
      for (let i = 0; i <= 40; i += 1) {
        const x = 24 + (i / 40) * tuningWidth;
        const normalized = i / 40;
        const response = Math.exp(-Math.pow((normalized - 0.62) / 0.18, 2));
        const y = plotBottom - response * 72;
        if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
      context.restore();

      frame += 1;
      if (playing && !staticPreference && document.visibilityState === "visible") animation = requestAnimationFrame(draw);
    };

    draw();
    const onPreferenceChange = () => {
      setReducedMotion(media.matches);
      setSaveData(Boolean(connection?.saveData));
      pointerRef.current = { x: 0, y: 0 };
      snapshotRef.current?.style.setProperty("--pointer-x", "0px");
      snapshotRef.current?.style.setProperty("--pointer-y", "0px");
      cancelAnimationFrame(animation);
      draw();
    };
    const onVisibilityChange = () => {
      cancelAnimationFrame(animation);
      if (document.visibilityState === "visible") draw();
    };
    media.addEventListener("change", onPreferenceChange);
    connection?.addEventListener("change", onPreferenceChange);
    window.addEventListener("resize", onPreferenceChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelAnimationFrame(animation);
      media.removeEventListener("change", onPreferenceChange);
      connection?.removeEventListener("change", onPreferenceChange);
      window.removeEventListener("resize", onPreferenceChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [playing]);

  const respondToPointer = (event: PointerEvent<HTMLElement>) => {
    if (reducedMotion || saveData || !playing || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    pointerRef.current = { x, y };
    snapshotRef.current?.style.setProperty("--pointer-x", `${x * 4}px`);
    snapshotRef.current?.style.setProperty("--pointer-y", `${y * 3}px`);
  };

  const resetPointer = () => {
    pointerRef.current = { x: 0, y: 0 };
    snapshotRef.current?.style.setProperty("--pointer-x", "0px");
    snapshotRef.current?.style.setProperty("--pointer-y", "0px");
  };

  return (
    <aside
      aria-label="Source-linked analysis preview"
      className={styles.snapshot}
      onPointerLeave={resetPointer}
      onPointerMove={respondToPointer}
      ref={snapshotRef}
    >
      <div className={styles.snapshotHead}>
        <div>
          <p className="eyebrow">Source-linked analysis preview</p>
          <h2>Public session / MEC</h2>
        </div>
        <div className={styles.snapshotActions}>
          <span className="status-pill" data-tone="public">Source verified · visual illustrative</span>
          <button aria-pressed={playing && !reducedMotion && !saveData} className="button-quiet" disabled={reducedMotion || saveData} onClick={() => { resetPointer(); setPlaying((current) => !current); }} type="button">{reducedMotion ? "Motion preference: static" : saveData ? "Data saver: static" : playing ? "Pause preview" : "Play preview"}</button>
        </div>
      </div>
      <div className={styles.canvasWrap}>
        <canvas
          aria-label="Illustrative interface preview of an eight-unit spike raster, tuning-form curve with a clearly labeled noncomputed interval band, neural trace, and population feature map. The source facts below are verified; exact public-derived values load in the analysis workspace."
          ref={canvasRef}
          role="img"
        />
        <div className={styles.axisLabels} aria-hidden="true">
          <span>8 sorted units</span><span>600 s session</span><span>20 ms position sampling</span>
        </div>
        <span className={styles.intervalLabel}>Illustrative interval band · not computed</span>
        <span className={styles.pointerLabel}>{saveData ? "Data Saver keeps this preview static" : "Pointer shifts interface depth · pause to freeze"}</span>
      </div>
      <div className={styles.motifRail}>
        <div className={styles.pipelineMotif}>
          <span>Checked-in analysis path</span>
          <ol>
            <li>NWB</li><li>Pynapple Ts</li><li>100 ms bins</li><li>models</li><li>figure</li>
          </ol>
        </div>
        <div className={styles.codeMotif}>
          <span>Executed lane</span>
          <code><b>01</b> validate(path=source_path)</code>
          <code><b>02</b> write_json(artifact, compact=True)</code>
        </div>
      </div>
      <dl className={styles.metrics}>
        <div><dt>Dataset</dt><dd>DANDI 000582</dd></div>
        <div><dt>Asset</dt><dd>sub-10073 / session 17010302</dd></div>
        <div><dt>Region</dt><dd>Medial entorhinal cortex, layer II</dd></div>
        <div><dt>Source</dt><dd>CC BY 4.0 · immutable published version</dd></div>
        <div><dt>Model lane</dt><dd>Poisson encoding comparison</dd></div>
        <div><dt>Rendering</dt><dd>Canvas preview · accessible text summary</dd></div>
      </dl>
      <p className={styles.summary}>
        <strong>What this view means:</strong> vertical marks represent spikes from eight sorted units; the curve is
        a labeled tuning-form preview with a deliberately illustrative interval band, and the point cloud represents a compact
        population feature map. The band and canvas geometry are interface motifs, not computed results; exact public-derived
        values, units, transformations, and occupancy masking are exposed in the analysis workspace.
      </p>
    </aside>
  );
}
