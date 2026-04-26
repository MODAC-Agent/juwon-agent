#!/usr/bin/env -S node --experimental-strip-types

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertAnalysisMode, collectGitMeta, type AnalysisMode } from "./git-meta.ts";

const DEFAULT_MAX_AGE_HOURS = 24;
const SUPPORTED_SCHEMA_VERSION = "1.0";

type StatusFile = {
  schemaVersion?: string;
  skill?: string;
  status?: string;
  analysisMode?: AnalysisMode;
  baseRef?: string;
  baseCommitSha?: string;
  headCommitSha?: string;
  generatedAt?: string;
  concerns?: string[];
};

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

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  const args = parseArgs(process.argv.slice(2));
  const filePath = args.file as string | undefined;
  const maxAgeArg = args["max-age-hours"];
  const maxAgeHours =
    typeof maxAgeArg === "string" && !Number.isNaN(Number(maxAgeArg))
      ? Number(maxAgeArg)
      : DEFAULT_MAX_AGE_HOURS;

  if (!filePath) {
    throw new Error("Missing required flag: --file=<status-file>");
  }

  if (!existsSync(filePath)) {
    process.stdout.write(`${JSON.stringify({ exists: false, stale: false }, null, 2)}\n`);
    process.exit(0);
  }

  const data = JSON.parse(readFileSync(filePath, "utf8")) as StatusFile;
  const mode: AnalysisMode = assertAnalysisMode(data.analysisMode ?? "committed");
  const baseRef = data.baseRef;
  const current = collectGitMeta({ mode, baseRef });
  const reasons: string[] = [];
  const softReasons: string[] = [];

  if (data.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    reasons.push(
      `status schema version unsupported: stored=${data.schemaVersion ?? "missing"} supported=${SUPPORTED_SCHEMA_VERSION}`,
    );
  }

  if (data.analysisMode !== current.analysisMode) {
    reasons.push(
      `analysis mode changed: stored=${data.analysisMode} current=${current.analysisMode}`,
    );
  }

  if (data.baseCommitSha && data.baseCommitSha !== current.baseCommitSha) {
    reasons.push(
      `base commit changed: stored=${data.baseCommitSha} current=${current.baseCommitSha}`,
    );
  }

  if (data.headCommitSha && data.headCommitSha !== current.headCommitSha) {
    reasons.push(
      `head commit changed: stored=${data.headCommitSha} current=${current.headCommitSha}`,
    );
  }

  let ageHours: number | null = null;
  if (data.generatedAt) {
    const generatedMs = Date.parse(data.generatedAt);
    if (!Number.isNaN(generatedMs)) {
      ageHours = (Date.now() - generatedMs) / (1000 * 60 * 60);
      if (ageHours > maxAgeHours) {
        softReasons.push(
          `status is ${ageHours.toFixed(1)}h old (threshold=${maxAgeHours}h); confirm before reuse`,
        );
      }
    }
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        exists: true,
        stale: reasons.length > 0,
        softStale: softReasons.length > 0,
        reasons,
        softReasons,
        ageHours,
        data,
      },
      null,
      2,
    )}\n`,
  );
}
