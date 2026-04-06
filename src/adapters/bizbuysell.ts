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
 * Adapter for BizBuySell.com listings.
 *
 * Reference page:
 * https://www.bizbuysell.com/business-opportunity/restoration-and-finishing-services/2238047/
 *
 * Key HTML structure on BizBuySell detail pages:
 * - h1 for title
 * - .listing-info-value / .bfsListing rows for financials
 * - dt/dd pairs in .listingProfile section
 * - location in multiple possible locations
 */
export class BizBuySellAdapter implements ListingAdapter {
  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?bizbuysell\.com\//i.test(url);
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

    // Remove script and style tags to avoid polluting text extraction
    $("script, style, noscript").remove();

    const title = cleanText($("h1").first().text());
    const source_listing_id = extractListingIdFromUrl(url);

    // Location: BizBuySell shows city, state in the header area
    const location =
      cleanText(
        $(".listing-address, .listingAddress, .businessLocation, [class*='location']")
          .first()
          .text()
      ) ||
      cleanText($(".bfsStatus .city").text()) ||
      extractLabelValue($, "Location");

    // Financial fields via label/value rows
    const asking_price =
      parseMoney(
        cleanText(
          $(
            ".asking-price, .askingPrice, [class*='asking'][class*='price'], .price-display"
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

    // BizBuySell shows both "Cash Flow (SDE)" and "EBITDA" - prefer SDE
    const sdeRaw = extractLabelValue($, "Cash Flow");
    const ebitdaRaw = extractLabelValue($, "EBITDA");

    let cash_flow: number | undefined;
    let cash_flow_type: ListingNormalized["cash_flow_type"] = "not_specified";

    if (sdeRaw) {
      cash_flow = parseMoney(sdeRaw);
      cash_flow_type = "SDE";
    } else if (ebitdaRaw) {
      cash_flow = parseMoney(ebitdaRaw);
      cash_flow_type = "EBITDA";
    }

    const inventory = parseMoney(extractLabelValue($, "Inventory"));
    const ffe = parseMoney(
      extractLabelValue($, "FF&E") || extractLabelValue($, "Furniture")
    );

    const employeesRaw =
      extractLabelValue($, "Employees") ||
      extractLabelValue($, "Full-Time Employees");
    const employees = parseInteger(employeesRaw);

    const establishedRaw =
      extractLabelValue($, "Established") ||
      extractLabelValue($, "Year Established") ||
      extractLabelValue($, "Founded");
    const established_year = parseInteger(establishedRaw);

    const realEstateRaw =
      extractLabelValue($, "Real Estate") ||
      extractLabelValue($, "Real Estate Included");
    const real_estate_included = parseBooleanYes(realEstateRaw);

    const reason_for_sale = cleanText(
      extractLabelValue($, "Reason for Selling") ||
        extractLabelValue($, "Reason for Sale")
    );

    const industry_text = cleanText(
      extractLabelValue($, "Business Type") ||
        extractLabelValue($, "Category") ||
        extractLabelValue($, "Industry")
    );

    // Description: look for dedicated description sections
    const description = cleanText(
      $(
        "#description, .listing-description, .listingDescription, .business-description, [class*='description']"
      )
        .first()
        .text()
    );

    const images: string[] = [];
    $("img[src]").each((_i, el) => {
      const src = $(el).attr("src") || "";
      if (src && !src.startsWith("data:") && src.includes("photo")) {
        images.push(src);
      }
    });

    return {
      source: "bizbuysell",
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
