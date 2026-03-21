import { describe, it, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const typesDir = resolve(import.meta.dirname, "../../lexicon/types/types/dev/keytrace");

const lexiconsDir = resolve(import.meta.dirname, "../../lexicon/lexicons/dev/keytrace");
const lexiconsTs = resolve(import.meta.dirname, "../../lexicon/types/lexicons.ts");

async function getJsonIds(): Promise<{ file: string; id: string }[]> {
  const files = (await readdir(lexiconsDir)).filter((f) => f.endsWith(".json"));
  return Promise.all(
    files.map(async (file) => {
      const json = JSON.parse(await readFile(resolve(lexiconsDir, file), "utf-8"));
      return { file, id: json.id as string };
    }),
  );
}

async function getTypeIds(): Promise<string[]> {
  const src = await readFile(lexiconsTs, "utf-8");
  // Extract the `ids` const block: `export const ids = { ... } as const`
  const match = src.match(/export const ids\s*=\s*\{([^}]+)\}/);
  if (!match) return [];
  return [...match[1].matchAll(/"(dev\.[^"]+)"/g)].map((m) => m[1]);
}

function extractKnownValues(obj: unknown, path = ""): { path: string; values: string[] }[] {
  if (typeof obj !== "object" || obj === null) return [];
  const results: { path: string; values: string[] }[] = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "knownValues" && Array.isArray(val)) {
      results.push({ path, values: val as string[] });
    } else {
      results.push(...extractKnownValues(val, path ? `${path}.${key}` : key));
    }
  }
  return results;
}

describe("lexicon knownValues", () => {
  it("every knownValue in JSON lexicon files is present in the corresponding TypeScript type file", async () => {
    const files = (await readdir(lexiconsDir)).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const json = JSON.parse(await readFile(resolve(lexiconsDir, file), "utf-8"));
      const shortName = file.replace(".json", "");
      const tsPath = resolve(typesDir, `${shortName}.ts`);

      let tsSrc: string;
      try {
        tsSrc = await readFile(tsPath, "utf-8");
      } catch {
        continue; // no generated TS file for this lexicon, skip
      }

      for (const { path, values } of extractKnownValues(json)) {
        for (const value of values) {
          expect(tsSrc, `${file} knownValue "${value}" at ${path} is missing from ${shortName}.ts`).toContain(`'${value}'`);
        }
      }
    }
  });
});

describe("lexicon ids", () => {
  it("every entry in the ids export in lexicons.ts has a corresponding JSON lexicon file", async () => {
    const [jsonIds, typeIds] = await Promise.all([getJsonIds(), getTypeIds()]);
    const jsonIdSet = new Set(jsonIds.map((e) => e.id));

    for (const id of typeIds) {
      expect(jsonIdSet, `ids export contains "${id}" but no matching JSON file exists in lexicons/dev/keytrace/`).toContain(id);
    }
  });
});
