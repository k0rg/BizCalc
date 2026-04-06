import { strict as assert } from "assert";
import { test } from "node:test";
import {
  parseMoney,
  cleanText,
  parseInteger,
  parseBooleanYes,
  isUSLocation,
  extractListingIdFromUrl,
} from "./utils";

test("parseMoney - basic dollar amounts", () => {
  assert.equal(parseMoney("$1,234,567"), 1234567);
  assert.equal(parseMoney("$500,000"), 500000);
  assert.equal(parseMoney("$0"), 0);
});

test("parseMoney - K/M/B multipliers", () => {
  assert.equal(parseMoney("$1.5M"), 1500000);
  assert.equal(parseMoney("$250K"), 250000);
  assert.equal(parseMoney("2.5B"), 2500000000);
});

test("parseMoney - N/A and empty", () => {
  assert.equal(parseMoney("N/A"), undefined);
  assert.equal(parseMoney(""), undefined);
  assert.equal(parseMoney(undefined), undefined);
  assert.equal(parseMoney("Not Disclosed"), undefined);
});

test("cleanText - whitespace normalization", () => {
  assert.equal(cleanText("  Hello   World  "), "Hello World");
  assert.equal(cleanText(""), undefined);
  assert.equal(cleanText(undefined), undefined);
  assert.equal(cleanText("   "), undefined);
});

test("parseInteger - basic", () => {
  assert.equal(parseInteger("42"), 42);
  assert.equal(parseInteger("1,234"), 1234);
  assert.equal(parseInteger("not a number"), undefined);
  assert.equal(parseInteger(""), undefined);
});

test("parseBooleanYes - yes/no", () => {
  assert.equal(parseBooleanYes("Yes"), true);
  assert.equal(parseBooleanYes("yes"), true);
  assert.equal(parseBooleanYes("No"), false);
  assert.equal(parseBooleanYes("no"), false);
  assert.equal(parseBooleanYes("Included"), true);
  assert.equal(parseBooleanYes("Not Included"), false);
  assert.equal(parseBooleanYes(undefined), undefined);
});

test("isUSLocation - US states", () => {
  assert.equal(isUSLocation("Charlotte, North Carolina"), true);
  assert.equal(isUSLocation("Miami, FL"), true);
  assert.equal(isUSLocation("New York, NY"), true);
  assert.equal(isUSLocation("Los Angeles, CA"), true);
  assert.equal(isUSLocation("Texas"), true);
});

test("isUSLocation - non-US", () => {
  assert.equal(isUSLocation("Toronto, Ontario, Canada"), false);
  assert.equal(isUSLocation("London, UK"), false);
});

test("isUSLocation - unknown", () => {
  assert.equal(isUSLocation(undefined), undefined);
  assert.equal(isUSLocation(""), undefined);
});

test("extractListingIdFromUrl - BizBuySell", () => {
  assert.equal(
    extractListingIdFromUrl(
      "https://www.bizbuysell.com/business-opportunity/restoration-and-finishing-services/2238047/"
    ),
    "2238047"
  );
});

test("extractListingIdFromUrl - BizQuest", () => {
  assert.equal(
    extractListingIdFromUrl(
      "https://www.bizquest.com/business-for-sale/dynamic-market-leading-company-grading-utility-paving/BW2402686/"
    ),
    "BW2402686"
  );
});

test("extractListingIdFromUrl - BusinessBroker", () => {
  assert.equal(
    extractListingIdFromUrl(
      "https://www.businessbroker.net/business-for-sale/stone-countertop-fabrication-1m-plus-ebitda-north-carolina/1007659.aspx"
    ),
    "1007659"
  );
});
