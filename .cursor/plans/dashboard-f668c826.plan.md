<!-- f668c826-dc29-4ac1-acd7-97818983425c d08d974d-98ff-42bd-ac5a-26830adae3d2 -->
## CPI change, age-band fixes, GDP, and logo prominence

### Goals

- Use **monthly annualized CPI changes** instead of the CPI level in the chart.
- Fix **400 errors** for specific age bands (20–24 and 55+) by correcting or disabling invalid FRED series.
- Add **real GDP (A191RL1Q225SBEA)** as a selectable series.
- Make the **header logo more prominent and legible**.

### Data and transformation changes

- **Switch CPI metric to annualized monthly change** in `lib/fred.ts` and downstream consumers:
- Keep `CPIAUCSL` as the underlying series, but document that the `cpi` metric represents the annualized month-over-month percentage change.
- Implement a small helper (e.g., `toAnnualizedMonthlyChange(observations)`) that, for each month \(t\), computes a rate based on \( CPI_t \) and \( CPI_{t-1} \) (e.g., \(((CPI_t / CPI_{t-1})^{12} - 1) * 100\)), returning a new observation array with `null` for the first point.
- Integrate this helper in `fetchFredSeries` only when `seriesId === "CPIAUCSL"` (or when `metric === "cpi"` if you prefer a config-driven approach), so all CPI values passed into `FredSeriesResponse` are already transformed.

- **Fix invalid age-band series IDs causing 400s**:
- Cross-check the FRED series IDs used for 20–24 and 55+ unemployment/participation in `FredSeriesId` and `LABOR_SERIES_CONFIG` in `lib/fred.ts` against FRED docs.
- Replace any incorrect IDs (e.g., if `LNS14000016` or other codes are wrong) with valid ones; if a particular age band truly lacks data for a metric, remove that `LABOR_SERIES_CONFIG` entry and let the UI simply not offer that combination.
- After adjusting, run a quick manual test for each age band option in the UI to confirm successful responses and that no 400 errors surface in the chart panel.

- **Add real GDP series**:
- Extend `FredSeriesId` with `"A191RL1Q225SBEA"` and add a new `LaborMetricId` (e.g., `"gdp"`) or repurpose a more general metric name like `"real_gdp"`.
- Add a `LABOR_SERIES_CONFIG` entry for this GDP series with `ageBand: "all"` and a clear label (e.g., "Real GDP, chained 2017 dollars (annual rate)") and no age breakdown.
- Append a corresponding entry to `LABOR_METRICS` so it appears in the metric dropdown; treat it similarly to CPI/earnings as an all-workers aggregate.

### UI and behavior updates

- **Metric support for age bands** (already partially generalized):
- Update the existing `metricSupportsAgeBands` helper in `app/dashboard.tsx` to treat the new GDP metric the same way as CPI and earnings (i.e., no age breakdown, force `all`).
- Verify that the explanatory helper text beneath the selectors correctly handles both CPI and GDP (e.g., neutral wording like "This series is only available as an aggregate index in this demo (no age breakdowns)").

- **Chart display for CPI and GDP**:
- Confirm that the transformed CPI change series is clearly labeled in the legend (e.g., "CPI, annualized monthly % change"), either via `LABOR_SERIES_CONFIG` label text or direct use of the FRED metadata.
- Ensure that both CPI and GDP continue to work with dual y-axes and respect the existing date-range filter (the transformation should occur before bundling; the date filter just slices the transformed data).

### Header logo prominence

- **Increase logo size and readability in `app/layout.tsx`**:
- Enlarge the logo container (e.g., `h-12 w-12` or larger) and consider setting an explicit `sizes` value matching the new size to avoid blurry rendering.
- Optionally give the logo a bit more horizontal space from the title (increasing the gap or adjusting flex alignment) so the image can visually dominate.
- Verify on a standard laptop viewport that the logo text is clearly legible without zooming and that the header still looks balanced at mobile breakpoints.

### Verification

- **Functional checks**:
- Manually step through each metric (unemployment, participation, earnings, CPI change, GDP) and ensure that all allowed age-band combinations load without FRED errors.
- Compare CPI annualized monthly changes for a few dates against an external calculator (spot check only) to validate the transformation.
- Check that GDP, being quarterly, still renders sensibly on the monthly x-axis alongside monthly series and responds to the date filter without crashes.
- **Visual/UX checks**:
- Confirm that CPI’s new units (percentage change) are intuitive from the legend and tooltip text.
- Ensure the header logo is now visually prominent and that the rest of the layout still feels cohesive.

### To-dos

- [x] Transform CPI series to monthly annualized percentage change in lib/fred.ts and update labels to reflect change rather than level.
- [x] Validate and correct or remove FRED series IDs for 20–24 and 55+ unemployment/participation age bands in lib/fred.ts to eliminate 400 errors.
- [x] Add real GDP (A191RL1Q225SBEA) as a metric/series in lib/fred.ts and wire it into LABOR_METRICS and LABOR_SERIES_CONFIG as an all-workers aggregate.
- [x] Adjust dashboard metric/age-band UI and labels to account for CPI change and GDP as aggregate-only metrics and ensure chart display (legend, tooltips, date filter) remains clear.
- [x] Further increase the header logo size/readability in app/layout.tsx while keeping the header layout balanced across breakpoints.