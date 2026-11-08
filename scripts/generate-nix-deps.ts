import assert from "node:assert/strict";
import { posix } from "node:path";
import { z } from "zod";

const lockSchema = z.object({
  packages: z.record(z.string(), z.tuple([
    z.string().regex(/^(?:@[\w.-]+\/)?[\w.-]+@[\w.+-]+$/),
    z.literal(""),
    z.object({ os: z.string().optional(), cpu: z.string().optional() }),
    z.string().regex(/^sha512-[a-zA-Z0-9+/]+={0,2}$/),
  ])),
});
const lockText = await Bun.file(new URL("../bun.lock", import.meta.url)).text();
const lock = lockSchema.parse(Bun.JSONC.parse(lockText));
const packages = Object.fromEntries(Object.entries(lock.packages).map(([key, entry]) => {
  const [resolved, , metadata, hash] = entry;
  const names = key.match(/@[^/]+\/[^/]+|[^/]+/g);
  assert(names && names.join("/") === key);
  assert(names.every((name) => /^(@[\w-][\w.-]*\/)?[\w-][\w.-]*$/.test(name)));
  const at = resolved.lastIndexOf("@");
  const name = resolved.slice(0, at);
  const version = resolved.slice(at + 1);
  return [names.join("/node_modules/"), {
    url: `https://registry.npmjs.org/${name}/-/${posix.basename(name)}-${version}.tgz`,
    hash,
    os: metadata.os,
    cpu: metadata.cpu,
  }];
}));
const output = `${JSON.stringify({
  lockHash: new Bun.CryptoHasher("sha256").update(lockText).digest("hex"),
  packages,
}, null, 2)}\n`;
const target = new URL("../nix-deps.json", import.meta.url);
if (Bun.argv.includes("--check")) {
  assert(await Bun.file(target).exists() && await Bun.file(target).text() === output,
    "Nix dependency manifest is stale; run bun run nix:deps.");
} else {
  await Bun.write(target, output);
}
