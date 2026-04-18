#!/usr/bin/env -S node --experimental-strip-types

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertAnalysisMode, collectGitMeta } from "./git-meta.ts";

type StatusLike = {
  skill?: string;
  scope?: string;
  runId?: string;
  status?: string;
  analysisMode?: string;
  baseRef?: string;
  headCommitSha?: string;
  generatedAt?: string;
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

function slugify(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function nowRunStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function readJson(filePath: string): StatusLike | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as StatusLike;
  } catch {
    return null;
  }
}

function findCandidateStatusFiles(scopeDir: string): string[] {
  try {
    return readdirSync(scopeDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(scopeDir, entry.name, "status"))
      .filter((statusDir) => {
        try {
          return statSync(statusDir).isDirectory();
        } catch {
          return false;
        }
      })
      .flatMap((statusDir) => [
        path.join(statusDir, "review-build.json"),
        path.join(statusDir, "analyze-changes.json"),
      ])
      .filter((filePath) => existsSync(filePath));
  } catch {
    return [];
  }
}

function newestFirst(paths: string[]): string[] {
  return [...paths].sort((left, right) => {
    const leftTime = statSync(left).mtimeMs;
    const rightTime = statSync(right).mtimeMs;
    return rightTime - leftTime;
  });
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  const args = parseArgs(process.argv.slice(2));
  const scope = args.scope as string | undefined;

  if (!scope) {
    throw new Error("Missing required flag: --scope=<scope>");
  }

  const mode = assertAnalysisMode(args.mode ?? "committed");
  const baseRef = args["base-ref"] as string | undefined;
  const ensure = Boolean(args.ensure);
  const forceNewRun = Boolean(args["new-run"]);
  const repoRoot = process.cwd();
  const meta = collectGitMeta({ mode, baseRef });
  const scopeDir = path.join(repoRoot, "docs", "reviews", scope);

  let reusable: StatusLike | null = null;
  let requiresDecision = false;

  if (!forceNewRun) {
    const candidateFiles = newestFirst(findCandidateStatusFiles(scopeDir));
    for (const candidateFile of candidateFiles) {
      const candidate = readJson(candidateFile);
      if (!candidate) continue;

      const sameRun =
        candidate.scope === scope &&
        candidate.analysisMode === meta.analysisMode &&
        candidate.baseRef === meta.baseRef &&
        candidate.headCommitSha === meta.headCommitSha;

      if (!sameRun || !candidate.runId) continue;

      reusable = candidate;
      requiresDecision =
        candidate.status === "BLOCKED" || candidate.status === "NEEDS_CONTEXT";
      break;
    }
  }

  const shortHead = meta.headCommitSha.slice(0, 7);
  const resolvedRunId =
    reusable?.runId ||
    `${nowRunStamp()}-${meta.analysisMode}-${slugify(meta.baseRef)}-${shortHead}`;
  const reviewDir = path.join(scopeDir, resolvedRunId);
  const statusDir = path.join(reviewDir, "status");

  if (ensure) {
    mkdirSync(statusDir, { recursive: true });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        scope,
        runId: resolvedRunId,
        reused: Boolean(reusable),
        requiresDecision,
        reviewDir,
        statusDir,
        meta,
      },
      null,
      2,
    )}\n`,
  );
}
