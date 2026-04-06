export type Source = "bizbuysell" | "bizquest" | "businessbroker";

export type CashFlowType =
  | "SDE"
  | "EBITDA"
  | "Owner Cash Flow"
  | "not_specified";

export interface ListingNormalized {
  source: Source;
  listing_url: string;
  source_listing_id?: string;
  title?: string;
  location?: string;
  industry_text?: string;
  naics_code?: string;

  asking_price?: number;
  revenue?: number;
  cash_flow?: number;
  cash_flow_type?: CashFlowType;
  gross_profit?: number;
  inventory?: number;

  real_estate_included?: boolean;
  employees?: number;
  established_year?: number;
  ffe?: number;

  reason_for_sale?: string;
  description?: string;
  images?: string[];
}

export interface ListingAdapter {
  /** Returns true if this adapter can handle the given URL. */
  canHandle(url: string): boolean;
  /** Fetches raw HTML for the listing. */
  fetch(url: string): Promise<string>;
  /** Parses raw HTML and returns a normalized listing. */
  parse(html: string, url: string): ListingNormalized;
}
