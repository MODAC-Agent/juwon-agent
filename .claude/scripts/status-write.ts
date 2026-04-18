#!/usr/bin/env -S node --experimental-strip-types

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv: string[]) {
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    if (raw.includes("=")) {
      const [key, value] = raw.slice(2).split("=", 2);
      options[key] = value ?? true;
      continue;
    }

    const key = raw.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return options;
}

async function readFromStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";

  return await new Promise<string>((resolve) => {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => resolve(buffer));
  });
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  const args = parseArgs(process.argv.slice(2));
  const filePath = args.file as string | undefined;
  const payloadFile = args["payload-file"] as string | undefined;

  if (!filePath) {
    throw new Error("Missing required flag: --file=<status-file>");
  }

  const raw = payloadFile !== undefined ? readFileSync(payloadFile, "utf8") : await readFromStdin();

  if (!raw.trim()) {
    throw new Error("No JSON payload provided on stdin or via --payload-file.");
  }

  const parsed = JSON.parse(raw);
  const targetDir = path.dirname(filePath);
  const tempFile = `${filePath}.tmp-${process.pid}`;

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(tempFile, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  renameSync(tempFile, filePath);

  process.stdout.write(`${JSON.stringify({ ok: true, file: filePath }, null, 2)}\n`);
}
