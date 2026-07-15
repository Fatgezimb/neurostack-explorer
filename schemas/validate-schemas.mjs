import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const schemaDirectory = dirname(fileURLToPath(import.meta.url));
const schemaFiles = (await readdir(schemaDirectory))
  .filter((name) => name.endsWith(".schema.json"))
  .sort();

if (schemaFiles.length === 0) {
  throw new Error("No .schema.json files found.");
}

const seenIds = new Set();

function collectRelativeRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectRelativeRefs(item, refs);
    return refs;
  }

  if (!value || typeof value !== "object") return refs;

  for (const [key, item] of Object.entries(value)) {
    if (
      key === "$ref" &&
      typeof item === "string" &&
      !item.startsWith("#") &&
      !item.startsWith("http://") &&
      !item.startsWith("https://") &&
      !item.startsWith("urn:")
    ) {
      refs.push(item.split("#", 1)[0]);
    }
    collectRelativeRefs(item, refs);
  }

  return refs;
}

for (const filename of schemaFiles) {
  const path = resolve(schemaDirectory, filename);
  const source = await readFile(path, "utf8");
  const schema = JSON.parse(source);

  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error(`${filename}: expected JSON Schema Draft 2020-12 declaration.`);
  }

  for (const key of ["$id", "title", "type", "properties"]) {
    if (!(key in schema)) throw new Error(`${filename}: missing top-level ${key}.`);
  }

  if (seenIds.has(schema.$id)) {
    throw new Error(`${filename}: duplicate schema identifier ${schema.$id}.`);
  }
  seenIds.add(schema.$id);

  for (const relativeRef of collectRelativeRefs(schema)) {
    const referencedPath = resolve(schemaDirectory, relativeRef);
    await readFile(referencedPath, "utf8").catch(() => {
      throw new Error(`${filename}: missing relative $ref target ${relativeRef}.`);
    });
  }
}

console.log(`Validated ${schemaFiles.length} schema files.`);

