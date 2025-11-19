## FRED Dashboard

Interactive single-page dashboard built with Next.js and Tailwind CSS. Select up to three FRED series, visualize them over time with shaded NBER recessions, attach notes, and export the chart as a PNG.

### Prerequisites

- Node.js 18+ and npm
- A FRED API key from the Federal Reserve Bank of St. Louis

Create a `.env.local` file in the project root:

```bash
FRED_API_KEY=your_fred_api_key_here
```

### Install & run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Usage

- Choose up to three FRED series from the dropdowns on the left.
- The chart on the right will fetch data from the FRED API and render the series with vertical shaded bands for NBER recessions.
- Write a short note in the note box and click **Save note**; the note is stored in `localStorage` and keyed by the active series selection.
- Click **Download PNG** to export the current chart view as a PNG image.

