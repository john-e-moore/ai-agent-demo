You are Cursor's AI agent, starting from a fresh Next.js 14+ TypeScript app (App Router) with Tailwind already wired up. The only existing asset is a logo at `public/images/logo.png`. Rebuild the following single-page app exactly, with clean, idiomatic code and no dead files.

**Goal**
Create an interactive "TLG Macro Dashboard" that lets me compare two FRED time series, visualize them over time with shaded NBER recessions, and export the current chart view as a PNG. The experience should feel like a polished internal tool, not a toy demo.

**High-level UX**
- Use the App Router with a single route at `/`.
- Global layout:
  - Top header bar on a subtle light-gray background, full-width, with a white, slightly translucent header.
  - On the left of the header, render the logo from `/images/logo.png` using `next/image` inside a fixed-size container so the logo scales nicely, plus the text label `TLG Macro Dashboard` as the product name.
  - On the right of the header (desktop only), show a small caption in muted text: `Data via FRED® (Federal Reserve Economic Data)`.
  - Below the header, the main content is centered with a max width of about 6xl, light gray page background, and a white card-style content area.
- Landing content:
  - Page title: `Interactive FRED series dashboard`.
  - Short subtitle: “Select up to two FRED series, view them over time with shaded NBER recessions, and export the current chart as a PNG.”

**Page structure**
- The main dashboard section is a responsive 2-column layout on desktop, stacked on mobile:
  - **Left card: "Labor-market series selection"**
    - Card-style panel with border, white background, light shadow.
    - Small title: `Labor-market series selection`.
    - Short helper text: “Choose two labor-market series (metric and age band) to compare. Data is fetched directly from the FRED API.”
    - Two stacked “Series” rows: `Series A` and `Series B`.
      - Each row has:
        - A `Metric` `<select>` and an `Age band` `<select>`, side by side on desktop, stacked on mobile.
        - Metrics to choose from (IDs and human labels):
          - `unemployment` → `Unemployment rate`
          - `participation` → `Labor force participation rate`
          - `earnings` → `Median weekly earnings`
          - `cpi` → `CPI, annualized monthly % change`
          - `real_gdp` → `Real GDP (chained 2017 dollars, annual rate)`
        - Age bands to choose from:
          - `all` → `All workers (16 years and over)`
          - `age_16_19` → `16–19 year-olds`
          - `age_20_24` → `20–24 year-olds`
          - `age_25_54` → `25–54 year-olds`
          - `age_55_plus` → `55 years and over`
      - Behavior:
        - For `unemployment` and `participation`, all age bands above are valid.
        - For `earnings`, `cpi`, and `real_gdp`, only the `all` band is valid; force the age band to `all` when those metrics are selected, and render the other age-band options as disabled with a hint like “(all workers only)”.
        - Below the row, if the metric doesn’t support age breakdowns, show a tiny explanatory note. For example, for `earnings`: “Median weekly earnings are only available for all workers in this demo.”
      - Sensible defaults:
        - Series A: `metric = unemployment`, `ageBand = all`.
        - Series B: `metric = participation`, `ageBand = all`.
  - **Right card: Chart + controls**
    - Card-style panel with:
      - Title: `Chart`.
      - Subtitle: `Shaded regions indicate NBER recession periods.`
      - Top-right cluster of controls:
        - Date range: two small `type="date"` inputs labeled `From` and `To`, bound to the available data range. Disable them if no data is loaded yet.
        - Checkbox: `Dual y-axes`. When checked, the second selected series should render on a right-side y-axis with its own scale.
        - Button: `Download PNG` that exports the current chart as a PNG file. Disable when there is no data to export.
      - Chart area:
        - While data is loading after a fetch, overlay a semi-transparent white loading layer with the message: `Fetching data from FRED…`.
        - If there is an error fetching data, show a small red error box with the error message.
        - Otherwise, render a time-series line chart with shaded NBER recessions.

**Data model & FRED integration**
- Use a `lib/fred.ts` module to centralize:
  - Type definitions for:
    - `LaborMetricId`
    - `AgeBandId`
    - `FredSeriesId`
    - Observations and normalized responses.
  - A lookup table mapping labor-metric + age-band combinations to concrete FRED series IDs and labels:
    - Unemployment rate:
      - `UNRATE` — all workers.
      - `LNS14000012` — 16–19.
      - `LNS14000036` — 20–24.
      - `LNS14000089` — 25–54.
      - `LNS14000097` — 55+.
    - Labor-force participation:
      - `CIVPART` — all workers.
      - `LNS11300012` — 16–19.
      - `LNS11300036` — 20–24.
      - `LNS11300060` — 25–54.
      - `LNS11300097` — 55+.
    - Median weekly earnings (all workers): `LEU0252881600A`.
    - CPI index (all items, all urban consumers): `CPIAUCSL`.
    - Real GDP (chained 2017 dollars, annual rate): `A191RL1Q225SBEA`.
  - A helper like `findLaborSeriesConfig(metric, ageBand)` that returns the right series definition (id + user-facing label) or `undefined`.
  - A `fetchFredSeries(seriesId)` helper that:
    - Reads `process.env.FRED_API_KEY` and throws a clear error if it’s missing.
    - Fetches observations from the FRED API (JSON) starting from `"1950-01-01"`, with `cache: "no-store"`.
    - Cleans the raw data:
      - Convert `"."` and empty values to `null`.
      - Parse numeric strings to numbers, leaving invalid values as `null`.
    - For CPI (`CPIAUCSL`), convert the index level to **annualized monthly percent change**:
      - For each month \(t\) with value \(P_t\) and previous month \(P_{t-1}\), compute \( (P_t / P_{t-1})^{12} - 1 \) in percent form; the first observation should be `null` because there’s no prior month.
    - Return a normalized structure containing:
      - The series id.
      - A human-readable title (from the lookup table above).
      - Units (for CPI, say `Percent, annualized monthly change`; otherwise, use the units from the API if available).
      - A flat array of `{ date, value }` observations with `date` as ISO strings.
  - A `fetchFredSeriesBundle(seriesIds: FredSeriesId[])` helper that:
    - Deduplicates the requested IDs.
    - Fetches each series in parallel via `fetchFredSeries`.
    - Builds a union-sorted list of dates across all series.
    - For each series, aligns values to this master date list (filling missing observations with `null`), and returns:
      - `dates: string[]`.
      - `series: { id, title, units, frequency: string | null, values: (number | null)[] }[]`.
