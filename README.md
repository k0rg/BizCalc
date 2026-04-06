# BizCalc

A Node/TypeScript toolkit for parsing business-for-sale listings from major US marketplaces and computing normalized financial metrics.

## Features

- **Adapters** for BizBuySell, BizQuest, and BusinessBroker.net
- **Normalized listing schema** (`ListingNormalized`) across all sources
- **Shared utilities** for money parsing, text cleaning, US location detection, and label extraction
- **HTML snapshot storage** with TTL, size cap, deduplication, and base64 stripping
- **CLI** to parse any listing URL and output normalized JSON
- **NAICS alias table** with 60+ pre-mapped marketplace categories and an import pipeline skeleton

## Requirements

- Node.js 18+
- npm 8+

## Setup

```bash
npm install
npm run build
```

## CLI Usage

### Parse a listing URL

```bash
node dist/cli parse <url> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--snapshot` | Store HTML snapshot (subject to 10% sampling rate) | off |
| `--snapshot-dir <dir>` | Directory for snapshots | `./snapshots` |
| `--no-us-filter` | Allow non-US listings | US-only |
| `--compact` | Compact JSON output | pretty |

**Examples:**

```bash
# Parse a BizBuySell listing
node dist/cli parse https://www.bizbuysell.com/business-opportunity/restoration-and-finishing-services/2238047/

# Parse a BizQuest listing with snapshot storage
node dist/cli parse https://www.bizquest.com/business-for-sale/dynamic-market-leading-company-grading-utility-paving/BW2402686/ --snapshot

# Parse a BusinessBroker.net listing, compact output
node dist/cli parse https://www.businessbroker.net/business-for-sale/stone-countertop-fabrication-1m-plus-ebitda-north-carolina/1007659.aspx --compact
```

**Example output:**

```json
{
  "source": "bizbuysell",
  "listing_url": "https://www.bizbuysell.com/...",
  "source_listing_id": "2238047",
  "title": "Restoration and Finishing Services",
  "location": "Charlotte, NC",
  "industry_text": "Restoration Services",
  "naics_code": "238910",
  "asking_price": 450000,
  "revenue": 800000,
  "cash_flow": 120000,
  "cash_flow_type": "SDE",
  "inventory": 25000,
  "employees": 8,
  "established_year": 2005,
  "real_estate_included": false,
  "reason_for_sale": "Retirement",
  "description": "Well-established restoration business..."
}
```

### NAICS alias management

```bash
# Export alias table to JSON
node dist/cli naics --export-aliases
node dist/cli naics --export-aliases data/naics/aliases.json

# Run import pipeline with a CSV file (see TODO in src/naics/import.ts)
node dist/cli naics data/naics/naics2022.csv
```

### Snapshot management

```bash
# List stored snapshots
node dist/cli snapshots list

# Purge all snapshots
node dist/cli snapshots purge
```

## Supported Sources

| Source | URL Pattern | Listing ID Format |
|--------|-------------|-------------------|
| BizBuySell | `bizbuysell.com/.../<id>/` | numeric (e.g. `2238047`) |
| BizQuest | `bizquest.com/.../<id>/` | `BW` + digits (e.g. `BW2402686`) |
| BusinessBroker.net | `businessbroker.net/.../<id>.aspx` | numeric (e.g. `1007659`) |

## US-Only Filtering

The CLI rejects non-US listings by default. Pass `--no-us-filter` to disable.

The `isUSLocation()` utility in `src/adapters/utils.ts` detects US state names and abbreviations, and rejects known non-US countries.

## HTML Snapshot Storage

Snapshots are stored safely with these limits (configurable via `SnapshotConfig`):

| Setting | Default | Description |
|---------|---------|-------------|
| `ttlMs` | 14 days | Snapshots older than this are evicted |
| `maxSizeBytes` | 2 MB | Snapshots larger than this are rejected |
| `samplingRate` | 10% | Fraction of normal runs that store a snapshot |
| `storeOnFailure` | `true` | Always store on parse failure |

Large inline base64 blocks are stripped before storage.

## Project Structure

```
src/
  adapters/
    types.ts          - ListingNormalized, ListingAdapter interfaces
    utils.ts          - parseMoney, cleanText, isUSLocation, extractLabelValue, etc.
    bizbuysell.ts     - BizBuySell adapter
    bizquest.ts       - BizQuest adapter
    businessbroker.ts - BusinessBroker.net adapter
    index.ts          - Adapter registry (getAdapter)
    utils.test.ts     - Unit tests for utilities
    adapters.test.ts  - Unit tests for adapters (mock HTML)
  snapshot/
    index.ts          - SnapshotStorage class
    index.test.ts     - Unit tests for snapshot storage
  naics/
    aliases.ts        - NAICS_ALIASES table (60+ entries) + lookupNaicsCode()
    import.ts         - Import pipeline skeleton + exportAliasesToJson()
    index.ts          - Re-exports
  cli.ts              - CLI entry point
data/
  naics/              - NAICS data files (created by import pipeline)
  benchmarks/         - Benchmark data files (TODO)
snapshots/            - HTML snapshots (runtime, gitignored)
dist/                 - Compiled output (gitignored)
```

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Watch mode
npm run build:watch
```

## NAICS Mapping

The `src/naics/aliases.ts` file contains a first-pass alias table mapping 60+ common marketplace listing categories to NAICS 2022 codes.

To expand with the full Census NAICS 2022 structure:
1. Download the NAICS 2022 structure file from https://www.census.gov/naics/
2. Convert to CSV with columns: `naics_code`, `title`, `parent_code`
3. Run: `node dist/cli naics data/naics/naics2022.csv`

## Benchmark Ingestion Pipeline (TODO)

Planned data sources:
- **BizBuySell Insight Report** – industry-level price/cash flow multiples
- **IRS SOI Business Tax Statistics** – margins by industry
- **Census County Business Patterns (CBP)** – scale and employment context

See `data/benchmarks/` for planned output schema.

## License

ISC
