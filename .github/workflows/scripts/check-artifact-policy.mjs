import { execFileSync } from "node:child_process";
import { stat } from "node:fs/promises";
import { extname } from "node:path";

const MAX_TRACKED_BYTES = 20 * 1024 * 1024;
const scientificBinaryExtensions = new Set([
  ".ckpt",
  ".h5",
  ".hdf5",
  ".npy",
  ".npz",
  ".nwb",
  ".onnx",
  ".pt",
  ".pth",
]);

const repositoryFiles = [
  ...new Set(
    execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean),
  ),
];

const failures = [];
const notices = [];

for (const file of repositoryFiles) {
  const fileStat = await stat(file);

  if (fileStat.size > MAX_TRACKED_BYTES) {
    failures.push(`${file}: ${fileStat.size} bytes exceeds the 20 MiB repository-file limit.`);
  }

  if (scientificBinaryExtensions.has(extname(file).toLowerCase())) {
    notices.push(`${file}: tracked scientific binary (${fileStat.size} bytes); verify license and provenance.`);
  }

  if (/^\.env(?:\.|$)/.test(file) && file !== ".env.example") {
    failures.push(`${file}: environment files other than .env.example must not be tracked.`);
  }
}

if (notices.length > 0) {
  console.log("Scientific binary review notices:");
  for (const notice of notices) console.log(`- ${notice}`);
}

if (failures.length > 0) {
  throw new Error(`Artifact policy failed:\n- ${failures.join("\n- ")}`);
}

console.log(`Artifact policy checked ${repositoryFiles.length} repository files.`);
