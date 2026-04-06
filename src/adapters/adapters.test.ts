import { strict as assert } from "assert";
import { test } from "node:test";
import { BizBuySellAdapter } from "./bizbuysell";
import { BizQuestAdapter } from "./bizquest";
import { BusinessBrokerAdapter } from "./businessbroker";
import { getAdapter } from "./index";

const BIZBUYSELL_SAMPLE_HTML = `
<html>
<body>
  <h1>Restoration and Finishing Services Business</h1>
  <div class="listing-address">Charlotte, North Carolina</div>
  <dl>
    <dt>Asking Price:</dt><dd>$450,000</dd>
    <dt>Cash Flow:</dt><dd>$120,000</dd>
    <dt>Gross Revenue:</dt><dd>$800,000</dd>
    <dt>EBITDA:</dt><dd>$110,000</dd>
    <dt>Inventory:</dt><dd>$25,000</dd>
    <dt>Established:</dt><dd>2005</dd>
    <dt>Employees:</dt><dd>8</dd>
    <dt>Real Estate:</dt><dd>No</dd>
    <dt>Reason for Selling:</dt><dd>Retirement</dd>
    <dt>Business Type:</dt><dd>Restoration Services</dd>
  </dl>
  <div id="description">This is a well-established restoration business serving residential and commercial clients.</div>
</body>
</html>
`;

const BIZQUEST_SAMPLE_HTML = `
<html>
<body>
  <h1>Dynamic Market Leading Company - Grading &amp; Utility Paving</h1>
  <div class="listing-location">Denver, Colorado</div>
  <dl>
    <dt>Asking Price</dt><dd>$3,500,000</dd>
    <dt>EBITDA</dt><dd>$850,000</dd>
    <dt>Gross Revenue</dt><dd>$4,200,000</dd>
    <dt>Inventory</dt><dd>$150,000</dd>
    <dt>Year Established</dt><dd>1998</dd>
    <dt>Employees</dt><dd>25</dd>
    <dt>Business Category</dt><dd>Construction</dd>
  </dl>
  <div id="bizDescription">Market leading grading and paving company with strong backlog.</div>
</body>
</html>
`;

const BUSINESSBROKER_SAMPLE_HTML = `
<html>
<body>
  <h1>Stone Countertop Fabrication - $1M+ EBITDA - North Carolina</h1>
  <div class="bbLocation">Raleigh, NC</div>
  <dl>
    <dt>Asking Price:</dt><dd>$5,500,000</dd>
    <dt>Annual Revenue:</dt><dd>$6,000,000</dd>
    <dt>EBITDA:</dt><dd>$1,200,000</dd>
    <dt>Inventory:</dt><dd>$300,000</dd>
    <dt>Year Established:</dt><dd>2001</dd>
    <dt>Employees:</dt><dd>35</dd>
    <dt>Business Type:</dt><dd>Manufacturing - Stone Countertop</dd>
  </dl>
  <div class="business-overview">Premier stone countertop fabrication company with strong regional presence.</div>
</body>
</html>
`;

// --- BizBuySell adapter tests ---
test("BizBuySellAdapter - canHandle", () => {
  const adapter = new BizBuySellAdapter();
  assert.ok(adapter.canHandle("https://www.bizbuysell.com/business-opportunity/foo/2238047/"));
  assert.ok(!adapter.canHandle("https://www.bizquest.com/foo/"));
  assert.ok(!adapter.canHandle("https://www.businessbroker.net/foo/"));
});

test("BizBuySellAdapter - parse extracts fields", () => {
  const adapter = new BizBuySellAdapter();
  const listing = adapter.parse(BIZBUYSELL_SAMPLE_HTML, "https://www.bizbuysell.com/business-opportunity/restoration-and-finishing-services/2238047/");

  assert.equal(listing.source, "bizbuysell");
  assert.equal(listing.source_listing_id, "2238047");
  assert.ok(listing.title?.includes("Restoration"));
  assert.equal(listing.asking_price, 450000);
  assert.equal(listing.cash_flow, 120000);
  assert.equal(listing.cash_flow_type, "SDE");
  assert.equal(listing.revenue, 800000);
  assert.equal(listing.inventory, 25000);
  assert.equal(listing.established_year, 2005);
  assert.equal(listing.employees, 8);
  assert.equal(listing.real_estate_included, false);
  assert.equal(listing.reason_for_sale, "Retirement");
  assert.ok(listing.description?.includes("restoration"));
});

// --- BizQuest adapter tests ---
test("BizQuestAdapter - canHandle", () => {
  const adapter = new BizQuestAdapter();
  assert.ok(adapter.canHandle("https://www.bizquest.com/business-for-sale/foo/BW2402686/"));
  assert.ok(!adapter.canHandle("https://www.bizbuysell.com/foo/"));
});

test("BizQuestAdapter - parse extracts fields", () => {
  const adapter = new BizQuestAdapter();
  const listing = adapter.parse(BIZQUEST_SAMPLE_HTML, "https://www.bizquest.com/business-for-sale/dynamic-market-leading-company-grading-utility-paving/BW2402686/");

  assert.equal(listing.source, "bizquest");
  assert.equal(listing.source_listing_id, "BW2402686");
  assert.ok(listing.title?.includes("Grading"));
  assert.equal(listing.asking_price, 3500000);
  assert.equal(listing.cash_flow, 850000);
  assert.equal(listing.cash_flow_type, "EBITDA");
  assert.equal(listing.revenue, 4200000);
  assert.equal(listing.inventory, 150000);
  assert.equal(listing.established_year, 1998);
  assert.equal(listing.employees, 25);
  assert.ok(listing.description?.includes("paving"));
});

// --- BusinessBroker adapter tests ---
test("BusinessBrokerAdapter - canHandle", () => {
  const adapter = new BusinessBrokerAdapter();
  assert.ok(adapter.canHandle("https://www.businessbroker.net/business-for-sale/stone-countertop/1007659.aspx"));
  assert.ok(!adapter.canHandle("https://www.bizquest.com/foo/"));
});

test("BusinessBrokerAdapter - parse extracts fields", () => {
  const adapter = new BusinessBrokerAdapter();
  const listing = adapter.parse(BUSINESSBROKER_SAMPLE_HTML, "https://www.businessbroker.net/business-for-sale/stone-countertop-fabrication-1m-plus-ebitda-north-carolina/1007659.aspx");

  assert.equal(listing.source, "businessbroker");
  assert.equal(listing.source_listing_id, "1007659");
  assert.ok(listing.title?.includes("Stone Countertop"));
  assert.equal(listing.asking_price, 5500000);
  assert.equal(listing.cash_flow, 1200000);
  assert.equal(listing.cash_flow_type, "EBITDA");
  assert.equal(listing.revenue, 6000000);
  assert.equal(listing.inventory, 300000);
  assert.equal(listing.established_year, 2001);
  assert.equal(listing.employees, 35);
  assert.ok(listing.description?.includes("stone countertop"));
});

// --- getAdapter routing ---
test("getAdapter - returns correct adapter", () => {
  assert.ok(getAdapter("https://www.bizbuysell.com/foo/") instanceof BizBuySellAdapter);
  assert.ok(getAdapter("https://www.bizquest.com/foo/") instanceof BizQuestAdapter);
  assert.ok(getAdapter("https://www.businessbroker.net/foo/") instanceof BusinessBrokerAdapter);
  assert.equal(getAdapter("https://www.empireflippers.com/foo/"), undefined);
});
