## FRED Dashboard

Interactive single-page dashboard built with Next.js and Tailwind CSS. Compare two labor-market series (e.g., unemployment vs labor force participation for 16–19 year-olds), visualize them over time with shaded NBER recessions, and export the chart as a PNG.

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

- Choose the metric (unemployment, labor force participation, or median weekly earnings) and age band (all workers or 16–19 year-olds) for Series A and Series B on the left.
- The chart on the right will fetch data from the FRED API and render the selected series with vertical shaded bands for NBER recessions and a subtle logo watermark in the background.
- Optionally enable **Dual y-axes** next to the chart title when comparing series with very different scales (for example, unemployment vs median weekly earnings).
- Click **Download PNG** to export the current chart view as a PNG image.

