/**
 * NAICS Import Pipeline Skeleton
 *
 * This module provides a skeleton for importing the official Census NAICS 2022
 * structure into the alias table.
 *
 * Data source: https://www.census.gov/naics/
 *
 * TODO: Implement full import by:
 * 1. Download NAICS 2022 structure file (Excel or CSV) from Census:
 *    https://www.census.gov/naics/?input=data+base&year=2022
 * 2. Parse the Excel file using 'xlsx' npm package
 * 3. Insert/upsert into naics_codes table (database or JSON file)
 * 4. Run keyword-matching to auto-generate aliases with confidence="auto"
 * 5. Human-review auto-generated aliases and promote to confidence="manual"
 *
 * Usage (once implemented):
 *   node dist/naics/import path/to/2022_NAICS_Structure.xlsx
 */

import * as fs from "fs";
import * as path from "path";
import { NaicsCode, NAICS_ALIASES } from "./aliases";

/**
 * Exports the current alias table to a JSON file for review or database seeding.
 */
export function exportAliasesToJson(outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(NAICS_ALIASES, null, 2), "utf8");
  console.log(`Exported ${NAICS_ALIASES.length} aliases to ${outputPath}`);
}

/**
 * Parses a simple CSV with columns: naics_code, title, parent_code
 * Returns an array of NaicsCode objects.
 *
 * TODO: Replace with xlsx parsing once Census structure file is downloaded.
 */
export function parseNaicsCsv(csvContent: string): NaicsCode[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, "").toLowerCase());
  const codeIdx = header.indexOf("naics_code");
  const titleIdx = header.indexOf("title");
  const parentIdx = header.indexOf("parent_code");

  if (codeIdx < 0 || titleIdx < 0) {
    throw new Error("CSV must have naics_code and title columns");
  }

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      const code = cols[codeIdx];
      const level = inferLevel(code);
      return {
        naics_code: code,
        title: cols[titleIdx],
        level,
        parent_code: parentIdx >= 0 && cols[parentIdx] ? cols[parentIdx] : undefined,
        source: "Census NAICS 2022" as const,
      };
    });
}

function inferLevel(code: string): NaicsCode["level"] {
  const len = code.replace(/[^0-9]/g, "").length;
  if (len <= 2) return "sector";
  if (len === 3) return "subsector";
  if (len === 4) return "industry_group";
  if (len === 5) return "industry";
  return "national_industry";
}

/**
 * Pipeline entry point (CLI usage):
 *   node dist/naics/import [--export-aliases output.json] [naics.csv]
 */
export async function runImportPipeline(args: string[]): Promise<void> {
  const exportIdx = args.indexOf("--export-aliases");
  if (exportIdx >= 0) {
    const outputPath = args[exportIdx + 1] || path.join(process.cwd(), "data", "naics", "aliases.json");
    exportAliasesToJson(outputPath);
    return;
  }

  const csvPath = args[0];
  if (!csvPath) {
    console.log("Usage: node dist/naics/import [--export-aliases output.json] [naics.csv]");
    console.log("");
    console.log("TODO: Download Census NAICS 2022 structure file and provide path.");
    console.log("Source: https://www.census.gov/naics/?input=data+base&year=2022");
    return;
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, "utf8");
  const codes = parseNaicsCsv(csv);
  console.log(`Parsed ${codes.length} NAICS codes from ${csvPath}`);

  const outputPath = path.join(process.cwd(), "data", "naics", "naics_codes.json");
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(codes, null, 2), "utf8");
  console.log(`Saved to ${outputPath}`);
}
