#!/usr/bin/env -S node --experimental-strip-types

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COVERAGE_EVIDENCE = ["line-diff", "file-summary", "not-available"] as const;
const STATUS_VALUES = ["DONE", "DONE_WITH_CONCERNS", "BLOCKED", "NEEDS_CONTEXT"] as const;

type JsonObject = Record<string, unknown>;

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

function readJson(filePath: string): JsonObject {
  if (!existsSync(filePath)) {
    throw new Error(`Missing contract file: ${filePath}`);
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  if (!isObject(parsed)) {
    throw new Error(`Expected JSON object: ${filePath}`);
  }

  return parsed;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function requireString(data: JsonObject, key: string, label: string) {
  if (typeof data[key] !== "string" || data[key] === "") {
    throw new Error(`${label}.${key} must be a non-empty string`);
  }
}

function requireArray(data: JsonObject, key: string, label: string) {
  if (!Array.isArray(data[key])) {
    throw new Error(`${label}.${key} must be an array`);
  }
}

function validateStatus(data: JsonObject, label: string) {
  requireString(data, "skill", label);
  requireString(data, "phase", label);
  requireString(data, "scope", label);
  requireString(data, "runId", label);

  if (!STATUS_VALUES.includes(data.status as (typeof STATUS_VALUES)[number])) {
    throw new Error(`${label}.status must be one of: ${STATUS_VALUES.join(", ")}`);
  }
}

function validateChangeSummary(data: JsonObject) {
  for (const key of ["scope", "runId", "analysisMode", "baseRef", "baseCommitSha", "headCommitSha"]) {
    requireString(data, key, "change-summary");
  }

  requireArray(data, "changedFiles", "change-summary");
  requireArray(data, "riskAreas", "change-summary");
  requireArray(data, "testTargets", "change-summary");

  if (!isStringArray(data.unknowns)) {
    throw new Error("change-summary.unknowns must be a string array");
  }

  const ids = new Set<string>();
  for (const [index, target] of (data.testTargets as unknown[]).entries()) {
    if (!isObject(target)) {
      throw new Error(`change-summary.testTargets[${index}] must be an object`);
    }
    requireString(target, "id", `change-summary.testTargets[${index}]`);
    requireString(target, "path", `change-summary.testTargets[${index}]`);
    if (ids.has(target.id as string)) {
      throw new Error(`Duplicate test target id: ${target.id}`);
    }
    ids.add(target.id as string);
  }
}

function validateReviewReport(review: JsonObject, summary?: JsonObject) {
  requireString(review, "scope", "review-report");
  requireString(review, "runId", "review-report");
  requireArray(review, "findings", "review-report");
  requireArray(review, "testGaps", "review-report");

  if (!isStringArray(review.risksForPr)) {
    throw new Error("review-report.risksForPr must be a string array");
  }
  if (!isStringArray(review.unknowns)) {
    throw new Error("review-report.unknowns must be a string array");
  }

  const targetIds = new Set<string>();
  if (summary) {
    validateChangeSummary(summary);
    for (const target of summary.testTargets as JsonObject[]) {
      targetIds.add(target.id as string);
    }
  }

  const gapIds = new Set<string>();
  for (const [index, gap] of (review.testGaps as unknown[]).entries()) {
    if (!isObject(gap)) {
      throw new Error(`review-report.testGaps[${index}] must be an object`);
    }
    requireString(gap, "id", `review-report.testGaps[${index}]`);
    requireString(gap, "targetPath", `review-report.testGaps[${index}]`);
    requireString(gap, "reason", `review-report.testGaps[${index}]`);
    if (!["required", "optional"].includes(gap.priority as string)) {
      throw new Error(`review-report.testGaps[${index}].priority must be required or optional`);
    }
    if (gapIds.has(gap.id as string)) {
      throw new Error(`Duplicate test gap id: ${gap.id}`);
    }
    gapIds.add(gap.id as string);
    if (summary && !targetIds.has(gap.id as string)) {
      throw new Error(`review-report.testGaps id has no matching change-summary.testTargets id: ${gap.id}`);
    }
  }
}

function validateCoverageReport(data: JsonObject) {
  requireString(data, "scope", "coverage-report");
  requireString(data, "runId", "coverage-report");
  requireString(data, "testCommand", "coverage-report");

  if (!["passed", "failed", "not-run"].includes(data.testStatus as string)) {
    throw new Error("coverage-report.testStatus must be passed, failed, or not-run");
  }
  if (!COVERAGE_EVIDENCE.includes(data.coverageEvidence as (typeof COVERAGE_EVIDENCE)[number])) {
    throw new Error(`coverage-report.coverageEvidence must be one of: ${COVERAGE_EVIDENCE.join(", ")}`);
  }
  if (!isObject(data.coverageSummary)) {
    throw new Error("coverage-report.coverageSummary must be an object");
  }
  requireArray(data, "exceptions", "coverage-report");
  requireArray(data, "unknowns", "coverage-report");
}

function validatePrDraft(data: JsonObject) {
  for (const key of ["scope", "runId", "baseRef", "title", "templateSource", "body"]) {
    requireString(data, key, "pr-draft");
  }
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  const args = parseArgs(process.argv.slice(2));
  const phase = args.phase as string | undefined;
  const reviewDir = args["review-dir"] as string | undefined;
  const file = args.file as string | undefined;

  if (!phase) {
    throw new Error("Missing required flag: --phase=<phase>");
  }

  const fromReviewDir = (filename: string) => {
    if (!reviewDir) {
      throw new Error("Missing required flag: --review-dir=<dir>");
    }
    return path.join(reviewDir, filename);
  };

  if (phase === "analyze-changes") {
    validateChangeSummary(readJson(file ?? fromReviewDir("change-summary.json")));
  } else if (phase === "code-review") {
    const review = readJson(file ?? fromReviewDir("review-report.json"));
    const summaryPath = reviewDir ? fromReviewDir("change-summary.json") : undefined;
    validateReviewReport(review, summaryPath ? readJson(summaryPath) : undefined);
  } else if (phase === "test-unit") {
    validateCoverageReport(readJson(file ?? fromReviewDir("coverage-report.json")));
  } else if (phase === "review-pr-draft") {
    validatePrDraft(readJson(file ?? fromReviewDir("pr-draft.json")));
  } else if (phase === "status") {
    validateStatus(readJson(file ?? fromReviewDir("status/review-build.json")), "status");
  } else {
    throw new Error(
      `Unsupported phase: ${phase}. Expected analyze-changes, code-review, test-unit, review-pr-draft, or status.`,
    );
  }

  process.stdout.write(`${JSON.stringify({ ok: true, phase }, null, 2)}\n`);
}
