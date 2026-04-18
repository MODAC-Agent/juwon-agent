#!/usr/bin/env -S node --experimental-strip-types

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type AnalysisMode = "committed" | "staged" | "working-tree";

export const ANALYSIS_MODES: readonly AnalysisMode[] = [
  "committed",
  "staged",
  "working-tree",
] as const;

export function assertAnalysisMode(value: unknown): AnalysisMode {
  if (typeof value === "string" && (ANALYSIS_MODES as readonly string[]).includes(value)) {
    return value as AnalysisMode;
  }
  throw new Error(
    `Invalid analysis mode: ${JSON.stringify(value)}. Expected one of: ${ANALYSIS_MODES.join(", ")}`,
  );
}

type GitMetaOptions = {
  mode: AnalysisMode;
  baseRef?: string;
};

export type GitMeta = {
  analysisMode: AnalysisMode;
  baseRef: string;
  currentBranch: string;
  baseCommitSha: string;
  headCommitSha: string;
  mergeBaseSha: string | null;
  diffRange: string;
  diffArgs: string[];
  dirty: boolean;
};

const BASE_CANDIDATES = ["main", "master", "develop", "dev"];

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

export function execGit(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function safeExecGit(args: string[]): string | null {
  try {
    return execGit(args);
  } catch {
    return null;
  }
}

function hasRef(ref: string): boolean {
  return safeExecGit(["rev-parse", "--verify", ref]) !== null;
}

export function inferBaseRef(): string {
  for (const candidate of BASE_CANDIDATES) {
    if (hasRef(candidate) || hasRef(`origin/${candidate}`)) {
      return hasRef(candidate) ? candidate : `origin/${candidate}`;
    }
  }

  throw new Error(
    `Unable to infer base ref. Checked: ${BASE_CANDIDATES.join(", ")}.`,
  );
}

export function collectGitMeta(options: GitMetaOptions): GitMeta {
  const analysisMode = options.mode;
  const currentBranch =
    safeExecGit(["branch", "--show-current"]) || safeExecGit(["rev-parse", "--short", "HEAD"]) || "HEAD";
  const headCommitSha = execGit(["rev-parse", "HEAD"]);
  const baseRef = options.baseRef || inferBaseRef();
  const dirty = execGit(["status", "--porcelain"]).length > 0;

  if (analysisMode === "committed") {
    const mergeBaseSha = execGit(["merge-base", baseRef, "HEAD"]);
    return {
      analysisMode,
      baseRef,
      currentBranch,
      baseCommitSha: mergeBaseSha,
      headCommitSha,
      mergeBaseSha,
      diffRange: `${mergeBaseSha}..HEAD`,
      diffArgs: ["diff", `${mergeBaseSha}..HEAD`],
      dirty,
    };
  }

  if (analysisMode === "staged") {
    return {
      analysisMode,
      baseRef,
      currentBranch,
      baseCommitSha: execGit(["rev-parse", "HEAD"]),
      headCommitSha,
      mergeBaseSha: null,
      diffRange: "--cached",
      diffArgs: ["diff", "--cached"],
      dirty,
    };
  }

  return {
    analysisMode,
    baseRef,
    currentBranch,
    baseCommitSha: execGit(["rev-parse", "HEAD"]),
    headCommitSha,
    mergeBaseSha: null,
    diffRange: "working-tree",
    diffArgs: ["diff"],
    dirty,
  };
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  const args = parseArgs(process.argv.slice(2));
  const mode = assertAnalysisMode(args.mode ?? "committed");
  const baseRef = args["base-ref"] as string | undefined;

  const payload = collectGitMeta({ mode, baseRef });
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