- Back-end API:
  - Implement a single route handler at something like `app/api/fred/route.ts` that accepts a `POST` body `{ seriesIds: FredSeriesId[] }`, calls `fetchFredSeriesBundle`, and returns the normalized bundle as JSON.
  - Handle and surface errors with clear messages (e.g., missing FRED key, upstream FRED errors, or invalid body).

**Recession shading data**
- Add a `lib/recessions.ts` module that exports a typed `NBER_RECESSIONS` array of approximate NBER recessions as `{ start: string; end: string }` pairs, expressed as month-level ISO dates (YYYY-MM-01). Include at least these ranges:
  - 1948-11 to 1949-10
  - 1953-07 to 1954-05
  - 1957-08 to 1958-04
  - 1960-04 to 1961-02
  - 1969-12 to 1970-11
  - 1973-11 to 1975-03
  - 1980-01 to 1980-07
  - 1981-07 to 1982-11
  - 1990-07 to 1991-03
  - 2001-03 to 2001-11
  - 2007-12 to 2009-06
  - 2020-02 to 2020-04

**Chart implementation**
- Use `react-chartjs-2` with Chart.js line charts (register the minimal set of chart components and plugins you need).
- Encapsulate the chart in a `DashboardChart` component that:
  - Accepts the normalized bundle `{ dates, series[] }`, the currently selected series IDs, whether dual y-axes is enabled, and the min/max date filters.
  - Filters the global `dates` array to those within the selected range (inclusive), and projects each series’ values to this filtered date list.
  - Uses a small, tasteful color palette for up to three lines (e.g., blue, green, orange), with semi-transparent fills and no visible points (lines only).
  - Enables index-based tooltips, a compact legend, modest grid lines, and a responsive layout.
  - Supports optional `y2` on the right when dual y-axes is enabled (e.g., second series mapped to `y2` with its own scale and grid disabled).
  - If there’s no data yet, shows a dashed border placeholder card with a friendly message like:
    - If at least one series is selected: “Fetching data from FRED for the selected series…”
    - If no series is selected: “Choose at least one series to see a chart.”
- Recession shading:
  - Implement a Chart.js plugin that, on each render, reads the x-axis labels (dates) and draws semi-transparent vertical rectangles across the chart background for each recession range in `NBER_RECESSIONS`.
  - Use a subtle slate-gray color (low alpha) so the recessions are clearly visible but not overpowering the data.

**Client-side dashboard logic**
- Implement a client component (e.g., `app/dashboard.tsx`) that:
  - Manages:
    - Series selection state for Series A and Series B.
    - The currently fetched `FredSeriesResponse | null`.
    - Loading and error states.
    - Dual y-axis toggle state.
    - Available data min/max dates and the user’s selected min/max dates.
  - Derives the active FRED series IDs for A and B from the metric + age-band selections using `findLaborSeriesConfig`, making sure you don’t request the same series twice if A and B point to the same underlying FRED ID.
  - On any change in the active series IDs, fetches fresh data via the `/api/fred` endpoint; debouncing isn’t strictly required but don’t refetch unnecessarily.
  - Whenever new data arrives, updates the available min/max dates from the bundle’s `dates` array and clamps the selected min/max dates to this range.
  - Keeps the `From`/`To` date inputs in sync with the selected min/max dates and enforces `From ≤ To`, adjusting the other bound if needed when the user types something inconsistent.
  - Exposes a `ref` or callback to the `DashboardChart` so that hitting `Download PNG` can call `chartInstance.toBase64Image("image/png", 1)` and trigger a browser download of the current chart as `fred-dashboard.png`.

**Root layout & styling**
- Use `next/font` (e.g., Geist or similar) for a clean sans-serif + mono pair and wire them through CSS variables.
- In `app/layout.tsx`, set:
  - `title`: `FRED Dashboard`.
  - `description`: `Interactive FRED time-series dashboard with PNG export.`
- In the body, apply:
  - A light slate-gray background, dark-slate text color, and antialiasing.
  - A full-height container with the header at the top and the main content below, using Tailwind for spacing, borders, and shadows.
- Global CSS:
  - Keep it minimal; rely primarily on Tailwind utilities with a small font-family override to hook up the app to the chosen font variables.

**Behavior & correctness requirements**
- Assume a `.env.local` file will be provided with `FRED_API_KEY`. If it’s missing or invalid, surface a clear, user-friendly error in the UI rather than silently failing.
- The app should work entirely from the browser at `/` with no manual wiring after running `npm install` and `npm run dev`.
- Keep the implementation tight and readable: no dead code, no unused components, no placeholder routes. This is a focused single-screen experience.

Make the final app match this description as closely as possible, with a polished look-and-feel, so that when I drop this prompt into Cursor’s Plan mode against a fresh Next.js repo (with only the logo present), it recreates the dashboard end-to-end.


