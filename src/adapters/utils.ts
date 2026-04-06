import * as cheerio from "cheerio";

/**
 * Parses a money string like "$1,234,567", "$1.2M", "1.5K", "N/A" into a number.
 * Returns undefined if not parseable.
 */
export function parseMoney(input?: string | null): number | undefined {
  if (!input) return undefined;
  const cleaned = input.replace(/[\$,\s]/g, "").trim();
  if (!cleaned || /^n\/a$/i.test(cleaned) || /^not\s+disclosed$/i.test(cleaned)) {
    return undefined;
  }
  const upperCleaned = cleaned.toUpperCase();
  let mult = 1;
  let numStr = upperCleaned;
  if (upperCleaned.endsWith("M")) {
    mult = 1_000_000;
    numStr = upperCleaned.slice(0, -1);
  } else if (upperCleaned.endsWith("K")) {
    mult = 1_000;
    numStr = upperCleaned.slice(0, -1);
  } else if (upperCleaned.endsWith("B")) {
    mult = 1_000_000_000;
    numStr = upperCleaned.slice(0, -1);
  }
  const numeric = parseFloat(numStr);
  return isNaN(numeric) ? undefined : numeric * mult;
}

/**
 * Cleans whitespace from a string. Returns undefined for empty strings.
 */
export function cleanText(input?: string | null): string | undefined {
  if (!input) return undefined;
  const cleaned = input.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Parses an integer from a string (e.g., employee count, year).
 */
export function parseInteger(input?: string | null): number | undefined {
  if (!input) return undefined;
  const cleaned = input.replace(/[,\s]/g, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Returns true if the given boolean-like string indicates "yes" / true.
 */
export function parseBooleanYes(input?: string | null): boolean | undefined {
  if (!input) return undefined;
  const lower = input.toLowerCase().trim();
  if (lower === "yes" || lower === "true" || lower === "included") return true;
  if (lower === "no" || lower === "false" || lower === "not included") return false;
  return undefined;
}

/**
 * Extracts the value following a label in a key/value row structure.
 * Searches for elements containing labelText and reads the adjacent value.
 */
export function extractLabelValue(
  $: cheerio.CheerioAPI,
  labelText: string
): string | undefined {
  // Normalize the label for comparison
  const normalizedLabel = labelText.toLowerCase().trim();

  let found: string | undefined;

  // Strategy 1: look for dt/dd pairs
  $("dt").each((_i, el) => {
    const text = $(el).text().toLowerCase().trim();
    if (!found && text.includes(normalizedLabel)) {
      const dd = $(el).next("dd");
      if (dd.length) {
        found = cleanText(dd.text());
      }
    }
  });
  if (found) return found;

  // Strategy 2: look for th/td pairs in tables
  $("th").each((_i, el) => {
    const text = $(el).text().toLowerCase().trim();
    if (!found && text.includes(normalizedLabel)) {
      const td = $(el).next("td");
      if (td.length) {
        found = cleanText(td.text());
      }
    }
  });
  if (found) return found;

  // Strategy 3: look for label-like spans/divs followed by value spans/divs
  $("[class*='label'], [class*='Label'], [class*='key'], [class*='Key']").each(
    (_i, el) => {
      const text = $(el).text().toLowerCase().trim();
      if (!found && text.includes(normalizedLabel)) {
        const sibling = $(el).next();
        if (sibling.length) {
          found = cleanText(sibling.text());
        } else {
          // try parent's next sibling
          const parentNext = $(el).parent().next();
          if (parentNext.length) {
            found = cleanText(parentNext.text());
          }
        }
      }
    }
  );
  if (found) return found;

  // Strategy 4: regex over full text (last resort)
  const fullText = $.root().text();
  const escaped = labelText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // match "Label: $value" or "Label $value"
  const regex = new RegExp(escaped + "\\s*:?\\s*([\\$\\d][\\$\\d,.MKBmkb\\s]+)", "i");
  const m = fullText.match(regex);
  if (m) {
    return cleanText(m[1]);
  }

  return undefined;
}

/**
 * Checks if the given location string is in the United States.
 * Returns true for US locations, false for clearly non-US, undefined if unknown.
 */
export function isUSLocation(location?: string | null): boolean | undefined {
  if (!location) return undefined;
  const lower = location.toLowerCase();

  // Explicit US indicators
  const usStates = [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
    "maine", "maryland", "massachusetts", "michigan", "minnesota",
    "mississippi", "missouri", "montana", "nebraska", "nevada",
    "new hampshire", "new jersey", "new mexico", "new york",
    "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
    "pennsylvania", "rhode island", "south carolina", "south dakota",
    "tennessee", "texas", "utah", "vermont", "virginia", "washington",
    "west virginia", "wisconsin", "wyoming", "district of columbia",
  ];

  const usStateAbbreviations = [
    ", al", ", ak", ", az", ", ar", ", ca", ", co", ", ct", ", de",
    ", fl", ", ga", ", hi", ", id", ", il", ", in", ", ia", ", ks",
    ", ky", ", la", ", me", ", md", ", ma", ", mi", ", mn", ", ms",
    ", mo", ", mt", ", ne", ", nv", ", nh", ", nj", ", nm", ", ny",
    ", nc", ", nd", ", oh", ", ok", ", or", ", pa", ", ri", ", sc",
    ", sd", ", tn", ", tx", ", ut", ", vt", ", va", ", wa", ", wv",
    ", wi", ", wy", ", dc",
  ];

  if (usStates.some((s) => lower.includes(s))) return true;
  if (usStateAbbreviations.some((s) => lower.endsWith(s))) return true;
  if (lower.includes(", usa") || lower.includes("united states")) return true;

  // Non-US indicators
  const nonUsCountries = [
    "canada", "ontario", "british columbia", "alberta", "quebec",
    "united kingdom", "uk", "australia", "new zealand", "germany",
    "france", "spain", "italy", "mexico", "india", "china", "japan",
  ];
  if (nonUsCountries.some((c) => lower.includes(c))) return false;

  return undefined;
}

/**
 * Extracts the source listing ID from common URL patterns.
 */
export function extractListingIdFromUrl(url: string): string | undefined {
  // BizBuySell: /2238047/
  let m = url.match(/\/(\d{6,})\/?$/);
  if (m) return m[1];

  // BizQuest: /BW2402686/
  m = url.match(/\/(BW\d+)\/?$/i);
  if (m) return m[1].toUpperCase();

  // BusinessBroker: /1007659.aspx
  m = url.match(/\/(\d{6,})\.aspx/i);
  if (m) return m[1];

  return undefined;
}
