import { ListingAdapter } from "./types";
import { BizBuySellAdapter } from "./bizbuysell";
import { BizQuestAdapter } from "./bizquest";
import { BusinessBrokerAdapter } from "./businessbroker";

export { BizBuySellAdapter } from "./bizbuysell";
export { BizQuestAdapter } from "./bizquest";
export { BusinessBrokerAdapter } from "./businessbroker";
export * from "./types";
export * from "./utils";

const adapters: ListingAdapter[] = [
  new BizBuySellAdapter(),
  new BizQuestAdapter(),
  new BusinessBrokerAdapter(),
];

/**
 * Returns the adapter that can handle the given URL, or undefined if none matches.
 */
export function getAdapter(url: string): ListingAdapter | undefined {
  return adapters.find((a) => a.canHandle(url));
}
