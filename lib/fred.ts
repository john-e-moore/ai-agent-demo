export type FredSeriesId =
  | "GDP"
  | "UNRATE"
  | "CPIAUCSL"
  | "FEDFUNDS"
  | "DGS10";

export type FredSeriesOption = {
  id: FredSeriesId;
  label: string;
};

export const FRED_SERIES_OPTIONS: FredSeriesOption[] = [
  {
    id: "GDP",
    label: "Real Gross Domestic Product (quarterly, chained 2017 dollars)",
  },
  {
    id: "UNRATE",
    label: "Unemployment Rate (monthly, %)",
  },
  {
    id: "CPIAUCSL",
    label: "CPI for All Urban Consumers (monthly, index)",
  },
  {
    id: "FEDFUNDS",
    label: "Effective Federal Funds Rate (daily, %)",
  },
  {
    id: "DGS10",
    label: "10-Year Treasury Constant Maturity Rate (daily, %)",
  },
];

export type FredObservation = {
  date: string;
  value: number | null;
};

export type FredSeriesNormalized = {
  id: FredSeriesId;
  title: string;
  units: string | null;
  frequency: string | null;
  observations: FredObservation[];
};

export type FredSeriesResponse = {
  dates: string[];
  series: {
    id: FredSeriesId;
    title: string;
    units: string | null;
    frequency: string | null;
    values: (number | null)[];
  }[];
};

type FredApiObservation = {
  date: string;
  value: string;
};

type FredApiSeriesResponse = {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FredApiObservation[];
};

const FRED_API_BASE = "https://api.stlouisfed.org/fred";

export async function fetchFredSeries(
  seriesId: FredSeriesId,
): Promise<FredSeriesNormalized> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FRED_API_KEY is not set. Add it to your environment to fetch data.",
    );
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    observation_start: "1950-01-01",
  });

  const url = `${FRED_API_BASE}/series/observations?${params.toString()}`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `FRED request failed for ${seriesId} with status ${res.status}.`,
    );
  }

  const json = (await res.json()) as FredApiSeriesResponse;

  const observations: FredObservation[] = json.observations.map((obs) => {
    const trimmed = obs.value.trim();
    if (trimmed === "." || trimmed === "") {
      return { date: obs.date, value: null };
    }
    const parsed = Number.parseFloat(trimmed);
    return {
      date: obs.date,
      value: Number.isFinite(parsed) ? parsed : null,
    };
  });

  return {
    id: seriesId,
    title:
      FRED_SERIES_OPTIONS.find((option) => option.id === seriesId)?.label ??
      seriesId,
    units: json.units ?? null,
    frequency: json.observation_end ? null : null,
    observations,
  };
}

export async function fetchFredSeriesBundle(
  seriesIds: FredSeriesId[],
): Promise<FredSeriesResponse> {
  if (seriesIds.length === 0) {
    return { dates: [], series: [] };
  }

  const uniqueIds = Array.from(new Set(seriesIds));

  const series = await Promise.all(uniqueIds.map((id) => fetchFredSeries(id)));

  const dateSet = new Set<string>();
  for (const item of series) {
    for (const obs of item.observations) {
      dateSet.add(obs.date);
    }
  }

  const dates = Array.from(dateSet).sort();

  const seriesWithValues = series.map((item) => {
    const byDate = new Map<string, number | null>();
    for (const obs of item.observations) {
      byDate.set(obs.date, obs.value);
    }
    const values = dates.map((date) => byDate.get(date) ?? null);
    return {
      id: item.id,
      title: item.title,
      units: item.units,
      frequency: item.frequency,
      values,
    };
  });

  return {
    dates,
    series: seriesWithValues,
  };
}

