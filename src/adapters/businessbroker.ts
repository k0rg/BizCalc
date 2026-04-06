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
 * Adapter for BusinessBroker.net listings.
 *
 * Reference page:
 * https://www.businessbroker.net/business-for-sale/stone-countertop-fabrication-1m-plus-ebitda-north-carolina/1007659.aspx
 *
 * Key HTML structure on BusinessBroker.net detail pages:
 * - h1 for title
 * - .bbListingPrice or .price for asking price
 * - "Quick Facts" section with key/value pairs
 * - "Business Overview" text block
 * - Annual Revenue shown in structured section
 */
export class BusinessBrokerAdapter implements ListingAdapter {
  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?businessbroker\.net\//i.test(url);
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

    // Location: typically in a subtitle/header area or labeled field
    const location =
      cleanText(
        $(
          ".listing-location, .bbLocation, [class*='location'], [class*='city']"
        )
          .first()
          .text()
      ) || extractLabelValue($, "Location");

    // Asking price
    const asking_price =
      parseMoney(
        cleanText(
          $(
            ".bbListingPrice, .listing-price, .asking-price, [class*='price']"
          )
            .first()
            .text()
        )
      ) ||
      parseMoney(extractLabelValue($, "Asking Price")) ||
      parseMoney(extractLabelValue($, "List Price"));

    const revenue =
      parseMoney(extractLabelValue($, "Annual Revenue")) ||
      parseMoney(extractLabelValue($, "Gross Revenue")) ||
      parseMoney(extractLabelValue($, "Revenue"));

    // BusinessBroker.net often shows EBITDA prominently in title or description
    const ebitdaRaw = extractLabelValue($, "EBITDA");
    const cashFlowRaw =
      extractLabelValue($, "Cash Flow") ||
      extractLabelValue($, "Seller's Discretionary Earnings") ||
      extractLabelValue($, "SDE");

    let cash_flow: number | undefined;
    let cash_flow_type: ListingNormalized["cash_flow_type"] = "not_specified";

    if (cashFlowRaw) {
      cash_flow = parseMoney(cashFlowRaw);
      cash_flow_type = "SDE";
    } else if (ebitdaRaw) {
      cash_flow = parseMoney(ebitdaRaw);
      cash_flow_type = "EBITDA";
    }

    const inventoryRaw = extractLabelValue($, "Inventory");
    const inventory = parseMoney(inventoryRaw);

    const ffeRaw =
      extractLabelValue($, "FF&E") ||
      extractLabelValue($, "Equipment") ||
      extractLabelValue($, "Furniture");
    const ffe = parseMoney(ffeRaw);

    const employeesRaw =
      extractLabelValue($, "Employees") ||
      extractLabelValue($, "Full-Time Employees") ||
      extractLabelValue($, "Number of Employees");
    const employees = parseInteger(employeesRaw);

    const establishedRaw =
      extractLabelValue($, "Year Established") ||
      extractLabelValue($, "Established") ||
      extractLabelValue($, "Year Founded");
    const established_year = parseInteger(establishedRaw);

    const realEstateRaw =
      extractLabelValue($, "Real Estate") ||
      extractLabelValue($, "Real Estate Included") ||
      extractLabelValue($, "Building");
    const real_estate_included = parseBooleanYes(realEstateRaw);

    const reason_for_sale = cleanText(
      extractLabelValue($, "Reason for Selling") ||
        extractLabelValue($, "Reason for Sale")
    );

    const industry_text = cleanText(
      extractLabelValue($, "Business Type") ||
        extractLabelValue($, "Industry") ||
        extractLabelValue($, "Category") ||
        extractLabelValue($, "Type of Business")
    );

    // BusinessBroker.net has a "Business Overview" section
    const description = cleanText(
      $(
        ".business-overview, .businessOverview, #businessOverview, [class*='overview'], [class*='description']"
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
      source: "businessbroker",
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
