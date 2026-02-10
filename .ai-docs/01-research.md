<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Research \& Discovery Report

**Project:** LeonoreVault
**Date:** 2026-02-08
**Research Tool:** Perplexity

***

## Executive Summary

LeonoreVault enters a \$1.2-2B home inventory apps market growing at 12-16% CAGR, driven by insurance claims and smart homes, with strong demand for QR/offline PWA solutions.[^1][^2]
Top competitors like Sortly and HomeZada offer freemium models but gap in family lending tracking and simple real-time sync, creating your niche.[^3][^4]
Next.js + Supabase stack fits your 1-week MVP timeline, with freemium SaaS monetization viable at \$3-10/mo pro tiers.[^5][^6]

## Market Analysis

### Market Size

TAM: Home management software (~\$10B+); SAM: Consumer inventory apps (\$2-5B); SOM: Household PWA trackers (\$100-500M).[^2][^7][^1]

### Growth Trends

16.2% CAGR to \$4.8B by 2032; Asia-Pacific 18.5% fueled by mobile adoption, AI scanning, insurance digitization.[^2]

## Competitor Analysis

| Competitor | Type | Key Features | Pricing | Weakness |
| :-- | :-- | :-- | :-- | :-- |
| Sortly | Direct | QR scan, visual org, multi-user | Free (100 items); \$29/mo Pro | Limited free, no lending track [^3][^4] |
| HomeZada | Direct | Inventory + maintenance, AI | Free basic; \$9.99/mo Premium | Complex UI, paid exports [^3][^8] |
| Spullio | Direct | AI photo, loan center, PWA | Free (50 items); Paid | Less insurance focus [^4] |
| Dib | Direct | AI recog, value est. | ~\$5-10/mo | Mobile-heavy, less web [^3] |
| Encircle | Direct | Insurance reports, photo | Free basic; Pro paid | Clunky for casual [^9] |
| Skyware | Direct | Custom cats, web | Free; \$3/mo | Basic, no AI/QR [^10] |
| Nest Egg | Direct | Clean UI, manual | Freemium | No AI [^3] |
| Homebox | Indirect/OS | Self-hosted, customizable | Free | Setup complex [^11] |

### Detailed Competitor Notes

Freemium dominates; gaps in family accountability (lost/found), real-time chat, easy 3D viz—your QR + chat differentiates for households.[^4][^12]

## Target User Profile

### Primary Persona

- **Name:** Organized Homeowner Parent
- **Demographics:** 30-55yo, middle-income families, homeowners in suburbs (e.g., South Tangerang)
- **Pain Points:** Items misplaced by family, no tracking/who-took-what, insurance claim hassles, manual lists tedious.[^12][^13][^5]
- **Current Solutions:** Spreadsheets/paper, basic apps (low retention), lost box hacks.[^13][^14]
- **Willingness to Pay:** \$3-10/mo for pro (unlimited/multi-user); free hooks families.[^10][^15]


## Technical Landscape

### Recommended Stack

FE: Next.js (PWA), Tailwind, Framer/Three.js; BE: Express/Next API; DB: Supabase Postgres (realtime).[^6][^5]

### Key Technical Decisions

PWA offline-first, QR via ZXing, realtime sync—standalone Next.js for 1-week MVP, no full BE.[^6]

### Third-Party Services to Evaluate

- **Auth**: Supabase (free/realtime, pros: integrated; cons: none for MVP), Clerk (easy UI).[^6]
- **Payments**: Stripe (subscriptions, pros: global; cons: 2.9% fee).[^16]
- **Other**: Firebase notifs, Google Drive API (attachments, pros: familiar; cons: quotas).[^6]


## Risks \& Considerations

1. Low adoption if scan accuracy fails in real homes (test low-light).[^17]
2. Data privacy for household items (GDPR-like compliance for SaaS).[^18]
3. Competition from free apps—emphasize family chat/differentiation.[^4]

## Recommendations for PRD Phase

Prioritize MVP: Item CMS + QR scan + offline + auth (1 week); validate with family beta.
Add chat/notifs post-MVP; freemium pricing; target Reddit/home forums for users.[^19][^12]

***
**Sources:**

1. 00-project-brief.md[^5]
2. Verified Market Reports - Home Inventory Apps Market[^1]
3. Dataintelo - Home Inventory Apps Report[^2]
4. SmartHomeAdmin - Best AI Home Inventory Apps 2026[^3]
5. Spullio Alternatives[^4]
6. Flatlogic - Build Inventory App[^6]
7. Reddit r/HomeImprovement - Home Inventory App Idea[^12]
8. Tekxai - MVP Timeline[^19]

<div align="center">⁂</div>

[^1]: https://www.verifiedmarketreports.com/product/home-inventory-apps-market/

[^2]: https://dataintelo.com/report/home-inventory-apps-market

[^3]: https://smarthomeadmin.com/blog/ai-home-inventory-apps/

[^4]: https://www.spullio.com/alternatives

[^5]: 00-project-brief.md

[^6]: https://flatlogic.com/blog/how-to-build-an-inventory-management-application/

[^7]: https://www.wiseguyreports.com/reports/home-inventory-apps-market

[^8]: https://brightharbor.com/blog/the-best-apps-to-help-you-catalog-everything-inside-your-home

[^9]: https://www.greatguysmove.com/blog/reviews-best-home-inventory-apps/

[^10]: https://www.skywareinventory.com/blog/top-home-inventory-software

[^11]: https://www.zdnet.com/home-and-office/work-life/have-a-lot-of-stuff-to-track-my-5-favorite-home-inventory-apps-can-help/

[^12]: https://www.reddit.com/r/HomeImprovement/comments/1752y0u/feedback_on_home_inventory_app_idea/

[^13]: https://www.reddit.com/r/homeautomation/comments/fcvaxy/home_inventory_system/

[^14]: https://www.reddit.com/r/homeautomation/comments/1m84q8n/home_inventory_manager/

[^15]: https://www.linkedin.com/pulse/top-home-inventory-apps-companies-how-compare-them-2025-nexiqq-labs-gi7ke

[^16]: https://cliffex.com/product-engineering/app-development/mobile-app-integration-services-third-party-api-integration/

[^17]: https://www.easyreplenish.com/blog/top-inventory-management-challenges-their-solutions

[^18]: https://www.nexdriver.com/nexpertise/challenges-in-implementing-inventory-management-software-what-to-expect

[^19]: https://tekxai.com/mvp-app-development-timeline/

