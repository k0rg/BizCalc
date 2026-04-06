import * as cheerio from "cheerio";
import { ListingAdapter, ListingNormalized } from "./types";
import {
  parseMoney,
  cleanText,
  parseInteger,
  parseBooleanYes,
  extractLabelValue,
  extractListingIdFromUrl,
} from "./utils";

/**
 * Adapter for BizQuest.com listings.
 *
 * Reference page (US listing):
 * https://www.bizquest.com/business-for-sale/dynamic-market-leading-company-grading-utility-paving/BW2402686/
 *
 * Key HTML structure on BizQuest detail pages:
 * - h1 for title
 * - .listing-price or .bizListingPrice for asking price
 * - dl / dt+dd pairs for key facts
 * - .listing-description or #bizDescription for description
 * - Some fields like Cash Flow may be gated behind sign-in - treat as optional
 */
export class BizQuestAdapter implements ListingAdapter {
  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?bizquest\.com\//i.test(url);
  }

  async fetch(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return res.text();
  }

  parse(html: string, url: string): ListingNormalized {
    const $ = cheerio.load(html);
    $("script, style, noscript").remove();

    const title = cleanText($("h1").first().text());
    const source_listing_id = extractListingIdFromUrl(url);

    // Location: typically shown near the title or in a dedicated location element
    const location =
      cleanText(
        $(
          ".listing-location, .bizLocation, .location, [class*='location'], [class*='city']"
        )
          .first()
          .text()
      ) || extractLabelValue($, "Location");

    // Asking price
    const asking_price =
      parseMoney(
        cleanText(
          $(
            ".listing-price, .bizListingPrice, .asking-price, [class*='price']"
          )
            .first()
            .text()
        )
      ) ||
      parseMoney(extractLabelValue($, "Asking Price")) ||
      parseMoney(extractLabelValue($, "List Price"));

    const revenue =
      parseMoney(extractLabelValue($, "Gross Revenue")) ||
      parseMoney(extractLabelValue($, "Annual Revenue")) ||
      parseMoney(extractLabelValue($, "Revenue"));

    // BizQuest shows EBITDA prominently; Cash Flow may be gated
    const ebitdaRaw = extractLabelValue($, "EBITDA");
    const cashFlowRaw = extractLabelValue($, "Cash Flow");

    let cash_flow: number | undefined;
    let cash_flow_type: ListingNormalized["cash_flow_type"] = "not_specified";

    if (cashFlowRaw && !/sign\s+in/i.test(cashFlowRaw)) {
      cash_flow = parseMoney(cashFlowRaw);
      cash_flow_type = "SDE";
    } else if (ebitdaRaw && !/sign\s+in/i.test(ebitdaRaw)) {
      cash_flow = parseMoney(ebitdaRaw);
      cash_flow_type = "EBITDA";
    }

    const inventoryRaw = extractLabelValue($, "Inventory");
    const inventory =
      inventoryRaw && !/not\s+disclosed/i.test(inventoryRaw)
        ? parseMoney(inventoryRaw)
        : undefined;

    const ffeRaw =
      extractLabelValue($, "FF&E") ||
      extractLabelValue($, "Furniture") ||
      extractLabelValue($, "Fixtures");
    const ffe =
      ffeRaw && !/not\s+disclosed/i.test(ffeRaw)
        ? parseMoney(ffeRaw)
        : undefined;

    const employeesRaw = extractLabelValue($, "Employees");
    const employees = parseInteger(employeesRaw);

    const establishedRaw =
      extractLabelValue($, "Year Established") ||
      extractLabelValue($, "Established") ||
      extractLabelValue($, "Year Founded");
    const established_year = parseInteger(establishedRaw);

    const realEstateRaw =
      extractLabelValue($, "Real Estate") ||
      extractLabelValue($, "Real Estate Included");
    const real_estate_included =
      realEstateRaw && !/not\s+disclosed/i.test(realEstateRaw)
        ? parseBooleanYes(realEstateRaw)
        : undefined;

    const reason_for_sale = cleanText(
      extractLabelValue($, "Reason for Selling") ||
        extractLabelValue($, "Reason for Sale")
    );

    const industry_text = cleanText(
      extractLabelValue($, "Business Category") ||
        extractLabelValue($, "Category") ||
        extractLabelValue($, "Industry") ||
        extractLabelValue($, "Business Type")
    );

    const description = cleanText(
      $(
        "#bizDescription, .business-description, .listing-description, [class*='description']"
      )
        .first()
        .text()
    );

    const images: string[] = [];
    $("img[src]").each((_i, el) => {
      const src = $(el).attr("src") || "";
      if (src && !src.startsWith("data:") && (src.includes("photo") || src.includes("image"))) {
        images.push(src);
      }
    });

    return {
      source: "bizquest",
      listing_url: url,
      source_listing_id,
      title,
      location,
      industry_text,
      asking_price,
      revenue,
      cash_flow,
      cash_flow_type,
      inventory,
      ffe,
      real_estate_included,
      employees,
      established_year,
      reason_for_sale,
      description,
      images,
    };
  }
}
