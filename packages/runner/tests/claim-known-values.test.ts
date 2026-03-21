import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getAllProviders } from "../src/serviceProviders/index.js";

const claimJson = resolve(import.meta.dirname, "../../lexicon/lexicons/dev/keytrace/claim.json");

describe("claim.json knownValues", () => {
  it("every service provider id is in the claim type knownValues", async () => {
    const json = JSON.parse(await readFile(claimJson, "utf-8"));
    const knownValues: string[] = json.defs.main.record.properties.type.knownValues;

    for (const provider of getAllProviders()) {
      expect(knownValues, `service provider "${provider.id}" is missing from claim.json knownValues`).toContain(provider.id);
    }
  });
});
