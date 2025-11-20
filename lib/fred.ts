export type LaborMetricId =
  | "unemployment"
  | "participation"
  | "earnings"
  | "cpi"
  | "real_gdp";

export type AgeBandId =
  | "all"
  | "age_16_19"
  | "age_20_24"
  | "age_25_54"
  | "age_55_plus";

/**
 * FRED series identifier.
 *
 * For curated labor-market series we still use concrete IDs (e.g. "UNRATE"),
 * but this type is widened to allow *any* FRED series ID returned by the API.
 */
export type FredSeriesId = string;

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
    id: "LNS14000036",
    metric: "unemployment",
    ageBand: "age_20_24",
    label: "Unemployment rate, 20 to 24 year-olds",
  },
  {
    id: "LNS14000089",
    metric: "unemployment",
    ageBand: "age_25_54",
    label: "Unemployment rate, 25 to 54 year-olds",
  },
  {
    id: "LNS14000097",
    metric: "unemployment",
    ageBand: "age_55_plus",
    label: "Unemployment rate, 55 years and over",
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
    id: "LNS11300036",
    metric: "participation",
    ageBand: "age_20_24",
    label: "Labor force participation rate, 20 to 24 year-olds",
  },
  {
    id: "LNS11300060",
    metric: "participation",
    ageBand: "age_25_54",
    label: "Labor force participation rate, 25 to 54 year-olds",
  },
  {
    id: "LNS11300097",
    metric: "participation",
    ageBand: "age_55_plus",
    label: "Labor force participation rate, 55 years and over",
  },
  {
    id: "LEU0252881600A",
    metric: "earnings",
    ageBand: "all",
    label:
      "Median usual weekly real earnings, full-time wage and salary workers (16 years and over)",
  },
  {
    id: "CPIAUCSL",
    metric: "cpi",
    ageBand: "all",
    label:
      "CPI, annualized monthly % change (CPI-U, all items, U.S. city average)",
  },
  {
    id: "A191RL1Q225SBEA",
    metric: "real_gdp",
    ageBand: "all",
    label:
      "Real Gross Domestic Product, chained 2017 dollars (annual rate, quarterly)",
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
  {
    id: "cpi",
    label: "CPI, annualized monthly % change",
  },
  {
    id: "real_gdp",
    label: "Real GDP (chained 2017 dollars, annual rate)",
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
  {
    id: "age_20_24",
    label: "20–24 year-olds",
  },
  {
    id: "age_25_54",
    label: "25–54 year-olds",
  },
  {
    id: "age_55_plus",
    label: "55 years and over",
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

type FredApiCategory = {
  id: number;
  name: string;
  parent_id: number | null;
};

type FredApiCategoryResponse = {
  categories: FredApiCategory[];
};

type FredApiCategorySeries = {
  id: string;
  title: string;
  frequency: string | null;
  units: string | null;
};

type FredApiCategorySeriesResponse = {
  seriess: FredApiCategorySeries[];
};

type FredApiSeriesDetails = {
  id: string;
  title: string;
  units: string;
  frequency: string;
};

type FredApiSeriesDetailsResponse = {
  seriess: FredApiSeriesDetails[];
};

const FRED_API_BASE = "https://api.stlouisfed.org/fred";

function getFredApiKey(): string {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FRED_API_KEY is not set. Add it to your environment to fetch data.",
    );
  }
  return apiKey;
}

async function fredFetch<T>(
  path: string,
  searchParams: Record<string, string | number>,
): Promise<T> {
  const apiKey = getFredApiKey();

  const params = new URLSearchParams({
    api_key: apiKey,
    file_type: "json",
  });

  for (const [key, value] of Object.entries(searchParams)) {
    params.set(key, String(value));
  }

  const url = `${FRED_API_BASE}${path}?${params.toString()}`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `FRED request to ${path} failed with status ${res.status}.`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return res.json();
}

function toAnnualizedMonthlyChange(
  observations: FredObservation[],
): FredObservation[] {
  let lastValue: number | null = null;

  return observations.map((obs) => {
    const current = obs.value;

    if (current == null) {
      return { ...obs, value: null };
    }

    if (lastValue == null) {
      lastValue = current;
      return { ...obs, value: null };
    }

    const ratio = current / lastValue;

    if (!Number.isFinite(ratio) || ratio <= 0) {
      lastValue = current;
      return { ...obs, value: null };
    }

    const annualized = (ratio ** 12 - 1) * 100;
    lastValue = current;

    return {
      ...obs,
      value: Number.isFinite(annualized) ? annualized : null,
    };
  });
}

export async function fetchFredSeries(
  seriesId: FredSeriesId,
): Promise<FredSeriesNormalized> {
  const [observationsJson, detailsJson] = await Promise.all([
    fredFetch<FredApiSeriesResponse>("/series/observations", {
      series_id: seriesId,
      observation_start: "1950-01-01",
    }),
    fredFetch<FredApiSeriesDetailsResponse>("/series", {
      series_id: seriesId,
    }),
  ]);

  const rawObservations: FredObservation[] = observationsJson.observations.map(
    (obs) => {
      const trimmed = obs.value.trim();
      if (trimmed === "." || trimmed === "") {
        return { date: obs.date, value: null };
      }
      const parsed = Number.parseFloat(trimmed);
      return {
        date: obs.date,
        value: Number.isFinite(parsed) ? parsed : null,
      };
    },
  );

  const isCpi = seriesId === "CPIAUCSL";
  const observations = isCpi
    ? toAnnualizedMonthlyChange(rawObservations)
    : rawObservations;

  const details = detailsJson.seriess?.[0];

  return {
    id: seriesId,
    title:
      details?.title ??
      LABOR_SERIES_CONFIG.find((option) => option.id === seriesId)?.label ??
      seriesId,
    units: isCpi
      ? "Percent, annualized monthly change"
      : details?.units ?? observationsJson.units ?? null,
    frequency: details?.frequency ?? null,
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

export type FredCategory = {
  id: number;
  name: string;
  parentId: number | null;
};

export type FredSeriesMeta = {
  id: FredSeriesId;
  title: string;
  units: string | null;
  frequency: string | null;
};

export async function fetchFredCategory(
  categoryId: number,
): Promise<FredCategory | null> {
  const json = await fredFetch<FredApiCategoryResponse>("/category", {
    category_id: categoryId,
  });

  const category = json.categories?.[0];
  if (!category) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    parentId:
      typeof category.parent_id === "number" ? category.parent_id : null,
  };
}

export async function fetchFredCategoryChildren(
  parentCategoryId: number,
): Promise<FredCategory[]> {
  const json = await fredFetch<FredApiCategoryResponse>("/category/children", {
    category_id: parentCategoryId,
  });

  return (json.categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    parentId:
      typeof category.parent_id === "number" ? category.parent_id : null,
  }));
}

export async function fetchFredCategorySeries(
  categoryId: number,
): Promise<FredSeriesMeta[]> {
  const json = await fredFetch<FredApiCategorySeriesResponse>(
    "/category/series",
    {
      category_id: categoryId,
    },
  );

  const series = (json.seriess ?? []).filter((item) => {
    const title = item.title ?? "";
    return !title.toUpperCase().includes("DISCONTINUED");
  });

  return series
    .map((item) => ({
      id: item.id as FredSeriesId,
      title: item.title,
      units: item.units ?? null,
      frequency: item.frequency ?? null,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}


