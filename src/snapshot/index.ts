import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface SnapshotConfig {
  /** Directory to store snapshots. Defaults to ./snapshots */
  storageDir: string;
  /** TTL in milliseconds. Defaults to 14 days */
  ttlMs: number;
  /** Maximum snapshot file size in bytes. Defaults to 2MB */
  maxSizeBytes: number;
  /** Fraction of runs to sample (0–1). Defaults to 0.1 (10%) */
  samplingRate: number;
  /** If true, always store on parse failures regardless of sampling rate */
  storeOnFailure: boolean;
}

export const DEFAULT_SNAPSHOT_CONFIG: SnapshotConfig = {
  storageDir: path.join(process.cwd(), "snapshots"),
  ttlMs: 14 * 24 * 60 * 60 * 1000, // 14 days
  maxSizeBytes: 2 * 1024 * 1024, // 2 MB
  samplingRate: 0.1, // 10%
  storeOnFailure: true,
};

export interface SnapshotMetadata {
  url: string;
  contentHash: string;
  storedAt: string; // ISO string
  sizeBytes: number;
  reason: "failure" | "sampled";
}

/**
 * Strips large inline base64 data URIs from HTML to reduce storage size.
 * Replaces data: URIs longer than 1KB with a placeholder.
 */
export function stripBase64Blocks(html: string): string {
  // Match data:image/... or data:application/... base64 blobs longer than ~1KB
  return html.replace(/data:[a-zA-Z0-9+/]+;base64,[A-Za-z0-9+/=]{1024,}/g, "[base64-stripped]");
}

/**
 * Computes a SHA-256 hash of the given content.
 */
export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Sanitizes a URL into a safe filesystem path segment.
 */
function urlToFilename(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200);
}

/**
 * Loads the snapshot index from disk. Returns empty object if not found.
 */
function loadIndex(storageDir: string): Record<string, SnapshotMetadata> {
  const indexPath = path.join(storageDir, "index.json");
  if (!fs.existsSync(indexPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Saves the snapshot index to disk.
 */
function saveIndex(storageDir: string, index: Record<string, SnapshotMetadata>): void {
  const indexPath = path.join(storageDir, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
}

/**
 * Evicts snapshots that have exceeded the configured TTL.
 */
function evictExpired(storageDir: string, config: SnapshotConfig): void {
  const index = loadIndex(storageDir);
  const now = Date.now();
  let changed = false;

  for (const [key, meta] of Object.entries(index)) {
    const age = now - new Date(meta.storedAt).getTime();
    if (age > config.ttlMs) {
      const filePath = path.join(storageDir, key + ".html");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      delete index[key];
      changed = true;
    }
  }

  if (changed) {
    saveIndex(storageDir, index);
  }
}

/**
 * SnapshotStorage provides safe, bounded HTML snapshot storage.
 *
 * Features:
 * - Configurable TTL (default 14 days)
 * - Size cap per snapshot (default 2MB)
 * - Deduplication by URL+hash
 * - Strips large inline base64 blocks
 * - Stores only on parse failures or sampled runs
 * - Automatic eviction of expired snapshots
 */
export class SnapshotStorage {
  private config: SnapshotConfig;

  constructor(config: Partial<SnapshotConfig> = {}) {
    this.config = { ...DEFAULT_SNAPSHOT_CONFIG, ...config };
  }

  /**
   * Determines whether a snapshot should be stored for this run.
   * Always stores on failure if storeOnFailure is enabled.
   * Otherwise, stores based on the sampling rate.
   */
  shouldStore(reason: "failure" | "sampled"): boolean {
    if (reason === "failure" && this.config.storeOnFailure) return true;
    return Math.random() < this.config.samplingRate;
  }

  /**
   * Stores an HTML snapshot for the given URL.
   * Returns the snapshot key if stored, or undefined if skipped.
   */
  store(
    url: string,
    html: string,
    reason: "failure" | "sampled"
  ): string | undefined {
    // Ensure storage directory exists
    if (!fs.existsSync(this.config.storageDir)) {
      fs.mkdirSync(this.config.storageDir, { recursive: true });
    }

    // Evict expired snapshots before storing new ones
    evictExpired(this.config.storageDir, this.config);

    // Strip base64 blobs
    const sanitized = stripBase64Blocks(html);

    // Check size cap
    const sizeBytes = Buffer.byteLength(sanitized, "utf8");
    if (sizeBytes > this.config.maxSizeBytes) {
      console.warn(
        `[snapshot] Skipping storage for ${url}: size ${sizeBytes} bytes exceeds cap ${this.config.maxSizeBytes} bytes`
      );
      return undefined;
    }

    // Deduplicate by URL+hash
    const contentHash = hashContent(sanitized);
    const index = loadIndex(this.config.storageDir);
    const urlKey = urlToFilename(url);
    const existing = index[urlKey];
    if (existing && existing.contentHash === contentHash) {
      // Same content already stored — skip
      return urlKey;
    }

    // Write snapshot file
    const filePath = path.join(this.config.storageDir, urlKey + ".html");
    fs.writeFileSync(filePath, sanitized, "utf8");

    // Update index
    const metadata: SnapshotMetadata = {
      url,
      contentHash,
      storedAt: new Date().toISOString(),
      sizeBytes,
      reason,
    };
    index[urlKey] = metadata;
    saveIndex(this.config.storageDir, index);

    return urlKey;
  }

  /**
   * Retrieves a stored snapshot for the given URL, or undefined if not found or expired.
   */
  retrieve(url: string): string | undefined {
    const urlKey = urlToFilename(url);
    const index = loadIndex(this.config.storageDir);
    const meta = index[urlKey];
    if (!meta) return undefined;

    // Check TTL
    const age = Date.now() - new Date(meta.storedAt).getTime();
    if (age > this.config.ttlMs) {
      return undefined;
    }

    const filePath = path.join(this.config.storageDir, urlKey + ".html");
    if (!fs.existsSync(filePath)) return undefined;
    return fs.readFileSync(filePath, "utf8");
  }

  /**
   * Lists all current snapshot metadata entries.
   */
  list(): SnapshotMetadata[] {
    evictExpired(this.config.storageDir, this.config);
    return Object.values(loadIndex(this.config.storageDir));
  }

  /**
   * Purges all stored snapshots and the index.
   */
  purge(): void {
    if (!fs.existsSync(this.config.storageDir)) return;
    const index = loadIndex(this.config.storageDir);
    for (const key of Object.keys(index)) {
      const filePath = path.join(this.config.storageDir, key + ".html");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    const indexPath = path.join(this.config.storageDir, "index.json");
    if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
  }
}
