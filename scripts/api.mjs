// mizuchi HTTP contract: vendored schema and generated types.
//   node scripts/api.mjs sync <mizuchi-commit>  download crates/mizuchi/schemas/query-api-v1.json at that commit
//   node scripts/api.mjs gen                   write src/api/mizuchi.gen.ts from the vendored schema
//   node scripts/api.mjs check                 fail when src/api/mizuchi.gen.ts is stale
import { readFile, writeFile } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";

const SCHEMA = "api/mizuchi-http-v1.schema.json";
const REMOTE_SCHEMA = "crates/mizuchi/schemas/query-api-v1.json";
const REF = "api/MIZUCHI_REF";
const OUT = "src/api/mizuchi.gen.ts";

const contractId = (doc) => {
  const fromHealth = doc.$defs?.Health?.properties?.contract?.const;
  return typeof fromHealth === "string" ? fromHealth : doc.$id;
};

const generate = async () => {
  const doc = JSON.parse(await readFile(SCHEMA, "utf8"));
  const ref = (await readFile(REF, "utf8")).trim();
  const names = Object.keys(doc.$defs).toSorted();
  const contract = contractId(doc);
  // Wrap every $def so each becomes an exported type.
  const wrapper = {
    title: "MizuchiHttpV1",
    type: "object",
    properties: Object.fromEntries(names.map((name) => [name, { $ref: `#/$defs/${name}` }])),
    additionalProperties: false,
    $defs: doc.$defs,
  };
  const ts = await compile(wrapper, "MizuchiHttpV1", {
    bannerComment: `// Generated from Sannrox/mizuchi ${REMOTE_SCHEMA} at ${ref} (contract ${contract}).\n// Do not edit: run \`pnpm api:gen\`.`,
    additionalProperties: false,
    declareExternallyReferenced: true,
    unreachableDefinitions: true,
    format: false,
  });
  return `${ts}\nexport const MIZUCHI_CONTRACT = ${JSON.stringify(contract)};\n`;
};

const [command, arg] = process.argv.slice(2);
if (command === "sync") {
  if (!/^[0-9a-f]{40}$/.test(arg ?? "")) {
    throw new Error("sync needs a full 40-character mizuchi commit SHA");
  }
  const url = `https://raw.githubusercontent.com/Sannrox/mizuchi/${arg}/${REMOTE_SCHEMA}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  await writeFile(SCHEMA, await response.text());
  await writeFile(REF, `${arg}\n`);
  await writeFile(OUT, await generate());
} else if (command === "gen") {
  await writeFile(OUT, await generate());
} else if (command === "check") {
  if ((await readFile(OUT, "utf8")) !== (await generate())) {
    console.error(`${OUT} is stale; run \`pnpm api:gen\``);
    process.exit(1);
  }
} else {
  throw new Error("usage: api.mjs sync <sha> | gen | check");
}
