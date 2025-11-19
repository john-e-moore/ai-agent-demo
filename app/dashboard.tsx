/* Client-side dashboard shell: manages series selection, data state, note, and export wiring. */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Chart as ChartJS } from "chart.js";
import { NoteEditor } from "../components/NoteEditor";
import { DashboardChart } from "../components/DashboardChart";
import {
  FRED_SERIES_OPTIONS,
  type FredSeriesId,
  type FredSeriesResponse,
} from "../lib/fred";

type ChartInstance = ChartJS<"line", number[], unknown> | null;

type SelectionState = {
  series1: FredSeriesId | "";
  series2: FredSeriesId | "";
  series3: FredSeriesId | "";
};

const DEFAULT_SELECTION: SelectionState = {
  series1: "GDP",
  series2: "UNRATE",
  series3: "",
};

function selectionKey(selection: SelectionState): string {
  return ["series1", "series2", "series3"]
    .map((key) => (selection as Record<string, string>)[key] || "none")
    .join("|");
}

export default function Dashboard() {
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const [note, setNote] = useState("");
  const [data, setData] = useState<FredSeriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chartRef = useRef<ChartInstance>(null);

  const activeSeries = useMemo(
    () =>
      [selection.series1, selection.series2, selection.series3].filter(
        (id): id is FredSeriesId => Boolean(id),
      ),
    [selection],
  );

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

  const handleSelectionChange = (
    key: keyof SelectionState,
    value: string,
  ) => {
    setSelection((prev) => ({
      ...prev,
      [key]: (value || "") as FredSeriesId | "",
    }));
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
            Series selection
          </h2>
          <p className="text-xs text-slate-500">
            Choose up to three FRED series to compare. Data is fetched
            directly from the FRED API.
          </p>

          <div className="flex flex-col gap-3">
            <SeriesSelectRow
              label="Series 1"
              value={selection.series1}
              onChange={(value) => handleSelectionChange("series1", value)}
            />
            <SeriesSelectRow
              label="Series 2"
              value={selection.series2}
              onChange={(value) => handleSelectionChange("series2", value)}
            />
            <SeriesSelectRow
              label="Series 3"
              value={selection.series3}
              onChange={(value) => handleSelectionChange("series3", value)}
              optional
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Chart
              </h2>
              <p className="text-xs text-slate-500">
                Shaded regions indicate NBER recession periods.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportPng}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              disabled={!hasData}
            >
              Download PNG
            </button>
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

type SeriesSelectRowProps = {
  label: string;
  value: FredSeriesId | "";
  onChange: (value: string) => void;
  optional?: boolean;
};

function SeriesSelectRow({
  label,
  value,
  onChange,
  optional,
}: SeriesSelectRowProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-700">
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
        {optional && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            Optional
          </span>
        )}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      >
        <option value="">
          {optional ? "None" : "Choose a series"}
        </option>
        {FRED_SERIES_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.id} — {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}


