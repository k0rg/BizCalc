export interface NaicsCode {
  naics_code: string;
  title: string;
  level: "sector" | "subsector" | "industry_group" | "industry" | "national_industry";
  parent_code?: string;
  source: "Census NAICS 2022";
}

export interface NaicsAlias {
  alias_text: string;
  naics_code: string;
  canonical_label: string;
  confidence: "manual" | "auto";
  source: "bizbuysell" | "bizquest" | "businessbroker" | "general";
}

/**
 * First-pass NAICS alias table mapping common marketplace listing categories
 * to NAICS 2022 codes. Add more entries as new categories are encountered.
 *
 * TODO: Expand this table with the full Census NAICS 2022 structure by running
 * the import pipeline: `node dist/naics/import <census-naics-file.xlsx>`
 *
 * Source: https://www.census.gov/naics/
 */
export const NAICS_ALIASES: NaicsAlias[] = [
  // Food & Beverage
  { alias_text: "Restaurant", naics_code: "722511", canonical_label: "Full-Service Restaurants", confidence: "manual", source: "general" },
  { alias_text: "Full Service Restaurant", naics_code: "722511", canonical_label: "Full-Service Restaurants", confidence: "manual", source: "general" },
  { alias_text: "Fast Food Restaurant", naics_code: "722513", canonical_label: "Limited-Service Restaurants", confidence: "manual", source: "general" },
  { alias_text: "Limited Service Restaurant", naics_code: "722513", canonical_label: "Limited-Service Restaurants", confidence: "manual", source: "general" },
  { alias_text: "Bar", naics_code: "722410", canonical_label: "Drinking Places (Alcoholic Beverages)", confidence: "manual", source: "general" },
  { alias_text: "Coffee Shop", naics_code: "722515", canonical_label: "Snack and Nonalcoholic Beverage Bars", confidence: "manual", source: "general" },
  { alias_text: "Bakery", naics_code: "311811", canonical_label: "Retail Bakeries", confidence: "manual", source: "general" },
  { alias_text: "Catering", naics_code: "722320", canonical_label: "Caterers", confidence: "manual", source: "general" },
  { alias_text: "Food Truck", naics_code: "722330", canonical_label: "Mobile Food Services", confidence: "manual", source: "general" },

  // Retail
  { alias_text: "Retail", naics_code: "452990", canonical_label: "All Other General Merchandise Stores", confidence: "manual", source: "general" },
  { alias_text: "Convenience Store", naics_code: "445131", canonical_label: "Convenience Retailers", confidence: "manual", source: "general" },
  { alias_text: "Gas Station", naics_code: "447110", canonical_label: "Gasoline Stations with Convenience Stores", confidence: "manual", source: "general" },
  { alias_text: "Liquor Store", naics_code: "445320", canonical_label: "Beer, Wine, and Liquor Retailers", confidence: "manual", source: "general" },
  { alias_text: "Grocery Store", naics_code: "445110", canonical_label: "Supermarkets and Other Grocery Retailers", confidence: "manual", source: "general" },

  // Services
  { alias_text: "Hair Salon", naics_code: "812112", canonical_label: "Beauty Salons", confidence: "manual", source: "general" },
  { alias_text: "Beauty Salon", naics_code: "812112", canonical_label: "Beauty Salons", confidence: "manual", source: "general" },
  { alias_text: "Barber Shop", naics_code: "812111", canonical_label: "Barber Shops", confidence: "manual", source: "general" },
  { alias_text: "Nail Salon", naics_code: "812113", canonical_label: "Nail Salons", confidence: "manual", source: "general" },
  { alias_text: "Dry Cleaning", naics_code: "812320", canonical_label: "Drycleaning and Laundry Services", confidence: "manual", source: "general" },
  { alias_text: "Laundry", naics_code: "812310", canonical_label: "Coin-Operated Laundries and Drycleaners", confidence: "manual", source: "general" },
  { alias_text: "Auto Repair", naics_code: "811111", canonical_label: "General Automotive Repair", confidence: "manual", source: "general" },
  { alias_text: "Automotive Repair", naics_code: "811111", canonical_label: "General Automotive Repair", confidence: "manual", source: "general" },
  { alias_text: "Car Wash", naics_code: "811192", canonical_label: "Car Washes", confidence: "manual", source: "general" },

  // Construction & Trades
  { alias_text: "Construction", naics_code: "236220", canonical_label: "Commercial and Institutional Building Construction", confidence: "manual", source: "general" },
  { alias_text: "Contractor", naics_code: "238990", canonical_label: "All Other Specialty Trade Contractors", confidence: "manual", source: "general" },
  { alias_text: "Plumbing", naics_code: "238220", canonical_label: "Plumbing, Heating, and Air-Conditioning Contractors", confidence: "manual", source: "general" },
  { alias_text: "Electrical", naics_code: "238210", canonical_label: "Electrical Contractors and Other Wiring Installation Contractors", confidence: "manual", source: "general" },
  { alias_text: "HVAC", naics_code: "238220", canonical_label: "Plumbing, Heating, and Air-Conditioning Contractors", confidence: "manual", source: "general" },
  { alias_text: "Paving", naics_code: "237310", canonical_label: "Highway, Street, and Bridge Construction", confidence: "manual", source: "general" },
  { alias_text: "Landscaping", naics_code: "561730", canonical_label: "Landscaping Services", confidence: "manual", source: "general" },
  { alias_text: "Lawn Care", naics_code: "561730", canonical_label: "Landscaping Services", confidence: "manual", source: "general" },
  { alias_text: "Roofing", naics_code: "238160", canonical_label: "Roofing Contractors", confidence: "manual", source: "general" },
  { alias_text: "Painting", naics_code: "238320", canonical_label: "Painting and Wall Covering Contractors", confidence: "manual", source: "general" },
  { alias_text: "Cleaning Service", naics_code: "561720", canonical_label: "Janitorial Services", confidence: "manual", source: "general" },
  { alias_text: "Janitorial", naics_code: "561720", canonical_label: "Janitorial Services", confidence: "manual", source: "general" },
  { alias_text: "Restoration", naics_code: "238910", canonical_label: "Site Preparation Contractors", confidence: "manual", source: "general" },

  // Manufacturing
  { alias_text: "Manufacturing", naics_code: "339999", canonical_label: "All Other Miscellaneous Manufacturing", confidence: "manual", source: "general" },
  { alias_text: "Stone Countertop", naics_code: "327991", canonical_label: "Cut Stone and Stone Product Manufacturing", confidence: "manual", source: "businessbroker" },
  { alias_text: "Fabrication", naics_code: "332999", canonical_label: "All Other Miscellaneous Fabricated Metal Product Manufacturing", confidence: "manual", source: "general" },
  { alias_text: "Cabinet Making", naics_code: "337110", canonical_label: "Wood Kitchen Cabinet and Countertop Manufacturing", confidence: "manual", source: "general" },

  // Health & Medical
  { alias_text: "Medical Practice", naics_code: "621111", canonical_label: "Offices of Physicians", confidence: "manual", source: "general" },
  { alias_text: "Dental Practice", naics_code: "621210", canonical_label: "Offices of Dentists", confidence: "manual", source: "general" },
  { alias_text: "Physical Therapy", naics_code: "621340", canonical_label: "Offices of Physical, Occupational and Speech Therapists", confidence: "manual", source: "general" },
  { alias_text: "Veterinary", naics_code: "541940", canonical_label: "Veterinary Services", confidence: "manual", source: "general" },
  { alias_text: "Home Health Care", naics_code: "621610", canonical_label: "Home Health Care Services", confidence: "manual", source: "general" },

  // Technology & Software
  { alias_text: "Software", naics_code: "511210", canonical_label: "Software Publishers", confidence: "manual", source: "general" },
  { alias_text: "IT Services", naics_code: "541512", canonical_label: "Computer Systems Design Services", confidence: "manual", source: "general" },
  { alias_text: "Internet Business", naics_code: "519130", canonical_label: "Internet Publishing and Broadcasting and Web Search Portals", confidence: "manual", source: "general" },
  { alias_text: "E-Commerce", naics_code: "454110", canonical_label: "Electronic Shopping and Mail-Order Houses", confidence: "manual", source: "general" },

  // Transportation & Logistics
  { alias_text: "Trucking", naics_code: "484110", canonical_label: "General Freight Trucking, Local", confidence: "manual", source: "general" },
  { alias_text: "Transportation", naics_code: "488999", canonical_label: "All Other Support Activities for Transportation", confidence: "manual", source: "general" },
  { alias_text: "Car Rental", naics_code: "532111", canonical_label: "Passenger Car Rental", confidence: "manual", source: "bizquest" },
  { alias_text: "Turo Fleet", naics_code: "532111", canonical_label: "Passenger Car Rental", confidence: "manual", source: "bizquest" },

  // Real Estate
  { alias_text: "Property Management", naics_code: "531311", canonical_label: "Residential Property Managers", confidence: "manual", source: "general" },
  { alias_text: "Real Estate Agency", naics_code: "531210", canonical_label: "Offices of Real Estate Agents and Brokers", confidence: "manual", source: "general" },

  // Education & Child Care
  { alias_text: "Daycare", naics_code: "624410", canonical_label: "Child Day Care Services", confidence: "manual", source: "general" },
  { alias_text: "Child Care", naics_code: "624410", canonical_label: "Child Day Care Services", confidence: "manual", source: "general" },
  { alias_text: "Tutoring", naics_code: "611691", canonical_label: "Exam Preparation and Tutoring", confidence: "manual", source: "general" },

  // Wholesale & Distribution
  { alias_text: "Wholesale", naics_code: "424990", canonical_label: "Other Miscellaneous Nondurable Goods Merchant Wholesalers", confidence: "manual", source: "general" },
  { alias_text: "Distribution", naics_code: "423990", canonical_label: "Other Miscellaneous Durable Goods Merchant Wholesalers", confidence: "manual", source: "general" },
];

/**
 * Looks up the NAICS code for a given industry text.
 * Returns the best matching alias or undefined.
 *
 * TODO: Implement TF-IDF or more sophisticated keyword matching for better coverage.
 */
export function lookupNaicsCode(industryText: string): NaicsAlias | undefined {
  if (!industryText) return undefined;
  const lower = industryText.toLowerCase().trim();

  // Exact match first
  const exact = NAICS_ALIASES.find(
    (a) => a.alias_text.toLowerCase() === lower
  );
  if (exact) return exact;

  // Substring match (alias in industry text)
  const partial = NAICS_ALIASES.find((a) =>
    lower.includes(a.alias_text.toLowerCase())
  );
  if (partial) return partial;

  // Industry text contains alias keyword
  const reverse = NAICS_ALIASES.find((a) =>
    a.alias_text.toLowerCase().split(" ").some((word) => lower.includes(word) && word.length > 4)
  );
  return reverse;
}
