import { Lexicons } from "@atproto/lexicon";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../lexicons/dev/keytrace");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

const lex = new Lexicons();
let ok = true;

for (const f of files) {
  const filePath = join(dir, f);
  let doc;
  try {
    doc = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error(`✗ ${f}: invalid JSON — ${e.message}`);
    ok = false;
    continue;
  }

  try {
    lex.add(doc);
    console.log(`✓ ${doc.id}`);
  } catch (e) {
    console.error(`✗ ${f}: ${e.message}`);
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}
console.log(`\n${files.length} lexicons valid`);
