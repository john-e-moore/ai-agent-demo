<!-- 5f58ad14-133d-43c8-9f87-72e2118482cf 5860003a-06b1-4145-b0a2-337801b43e08 -->
# Remove note-taking from FRED dashboard

## Goal

Fully remove the note-taking feature from the FRED dashboard so that users can only select series, view charts (with recessions), and export PNGs, with no note UI, state, storage, or documentation.

## High-level approach

- Strip out all note-related UI components and props.
- Remove all note-related local state and localStorage wiring.
- Update copy/metadata/docs so the app no longer advertises notes.
- Verify the dashboard still works (series selection, charting, date filters, dual axes, PNG export).

## Step-by-step plan

### 1. Remove the dedicated note editor component

- Delete `components/NoteEditor.tsx` once all imports/usages are removed.
- Before deletion, remove the `NoteEditor` import and JSX usage from `app/dashboard.tsx` so the left-hand panel only contains the series selection controls.
- Adjust spacing in that panel (e.g., remove the `pt-2` wrapper around the note editor) so the layout still looks balanced.

### 2. Strip note state and storage from the dashboard shell

- In `app/dashboard.tsx`:
- Remove the `note` state (`useState("")`) and any calls to `setNote` that are only for notes.
- Remove `selectionKey`, `currentKey`, `loadNoteForSelection`, and `handleSaveNote` helpers that read/write `localStorage` keys like `fred-dashboard-note:*`.
- Remove the `useEffect` that calls `loadNoteForSelection(currentKey)`.
- Ensure the remaining dashboard logic only handles:
- series selection (`SelectionState` and `handleSeriesSelectionChange`),
- data fetching (`fetchData` and FRED API integration),
- date range controls,
- dual-axis toggle,
- PNG export.

### 3. Simplify the chart component props and rendering

- In `components/DashboardChart.tsx`:
- Remove the `note` prop from `DashboardChartProps` and from the function signature.
- Remove the conditional UI that renders the note below the chart (`Note: ...`) and any placeholder copy that references a saved note.
- Update the empty-state message to no longer mention notes; keep a simple "choose a series" / "fetching data" message instead.
- In `app/dashboard.tsx`, update the `<DashboardChart />` usage to stop passing `note` and only pass the data, selected series, dual-axis flag, date range, and `onChartReady`.

### 4. Update metadata, copy, and docs

- In `app/layout.tsx`, update `metadata.description` to remove "with notes" (e.g., "Interactive FRED time-series dashboard with PNG export.").
- In `README.md`, update the description and usage bullets to remove references to writing/saving notes and localStorage; keep only series selection, chart display, recessions, dual axes, and PNG export.
- Optionally, update `initial_prompt.md` or any other internal docs that describe the app as including notes, so future contributors see the current scope.

### 5. Clean up and verify

- Run TypeScript build/lint (e.g., `npm run lint` / `npm run build`) to catch any leftover `note` references or unused imports after removal.
- Start the dev server and manually verify:
- The dashboard loads without runtime errors.
- Series selection, date filters, and dual axes work as before.
- PNG export still downloads the chart as expected.
- There is no UI for notes anywhere and no code paths referencing `localStorage` note keys.

### To-dos

- [ ] Remove `NoteEditor` usage from `app/dashboard.tsx` and then delete `components/NoteEditor.tsx`.
- [ ] Strip all note-related state, helpers, effects, and localStorage access from `app/dashboard.tsx`.
- [ ] Remove the `note` prop and associated rendering from `components/DashboardChart.tsx` and update its usage in `app/dashboard.tsx`.
- [ ] Update metadata description in `app/layout.tsx` and all note-related text in `README.md` (and any internal docs) to no longer mention notes.
- [ ] Run lint/build, then manually verify the dashboard works without note UI or storage references.