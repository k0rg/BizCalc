#!/usr/bin/env node
/**
 * BizCalc CLI
 *
 * Usage:
 *   node dist/cli parse <url> [options]
 *   node dist/cli naics --export-aliases [output.json]
 *   node dist/cli snapshots list
 *   node dist/cli snapshots purge
 *
 * Options:
 *   --snapshot        Store HTML snapshot (subject to sampling rate)
 *   --snapshot-dir    Directory for snapshots (default: ./snapshots)
 *   --no-us-filter    Disable US-only location filter
 *   --pretty          Pretty-print JSON output (default: true)
 *
 * Examples:
 *   node dist/cli parse https://www.bizbuysell.com/business-opportunity/foo/2238047/
 *   node dist/cli parse https://www.bizquest.com/business-for-sale/foo/BW2402686/ --snapshot
 *   node dist/cli naics --export-aliases data/naics/aliases.json
 */

import { getAdapter } from "./adapters";
import { isUSLocation } from "./adapters/utils";
import { lookupNaicsCode } from "./naics";
import { SnapshotStorage } from "./snapshot";

function printUsage(): void {
  console.log(`BizCalc CLI

COMMANDS:
  parse <url> [options]   Parse a listing URL and output normalized JSON
  naics [options]         NAICS alias table management
  snapshots <subcommand>  Manage HTML snapshots

OPTIONS for parse:
  --snapshot              Store HTML snapshot (subject to 10% sampling rate)
  --snapshot-dir <dir>    Snapshot storage directory (default: ./snapshots)
  --no-us-filter          Allow non-US listings (default: US-only)
  --pretty                Pretty-print JSON output (default: true)
  --compact               Compact JSON output

OPTIONS for naics:
  --export-aliases [file] Export alias table to JSON

SUBCOMMANDS for snapshots:
  list                    List stored snapshots
  purge                   Delete all stored snapshots

EXAMPLES:
  node dist/cli parse https://www.bizbuysell.com/business-opportunity/foo/2238047/
  node dist/cli parse https://www.bizquest.com/business-for-sale/foo/BW2402686/ --snapshot
  node dist/cli naics --export-aliases
  node dist/cli snapshots list
`);
}

async function commandParse(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help") {
    printUsage();
    return;
  }

  const url = args[0];
  const useSnapshot = args.includes("--snapshot");
  const noUsFilter = args.includes("--no-us-filter");
  const compact = args.includes("--compact");

  const snapshotDirIdx = args.indexOf("--snapshot-dir");
  const snapshotDir = snapshotDirIdx >= 0 ? args[snapshotDirIdx + 1] : undefined;

  const adapter = getAdapter(url);
  if (!adapter) {
    console.error(`No adapter found for URL: ${url}`);
    console.error("Supported sources: bizbuysell.com, bizquest.com, businessbroker.net");
    process.exit(1);
  }

  const snapshot = useSnapshot
    ? new SnapshotStorage(snapshotDir ? { storageDir: snapshotDir } : {})
    : null;

  let html: string;
  try {
    process.stderr.write(`Fetching ${url} ...\n`);
    html = await adapter.fetch(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Fetch error: ${msg}`);
    process.exit(1);
  }

  let listing;
  let parseError: Error | undefined;
  try {
    listing = adapter.parse(html, url);
  } catch (err) {
    parseError = err instanceof Error ? err : new Error(String(err));
    console.error(`Parse error: ${parseError.message}`);
  }

  // Store snapshot on failure or based on sampling rate
  if (snapshot) {
    const reason = parseError ? "failure" : "sampled";
    if (snapshot.shouldStore(reason)) {
      const key = snapshot.store(url, html, reason);
      if (key) {
        process.stderr.write(`Snapshot stored: ${key} (reason: ${reason})\n`);
      }
    }
  } else if (parseError) {
    // Always try to store on parse failure even if --snapshot not explicitly passed
    const autoSnapshot = new SnapshotStorage(snapshotDir ? { storageDir: snapshotDir } : {});
    autoSnapshot.store(url, html, "failure");
    process.stderr.write(`Parse failed - snapshot stored for debugging\n`);
  }

  if (parseError) {
    process.exit(1);
  }

  // US-only filter
  if (!noUsFilter && listing) {
    const isUS = isUSLocation(listing.location);
    if (isUS === false) {
      console.error(
        `Rejected: listing location "${listing.location}" does not appear to be in the US.`
      );
      console.error("Use --no-us-filter to disable this check.");
      process.exit(1);
    }
    if (isUS === undefined && listing.location) {
      process.stderr.write(
        `Warning: could not determine if location "${listing.location}" is US. Proceeding.\n`
      );
    }
  }

  // Enrich with NAICS code if industry text is available
  if (listing && listing.industry_text && !listing.naics_code) {
    const naicsMatch = lookupNaicsCode(listing.industry_text);
    if (naicsMatch) {
      listing.naics_code = naicsMatch.naics_code;
    }
  }

  const output = compact
    ? JSON.stringify(listing)
    : JSON.stringify(listing, null, 2);

  console.log(output);
}

async function commandNaics(args: string[]): Promise<void> {
  const { runImportPipeline } = await import("./naics/import");
  await runImportPipeline(args);
}

async function commandSnapshots(args: string[]): Promise<void> {
  const subcommand = args[0];
  const snapshotDirIdx = args.indexOf("--snapshot-dir");
  const snapshotDir = snapshotDirIdx >= 0 ? args[snapshotDirIdx + 1] : undefined;

  const storage = new SnapshotStorage(snapshotDir ? { storageDir: snapshotDir } : {});

  if (subcommand === "list") {
    const entries = storage.list();
    if (entries.length === 0) {
      console.log("No snapshots stored.");
      return;
    }
    console.log(`${entries.length} snapshot(s):`);
    for (const entry of entries) {
      console.log(
        `  ${entry.url} | ${entry.reason} | ${entry.storedAt} | ${(entry.sizeBytes / 1024).toFixed(1)}KB`
      );
    }
  } else if (subcommand === "purge") {
    storage.purge();
    console.log("All snapshots purged.");
  } else {
    console.error(`Unknown snapshots subcommand: ${subcommand}`);
    console.error("Available: list, purge");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    return;
  }

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case "parse":
      await commandParse(rest);
      break;
    case "naics":
      await commandNaics(rest);
      break;
    case "snapshots":
      await commandSnapshots(rest);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
