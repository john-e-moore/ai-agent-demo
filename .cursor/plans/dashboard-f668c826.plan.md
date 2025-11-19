<!-- f668c826-dc29-4ac1-acd7-97818983425c d08d974d-98ff-42bd-ac5a-26830adae3d2 -->
# FRED Dashboard: Age Bands, CPI, Branding, and Date Filters

## Goals

- Surface **all relevant age subgroups** for labor-market series instead of only 16–19 year-olds.
- Add **CPI** as an additional metric choice alongside unemployment, participation, and earnings.
- Remove the **chart watermark** to keep the plot area clean.
- Make the **header logo more prominent** and remove its rounded/gray treatment.
- Add **min/max date filters** so users can restrict the charted time window.

## Data model and config updates

- **Extend age-band coverage** in `lib/fred.ts`:
- Add new `AgeBandId` values (e.g., 20–24, 25–54, 55+ or whatever final set you want) and corresponding entries in `AGE_BANDS` with clear labels.
- For each new age band, add matching `LABOR_SERIES_CONFIG` entries for unemployment and participation using the appropriate FRED series IDs, keeping `earnings` as `ageBand: "all"` only.
- Ensure `FredSeriesId` union is updated to include all new labor series and remains the single source of truth for valid IDs.
- **Introduce CPI metric** in `lib/fred.ts`:
- Add a new `LaborMetricId` value (e.g. `"cpi"`) and extend `LABOR_METRICS` with a human-readable label like "Consumer Price Index (CPI-U)".
- Add at least one CPI series (e.g., `CPIAUCSL`) to `FredSeriesId` and `LABOR_SERIES_CONFIG` with a clear label indicating coverage and units.
- Decide that CPI, like earnings, uses the `"all"` age band only and enforce this via config (no age-specific CPI options in `LABOR_SERIES_CONFIG`).

## Dashboard UI and state updates

- **Series selection behavior** in `app/dashboard.tsx`:
- Reuse the expanded `AGE_BANDS` list so each series row can pick from the full set of age subgroups for metrics that support them.
- Generalize the existing `earningsAllOnly` logic to something like `metricSupportsAgeBands(metric)` so both `earnings` and `cpi` force `ageBand: "all"` and show an explanatory helper text.
- Confirm that `DEFAULT_SELECTION` remains sensible (e.g., unemployment/participation for `"all"` workers) and optionally add a preset where one of the series is CPI.

## Chart behavior and watermark removal

- **Remove the watermark** in `components/DashboardChart.tsx`:
- Delete the absolutely positioned overlay `div` with the logo `img` so the chart area is clean, leaving the NBER recession shading plugin as-is.
- **Prepare for date filtering**:
- Add optional `minDate` / `maxDate` props to `DashboardChart` and use them to derive filtered `labels` and dataset `values` (only include dates within the selected range).
- Ensure tooltip, legend, and recession shading continue to work correctly when labels are subsetted.

## Date-range filter UI and wiring

- **State and derivation in `app/dashboard.tsx`**:
- After data is loaded, compute the overall available min/max date from `data.dates` and store them in state.
- Add controlled state for `selectedMinDate` and `selectedMaxDate`, defaulting to the full available range.
- **User-facing controls**:
- In the chart panel header (near "Chart" / dual-axis toggle / Download button), add two `input type="date"` controls labeled "From" and "To".
- Bind their `min`/`max` attributes to the overall data range and ensure invalid selections (min after max, or vice versa) are either clamped or prevented with simple validation.
- **Plumbing into the chart**:
- Pass the current `selectedMinDate` / `selectedMaxDate` from `Dashboard` into `DashboardChart` via new props.
- In `DashboardChart`, slice `data.dates` and each series `values` array according to the selected range before constructing `labels` and `datasets`.

## Header/logo styling refinements

- **Update layout header in `app/layout.tsx`**:
- Increase the logo container footprint (e.g., bump height/width, adjust padding) and remove the gray `bg-slate-100`, border ring, and rounded corners so the logo stands out more naturally.
- Optionally place the logo and title on a slightly larger flex row or adjust typography (`text-base`/`text-lg` weight) to emphasize branding without disrupting the rest of the layout.

## Validation and polish

- **Functional checks**:
- Verify that all combinations of metric + age band that exist in `LABOR_SERIES_CONFIG` successfully fetch data and render (no missing-series errors).
- Confirm that CPI can be selected in either series slot, works with dual y-axes, and that the units difference versus labor metrics is visually manageable.
- Exercise the date filter across several ranges (early history, Great Recession, COVID, recent years) to ensure the chart updates smoothly and recession shading aligns.
- **UX passes**:
- Ensure the new age-band dropdown remains readable and scannable even with the expanded list.
- Check that the header logo treatment matches your desired visual weight and that removing the chart watermark improves clarity without making the chart feel empty.

### To-dos

- [ ] Expand AgeBandId, AGE_BANDS, FredSeriesId, and LABOR_SERIES_CONFIG in lib/fred.ts to cover all desired age subgroups for unemployment and participation.
- [ ] Introduce a CPI metric and series in lib/fred.ts, wiring it into LABOR_METRICS and LABOR_SERIES_CONFIG and constraining it to the all-workers age band.
- [ ] Adjust app/dashboard.tsx series selection logic and helper text so metrics that do not support age bands (earnings, CPI) force the all-workers band while others use the full age-band list.
- [ ] Add min/max date state and date-input controls in app/dashboard.tsx and plumb selected range into DashboardChart so labels and values are sliced accordingly.
- [ ] Remove the chart watermark overlay in DashboardChart.tsx and adjust header logo styling in layout.tsx to be larger and without rounded/gray background.