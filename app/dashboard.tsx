/* Client-side dashboard shell: manages series selection, data state, and export wiring. */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Chart as ChartJS } from "chart.js";
import { DashboardChart } from "../components/DashboardChart";
import {
  type FredCategory,
  type FredSeriesId,
  type FredSeriesMeta,
  type FredSeriesResponse,
} from "../lib/fred";

type ChartInstance = ChartJS<"line", number[], unknown> | null;

type SeriesSelection = {
  categoryId: number | null;
  subcategoryId: number | null;
  seriesId: FredSeriesId | null;
};

type SelectionState = {
  seriesA: SeriesSelection;
  seriesB: SeriesSelection;
};

const DEFAULT_SELECTION: SelectionState = {
  seriesA: { categoryId: null, subcategoryId: null, seriesId: null },
  seriesB: { categoryId: null, subcategoryId: null, seriesId: null },
};

export default function Dashboard() {
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const [data, setData] = useState<FredSeriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [dualAxisEnabled, setDualAxisEnabled] = useState(false);
  const [availableMinDate, setAvailableMinDate] = useState<string | null>(null);
  const [availableMaxDate, setAvailableMaxDate] = useState<string | null>(null);
  const [selectedMinDate, setSelectedMinDate] = useState<string>("");
  const [selectedMaxDate, setSelectedMaxDate] = useState<string>("");

  const [rootCategories, setRootCategories] = useState<FredCategory[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<
    Record<number, FredCategory[]>
  >({});
  const [seriesByCategory, setSeriesByCategory] = useState<
    Record<number, FredSeriesMeta[]>
  >({});
  const [loadingRootCategories, setLoadingRootCategories] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState<
    Record<number, boolean>
  >({});
  const [loadingSeries, setLoadingSeries] = useState<Record<number, boolean>>(
    {},
  );

  const chartRef = useRef<ChartInstance>(null);

  // --- FRED metadata helpers ---

  const loadRootCategories = useCallback(async () => {
    if (rootCategories.length > 0 || loadingRootCategories) {
      return;
    }

    setLoadingRootCategories(true);
    setMetaError(null);

    try {
      const response = await fetch("/api/fred/meta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kind: "children", categoryId: 0 }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message =
          typeof body?.error === "string"
            ? body.error
            : "Failed to load FRED categories.";
        throw new Error(message);
      }

      const json = (await response.json()) as {
        kind: "children";
        categories: FredCategory[];
      };

      setRootCategories(json.categories ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error loading FRED categories.";
      setMetaError(message);
    } finally {
      setLoadingRootCategories(false);
    }
  }, [loadingRootCategories, rootCategories.length]);

  const ensureChildrenLoaded = useCallback(
    async (parentCategoryId: number) => {
      if (childrenByParent[parentCategoryId]) {
        return;
      }

      setLoadingChildren((prev) => ({
        ...prev,
        [parentCategoryId]: true,
      }));
      setMetaError(null);

      try {
        const response = await fetch("/api/fred/meta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ kind: "children", categoryId: parentCategoryId }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message =
            typeof body?.error === "string"
              ? body.error
              : "Failed to load FRED subcategories.";
          throw new Error(message);
        }

        const json = (await response.json()) as {
          kind: "children";
          categories: FredCategory[];
        };

        setChildrenByParent((prev) => ({
          ...prev,
          [parentCategoryId]: json.categories ?? [],
        }));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unexpected error loading FRED subcategories.";
        setMetaError(message);
      } finally {
        setLoadingChildren((prev) => ({
          ...prev,
          [parentCategoryId]: false,
        }));
      }
    },
    [childrenByParent],
  );

  const ensureSeriesLoaded = useCallback(
    async (categoryId: number) => {
      if (seriesByCategory[categoryId]) {
        return;
      }

      setLoadingSeries((prev) => ({
        ...prev,
        [categoryId]: true,
      }));
      setMetaError(null);

      try {
        const response = await fetch("/api/fred/meta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ kind: "series", categoryId }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message =
            typeof body?.error === "string"
              ? body.error
              : "Failed to load FRED series.";
          throw new Error(message);
        }

        const json = (await response.json()) as {
          kind: "series";
          series: FredSeriesMeta[];
        };

        setSeriesByCategory((prev) => ({
          ...prev,
          [categoryId]: json.series ?? [],
        }));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unexpected error loading FRED series.";
        setMetaError(message);
      } finally {
        setLoadingSeries((prev) => ({
          ...prev,
          [categoryId]: false,
        }));
      }
    },
    [seriesByCategory],
  );

  useEffect(() => {
    void loadRootCategories();
  }, [loadRootCategories]);

  const activeSeries = useMemo(() => {
    const ids: FredSeriesId[] = [];
    const aId = selection.seriesA.seriesId;
    const bId = selection.seriesB.seriesId;

    // Series A is required; if it's not selected yet, treat as no active series.
    if (!aId) {
      return ids;
    }

    ids.push(aId);

    if (bId && bId !== aId) {
      ids.push(bId);
    }

    return ids;
  }, [selection]);

  const handleCategoryChange = (key: keyof SelectionState, value: string) => {
    setSelection((prev) => {
      const next: SelectionState = {
        ...prev,
        [key]: {
          categoryId: value ? Number.parseInt(value, 10) : null,
          subcategoryId: null,
          seriesId: null,
        },
      };
      return next;
    });

    if (value) {
      const categoryId = Number.parseInt(value, 10);
      void ensureChildrenLoaded(categoryId);
      void ensureSeriesLoaded(categoryId);
    }
  };

  const handleSubcategoryChange = (
    key: keyof SelectionState,
    value: string,
  ) => {
    setSelection((prev) => {
      const current = prev[key];
      const nextSubcategoryId = value ? Number.parseInt(value, 10) : null;
      const next: SelectionState = {
        ...prev,
        [key]: {
          ...current,
          subcategoryId: nextSubcategoryId,
          seriesId: null,
        },
      };
      return next;
    });

    if (value) {
      const subcategoryId = Number.parseInt(value, 10);
      void ensureSeriesLoaded(subcategoryId);
    }
  };

  const handleSeriesChange = (key: keyof SelectionState, value: string) => {
    setSelection((prev) => {
      const current = prev[key];
      const next: SelectionState = {
        ...prev,
        [key]: {
          ...current,
          seriesId: value || null,
        },
      };
      return next;
    });
  };

  const fetchData = useCallback(
    async (seriesIds: FredSeriesId[]) => {
      if (seriesIds.length === 0) {
        setData(null);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/fred", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ seriesIds }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message =
            typeof body?.error === "string"
              ? body.error
              : "Failed to fetch FRED data.";
          throw new Error(message);
        }

        const json = (await response.json()) as FredSeriesResponse;
        setData(json);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error occurred.";
        setError(message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(activeSeries);
  }, [activeSeries, fetchData]);

  useEffect(() => {
    if (!data || data.dates.length === 0) {
      setAvailableMinDate(null);
      setAvailableMaxDate(null);
      setSelectedMinDate("");
      setSelectedMaxDate("");
      return;
    }

    const min = data.dates[0];
    const max = data.dates[data.dates.length - 1];

    setAvailableMinDate(min);
    setAvailableMaxDate(max);

    setSelectedMinDate((prev) =>
      prev && prev >= min && prev <= max ? prev : min,
    );
    setSelectedMaxDate((prev) =>
      prev && prev >= min && prev <= max ? prev : max,
    );
  }, [data]);

  const handleMinDateChange = (value: string) => {
    setSelectedMinDate(value);
    setSelectedMaxDate((prevMax) => {
      if (!prevMax || prevMax < value) {
        return value;
      }
      return prevMax;
    });
  };

  const handleMaxDateChange = (value: string) => {
    setSelectedMaxDate(value);
    setSelectedMinDate((prevMin) => {
      if (!prevMin || prevMin > value) {
        return value;
      }
      return prevMin;
    });
  };

  const handleExportPng = () => {
    const instance = chartRef.current;
    if (!instance) return;
    const url = instance.toBase64Image("image/png", 1);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fred-dashboard.png";
    a.click();
  };

  const hasData = data && data.dates.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            FRED series selection
          </h2>
          <p className="text-xs text-slate-500">
            Choose up to two FRED series (category, subcategory, and series) to
            compare. Data is fetched directly from the FRED API.
          </p>

          <div className="flex flex-col gap-3">
            <SeriesSelectionRow
              label="Series A"
              selection={selection.seriesA}
              rootCategories={rootCategories}
              childrenByParent={childrenByParent}
              seriesByCategory={seriesByCategory}
              loadingRootCategories={loadingRootCategories}
              loadingChildren={loadingChildren}
              loadingSeries={loadingSeries}
              metaError={metaError}
              onChangeCategory={(value) =>
                handleCategoryChange("seriesA", value)
              }
              onChangeSubcategory={(value) =>
                handleSubcategoryChange("seriesA", value)
              }
              onChangeSeries={(value) => handleSeriesChange("seriesA", value)}
            />
            <SeriesSelectionRow
              label="Series B (optional)"
              selection={selection.seriesB}
              rootCategories={rootCategories}
              childrenByParent={childrenByParent}
              seriesByCategory={seriesByCategory}
              loadingRootCategories={loadingRootCategories}
              loadingChildren={loadingChildren}
              loadingSeries={loadingSeries}
              metaError={metaError}
              onChangeCategory={(value) =>
                handleCategoryChange("seriesB", value)
              }
              onChangeSubcategory={(value) =>
                handleSubcategoryChange("seriesB", value)
              }
              onChangeSeries={(value) => handleSeriesChange("seriesB", value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Chart
              </h2>
              <p className="text-xs text-slate-500">
                Shaded regions indicate NBER recession periods.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">From</span>
                <input
                  type="date"
                  value={selectedMinDate}
                  onChange={(event) => handleMinDateChange(event.target.value)}
                  min={availableMinDate ?? undefined}
                  max={availableMaxDate ?? undefined}
                  className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-[11px] text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  disabled={!hasData}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">To</span>
                <input
                  type="date"
                  value={selectedMaxDate}
                  onChange={(event) => handleMaxDateChange(event.target.value)}
                  min={availableMinDate ?? undefined}
                  max={availableMaxDate ?? undefined}
                  className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-[11px] text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  disabled={!hasData}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  checked={dualAxisEnabled}
                  onChange={(event) => setDualAxisEnabled(event.target.checked)}
                />
                <span>Dual y-axes</span>
              </label>
              <button
                type="button"
                onClick={handleExportPng}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                disabled={!hasData}
              >
                Download PNG
              </button>
            </div>
          </div>

          <div className="relative flex min-h-[260px] flex-1 items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/60 text-xs text-slate-500 backdrop-blur-sm">
                Fetching data from FRED…
              </div>
            )}

            {error && (
              <div className="w-full rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            {!error && (
              <DashboardChart
                data={data}
                selectedSeries={activeSeries}
                dualAxisEnabled={dualAxisEnabled}
                minDate={selectedMinDate || undefined}
                maxDate={selectedMaxDate || undefined}
                onChartReady={(chart) => {
                  chartRef.current = chart;
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type SeriesSelectionRowProps = {
  label: string;
  selection: SeriesSelection;
  rootCategories: FredCategory[];
  childrenByParent: Record<number, FredCategory[]>;
  seriesByCategory: Record<number, FredSeriesMeta[]>;
  loadingRootCategories: boolean;
  loadingChildren: Record<number, boolean>;
  loadingSeries: Record<number, boolean>;
  metaError: string | null;
  onChangeCategory: (value: string) => void;
  onChangeSubcategory: (value: string) => void;
  onChangeSeries: (value: string) => void;
};

function SeriesSelectionRow({
  label,
  selection,
  rootCategories,
  childrenByParent,
  seriesByCategory,
  loadingRootCategories,
  loadingChildren,
  loadingSeries,
  metaError,
  onChangeCategory,
  onChangeSubcategory,
  onChangeSeries,
}: SeriesSelectionRowProps) {
  const selectedCategoryId = selection.categoryId;
  const selectedSubcategoryId = selection.subcategoryId;
  const effectiveSeriesCategoryId =
    selectedSubcategoryId ?? selectedCategoryId ?? null;

  const subcategories =
    selectedCategoryId != null ? childrenByParent[selectedCategoryId] ?? [] : [];

  const seriesOptions =
    effectiveSeriesCategoryId != null
      ? seriesByCategory[effectiveSeriesCategoryId] ?? []
      : [];

  const isLoadingChildren =
    selectedCategoryId != null ? Boolean(loadingChildren[selectedCategoryId]) : false;
  const isLoadingSeries =
    effectiveSeriesCategoryId != null
      ? Boolean(loadingSeries[effectiveSeriesCategoryId])
      : false;

  return (
    <div className="flex flex-col gap-1.5 text-xs text-slate-700">
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Category</span>
          <select
            value={selectedCategoryId != null ? String(selectedCategoryId) : ""}
            onChange={(event) => onChangeCategory(event.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="" disabled>
              {loadingRootCategories ? "Loading categories…" : "Select a category"}
            </option>
            {rootCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Subcategory</span>
          <select
            value={
              selectedSubcategoryId != null ? String(selectedSubcategoryId) : ""
            }
            onChange={(event) => onChangeSubcategory(event.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            disabled={!selectedCategoryId || isLoadingChildren}
          >
            <option value="">
              {isLoadingChildren
                ? "Loading subcategories…"
                : subcategories.length
                  ? "Select a subcategory (optional)"
                  : "No subcategories"}
            </option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Series</span>
          <select
            value={selection.seriesId ?? ""}
            onChange={(event) => onChangeSeries(event.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            disabled={!effectiveSeriesCategoryId || isLoadingSeries}
          >
            <option value="">
              {isLoadingSeries
                ? "Loading series…"
                : seriesOptions.length
                  ? "Select a series"
                  : "No series available"}
            </option>
            {seriesOptions.map((series) => (
              <option key={series.id} value={series.id}>
                {series.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {metaError && (
        <p className="text-[10px] text-rose-500">
          {metaError}
        </p>
      )}
    </div>
  );
}

