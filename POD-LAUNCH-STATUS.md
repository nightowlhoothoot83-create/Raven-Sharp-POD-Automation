# POD implementation and live-access status — 2026-11-14

Inspected main `d55e5ef558da3fb1048df69f014e4479829ccfc9`, all 15 remote branches, and open PR #13. No AGENTS.md found. PR #13 adds only a quality specification; this branch implements complementary preflight functions without changing its instructions or merging it. Parent inspection found a successful existing Railway deployment; this branch is not deployed. GitHub deployments collection was unsupported by the connector.

## Reused and changed

Preserves the multi-provider Printify, Gelato and Printful handlers, unpublished product creation, and authentic mockup polling. Printify no longer treats missing costs as zero or prices every variant from the first variant's cost. Unknown-cost variants are excluded; the highest known cost among enabled variants informs pricing. Reported gross production margin is explicitly not a net margin.

`backend/readiness.py` provides offline actual-pixel/aspect/blank checks, exact-asset hash binding for visual review, provider-mockup provenance confirmation and full-cost contribution calculations. It is a callable preflight, **not wired into existing publication routes**. Visual quality and rights cannot be established by checking pixels; the reviewer must inspect the exact asset and authentic provider mockups.

`python -m unittest discover -s backend -p test_readiness.py -v` passes six tests: pixel-vs-DPI deception, crop/transparency, NaN/infinite inputs, review hash/missing mockup, full-cost accounting, and unknown/variant provider costs. API responses use an offline transport, with no real provider calls. Syntax compilation passed. CI adds the same checks to the existing test/build workflow; no production cron added.

## Current provider evidence

Recommended next step: connect MyDesigns on its free plan, inspect its catalog and the merchant's eligibility before selecting products. Existing Printify integration remains an alternative; do not replace it.

[MyDesigns pricing](https://mydesigns.io/pricing), read 2026-11-14: Free $0, 256 MB, 4 products/batch, 1 shop/platform; 24 Etsy publishes/day and 1 native store with 4 publishes/day; no included AI credits. Starter $24.99 month-to-month or $239.88/year. Native-store free-plan fees 10% plus 3% + $0.25 processing. No paid plan or credits purchased.

[Official MCP documentation](https://mydesigns.io/docs/integrations/mcp): beta MCP endpoint `https://mcp.mydesigns.io/mcp`, OAuth or personal access token, anonymous catalog browsing and official ChatGPT plugin. [MCP product page](https://mydesigns.io/mcp) says connection is free on every plan; own PNG/JPEG uploads are free. Credits for generation/research require a spending limit; do not infer free generation from free connection. Etsy publishing still requires review in MyDesigns according to its [Codex guide](https://mydesigns.io/mcp/codex).

[Seller terms](https://mydesigns.io/seller-tos), effective 2026-09-25: store proceeds remit after production/shipping, taxes and fees; merchant remains responsible for buyer support, refunds and chargebacks. Higher-cost provider switches may require additional payment. Exact merchant-country eligibility, identity verification and payout schedule remain unverified.

[Printify pricing](https://printify.com/pricing/) offers a $0 plan. [Payment help](https://help.printify.com/hc/en-us/articles/4483644218769-How-do-I-set-up-payments-in-Printify) requires the seller to cover production/shipping separately from marketplace receipts. [API docs](https://developers.printify.com/) warn new stores default to automatic order approval after 24 hours. Verify manual approval before importing any real order. Product/destination costs require a current authenticated quote, not the marketing calculator.

## Launch blockers and next action

No MyDesigns/provider account connection verified. No authentic new mockup, live product draft, checkout, order, payout or sale was created by this branch. No paid inference, subscription or fulfilment incurred. Actual current hosting bill remains unverified.

Need one supported provider connection; merchant-country/Stripe onboarding; catalog product, variants, destination shipping and taxes; approved fulfilment cash cap (Printify route); current net contribution; original demand-led design; exact-asset visual review; authentic mockup; draft then verified checkout and tracking. Countries and payout delay cannot be inferred from a worldwide marketing claim. Customer support burden remains real for sizing, print faults, deliveries and replacements.

No projections are income. Margin helper returns dated, currency-specific contribution and fulfilment cash requirement, with payout timing and sales explicitly unverified. It does not calculate final tax liability.
