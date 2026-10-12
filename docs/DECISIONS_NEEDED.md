# Decisions needed before live-data deployment

The mock V1 and recoverable Git project do not depend on these answers. They are
needed before enabling real EOD refreshes or publishing the site.

1. **Market-data provider**
   - Whether an FMP subscription is available and which plan.
   - Whether Yahoo/yfinance is acceptable for private prototyping.
   - The selected provider's display/redistribution terms for the intended
     Netlify visibility.

2. **Site access**
   - Private/personal-only or public.
   - Preferred Netlify site name/custom domain.
   - Whether Netlify access controls are required.

3. **Refresh timing**
   - Preferred post-market refresh time.
   - Whether weekday Netlify deploy triggers are acceptable despite exchange
     holidays (the pipeline will validate the effective market date).
   - Whether the local macOS dataset-only schedule should also be installed.

4. **Universe policy**
   - Confirm initial market-cap thresholds: mega >= $200B and large
     $10B–$200B.
   - Any explicit inclusions/exclusions (ADRs, dual listings, REITs).

5. **Branding**
   - Keep the working name “Stock Research” or provide a final product name.

Do not send credentials in chat or commit them. Add provider keys in local
`.env` and Netlify's environment-variable settings, and add the Netlify build
hook as the GitHub secret `NETLIFY_BUILD_HOOK`.
