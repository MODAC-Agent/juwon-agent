#!/usr/bin/env -S node --experimental-strip-types

import { readFileSync } from "node:fs";
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

function lookup(value: unknown, segments: string[]): unknown {
  let cursor: unknown = value;
  for (const segment of segments) {
    if (cursor == null) return undefined;
    if (typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  const args = parseArgs(process.argv.slice(2));
  const pathExpr = args.path as string | undefined;
  const file = args.file as string | undefined;
  const fallback = args.default as string | undefined;

  if (!pathExpr) {
    throw new Error("Missing required flag: --path=<dotted.path>");
  }

  const raw = file !== undefined ? readFileSync(file, "utf8") : await readFromStdin();
  if (!raw.trim()) {
    if (fallback !== undefined) {
      process.stdout.write(fallback);
      process.exit(0);
    }
    throw new Error("No JSON payload provided on stdin or via --file.");
  }

  const parsed = JSON.parse(raw);
  const segments = pathExpr.split(".");
  const value = lookup(parsed, segments);

  if (value === undefined || value === null) {
    if (fallback !== undefined) {
      process.stdout.write(fallback);
      process.exit(0);
    }
    process.exit(1);
  }

  const output = typeof value === "string" ? value : JSON.stringify(value);
  process.stdout.write(output);
}
