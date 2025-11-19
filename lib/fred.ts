export type LaborMetricId = "unemployment" | "participation" | "earnings";

export type AgeBandId = "all" | "age_16_19";

export type FredSeriesId =
  // Unemployment rate
  | "UNRATE" // Unemployment Rate: 16 years and over
  | "LNS14000012" // Unemployment Rate: 16 to 19 years
  // Labor force participation
  | "CIVPART" // Labor Force Participation Rate: 16 years and over
  | "LNS11300012" // Labor Force Participation Rate: 16 to 19 years
  // Median usual weekly earnings (all workers)
  | "LEU0252881600A";

export type LaborSeriesConfig = {
  id: FredSeriesId;
  metric: LaborMetricId;
  ageBand: AgeBandId;
  label: string;
};

export const LABOR_SERIES_CONFIG: LaborSeriesConfig[] = [
  {
    id: "UNRATE",
    metric: "unemployment",
    ageBand: "all",
    label: "Unemployment rate, all workers (16 years and over)",
  },
  {
    id: "LNS14000012",
    metric: "unemployment",
    ageBand: "age_16_19",
    label: "Unemployment rate, 16 to 19 year-olds",
  },
  {
    id: "CIVPART",
    metric: "participation",
    ageBand: "all",
    label: "Labor force participation rate, all workers (16 years and over)",
  },
  {
    id: "LNS11300012",
    metric: "participation",
    ageBand: "age_16_19",
    label: "Labor force participation rate, 16 to 19 year-olds",
  },
  {
    id: "LEU0252881600A",
    metric: "earnings",
    ageBand: "all",
    label:
      "Median usual weekly real earnings, full-time wage and salary workers (16 years and over)",
  },
];

export const LABOR_METRICS: { id: LaborMetricId; label: string }[] = [
  {
    id: "unemployment",
    label: "Unemployment rate",
  },
  {
    id: "participation",
    label: "Labor force participation rate",
  },
  {
    id: "earnings",
    label: "Median weekly earnings",
  },
];

export const AGE_BANDS: { id: AgeBandId; label: string }[] = [
  {
    id: "all",
    label: "All workers (16 years and over)",
  },
  {
    id: "age_16_19",
    label: "16–19 year-olds",
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

export function findLaborSeriesConfig(
  metric: LaborMetricId,
  ageBand: AgeBandId,
): LaborSeriesConfig | undefined {
  return LABOR_SERIES_CONFIG.find(
    (config) => config.metric === metric && config.ageBand === ageBand,
  );
}

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
      LABOR_SERIES_CONFIG.find((option) => option.id === seriesId)?.label ??
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

