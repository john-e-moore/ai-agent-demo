<!-- 8ebe485d-fe7d-48c2-b207-f84692052b8b b0c8725a-e5ce-4b6f-97db-f6764711938c -->
## Fix FRED API route errors

### Error definition

- **Duplicate symbols in `app/api/fred/route.ts`**: The file currently contains two separate implementations, each importing `NextResponse` and exporting a `POST` handler, which causes `NextResponse` and `POST` to be defined multiple times.
- **Out-of-date imports from `lib/fred.ts`**: One block in `route.ts` tries to import `normalizeFredSeries` (no longer exported) and uses an incorrect relative path (`../../../lib/fred`), while another block imports from `../../../../lib/fred`. This leads to both a *module not found* error and a *missing export* (`normalizeFredSeries`) error.
- **Resulting behavior**: The dashboard initially loads, but calls to `/api/fred` return 500s during compilation/first request because the route cannot be compiled successfully.

### Plan to fix

1. **Simplify imports in `app/api/fred/route.ts`**

- Remove the older import block that pulls in `normalizeFredSeries`, `fetchFredSeries`, and `NextRequest`, along with its associated `POST` implementation.
- Keep a single import from `"../../../../lib/fred"` that brings in only `type FredSeriesId` and `fetchFredSeriesBundle`, which match the current `lib/fred.ts` exports.

2. **Keep a single `POST` handler**

- Use the newer, simpler `POST(request: Request)` implementation that:
- Parses `seriesIds` from the JSON body as `FredSeriesId[]`.
- Returns an empty `{ dates: [], series: [] }` payload when no IDs are provided.
- Calls `fetchFredSeriesBundle(seriesIds)` and returns its result via `NextResponse.json`.
- Catches errors and maps missing `FRED_API_KEY` or network failures into a JSON `{ error }` with appropriate status.

3. **Verify build and runtime**

- Run `npm run dev` and confirm there are no more compilation errors for `app/api/fred/route.ts`.
- Load the dashboard, select a few FRED series, and confirm:
- `/api/fred` returns 200 with normalized data.
- The chart renders without 500 errors and can still export PNG and show notes.

### To-dos

- [x] Scaffold Next.js App Router project with TypeScript and Tailwind CSS, including base config and globals.
- [x] Create app layout with header using logo from public/images/logo.png and responsive shell.
- [x] Implement main dashboard page with series selectors, note area, chart container, and export button wiring.
- [x] Implement FRED helper library and Next.js API route to fetch/normalize series data.
- [ ] Remove legacy/duplicate imports and POST handler from app/api/fred/route.ts so only the new implementation remains.