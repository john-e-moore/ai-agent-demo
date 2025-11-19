/* Client-side dashboard shell: manages series selection, data state, note, and export wiring. */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Chart as ChartJS } from "chart.js";
import { NoteEditor } from "../components/NoteEditor";
import { DashboardChart } from "../components/DashboardChart";
import {
  AGE_BANDS,
  LABOR_METRICS,
  type AgeBandId,
  type FredSeriesId,
  type FredSeriesResponse,
  type LaborMetricId,
  findLaborSeriesConfig,
} from "../lib/fred";

type ChartInstance = ChartJS<"line", number[], unknown> | null;

type SeriesSelection = {
  metric: LaborMetricId;
  ageBand: AgeBandId;
};

type SelectionState = {
  seriesA: SeriesSelection;
  seriesB: SeriesSelection;
};

const DEFAULT_SELECTION: SelectionState = {
  seriesA: { metric: "unemployment", ageBand: "all" },
  seriesB: { metric: "participation", ageBand: "all" },
};

function metricSupportsAgeBands(metric: LaborMetricId): boolean {
  return metric === "unemployment" || metric === "participation";
}

function selectionKey(selection: SelectionState): string {
  return [
    selection.seriesA.metric,
    selection.seriesA.ageBand,
    selection.seriesB.metric,
    selection.seriesB.ageBand,
  ].join("|");
}

export default function Dashboard() {
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const [note, setNote] = useState("");
  const [data, setData] = useState<FredSeriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dualAxisEnabled, setDualAxisEnabled] = useState(false);
  const [availableMinDate, setAvailableMinDate] = useState<string | null>(null);
  const [availableMaxDate, setAvailableMaxDate] = useState<string | null>(null);
  const [selectedMinDate, setSelectedMinDate] = useState<string>("");
  const [selectedMaxDate, setSelectedMaxDate] = useState<string>("");

  const chartRef = useRef<ChartInstance>(null);

  const activeSeries = useMemo(() => {
    const ids: FredSeriesId[] = [];
    const aConfig = findLaborSeriesConfig(
      selection.seriesA.metric,
      selection.seriesA.ageBand,
    );
    const bConfig = findLaborSeriesConfig(
      selection.seriesB.metric,
      selection.seriesB.ageBand,
    );

    if (aConfig) {
      ids.push(aConfig.id);
    }
    if (bConfig && (!aConfig || bConfig.id !== aConfig.id)) {
      ids.push(bConfig.id);
    }

    return ids;
  }, [selection]);

  const currentKey = useMemo(
    () => selectionKey(selection),
    [selection],
  );

  const loadNoteForSelection = useCallback((key: string) => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(
        `fred-dashboard-note:${key}`,
      );
      setNote(stored ?? "");
    } catch {
      setNote("");
    }
  }, []);

  const handleSaveNote = useCallback(
    (value: string) => {
      setNote(value);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(
          `fred-dashboard-note:${currentKey}`,
          value,
        );
      } catch {
        // ignore storage failures (e.g. private mode)
      }
    },
    [currentKey],
  );

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
    loadNoteForSelection(currentKey);
  }, [currentKey, loadNoteForSelection]);

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

  const handleSeriesSelectionChange = (
    key: keyof SelectionState,
    part: "metric" | "ageBand",
    value: string,
  ) => {
    setSelection((prev) => {
      const next = { ...prev };

      if (part === "metric") {
        const metric = value as LaborMetricId;
        const current = prev[key];
        const nextAgeBand = metricSupportsAgeBands(metric)
          ? current.ageBand
          : ("all" as AgeBandId);

        next[key] = {
          ...current,
          metric,
          ageBand: nextAgeBand,
        };
      } else {
        next[key] = {
          ...prev[key],
          ageBand: value as AgeBandId,
        };
      }

      return next;
    });
  };

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
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.5fr)]">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Labor-market series selection
          </h2>
          <p className="text-xs text-slate-500">
            Choose two labor-market series (metric and age band) to compare.
            Data is fetched directly from the FRED API.
          </p>

          <div className="flex flex-col gap-3">
            <SeriesSelectionRow
              label="Series A"
              selection={selection.seriesA}
              onChangeMetric={(value) =>
                handleSeriesSelectionChange("seriesA", "metric", value)
              }
              onChangeAgeBand={(value) =>
                handleSeriesSelectionChange("seriesA", "ageBand", value)
              }
            />
            <SeriesSelectionRow
              label="Series B"
              selection={selection.seriesB}
              onChangeMetric={(value) =>
                handleSeriesSelectionChange("seriesB", "metric", value)
              }
              onChangeAgeBand={(value) =>
                handleSeriesSelectionChange("seriesB", "ageBand", value)
              }
            />
          </div>

          <div className="pt-2">
            <NoteEditor
              note={note}
              onNoteChange={setNote}
              onSave={handleSaveNote}
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
                note={note}
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
  onChangeMetric: (value: LaborMetricId) => void;
  onChangeAgeBand: (value: AgeBandId) => void;
};

function SeriesSelectionRow({
  label,
  selection,
  onChangeMetric,
  onChangeAgeBand,
}: SeriesSelectionRowProps) {
  const metricHasNoAgeBreakdown = !metricSupportsAgeBands(selection.metric);

  return (
    <div className="flex flex-col gap-1.5 text-xs text-slate-700">
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Metric</span>
          <select
            value={selection.metric}
            onChange={(event) =>
              onChangeMetric(event.target.value as LaborMetricId)
            }
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            {LABOR_METRICS.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Age band</span>
          <select
            value={selection.ageBand}
            onChange={(event) =>
              onChangeAgeBand(event.target.value as AgeBandId)
            }
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            {AGE_BANDS.map((band) => {
              const disabled =
                metricHasNoAgeBreakdown && band.id !== "all";
              return (
                <option key={band.id} value={band.id} disabled={disabled}>
                  {band.label}
                  {disabled ? " (all workers only)" : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      {metricHasNoAgeBreakdown && (
        <p className="text-[10px] text-slate-400">
          {selection.metric === "earnings"
            ? "Median weekly earnings are only available for all workers in this demo."
            : "This series is only available as an aggregate index in this demo (no age breakdowns)."}
        </p>
      )}
    </div>
  );
}

