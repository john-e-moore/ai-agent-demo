import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useEffect, useRef } from "react";

import type { FredSeriesId, FredSeriesResponse } from "../lib/fred";
import { NBER_RECESSIONS } from "../lib/recessions";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

type ChartInstance = ChartJS<"line", number[], unknown> | null;

type DashboardChartProps = {
  data: FredSeriesResponse | null;
  note: string;
  selectedSeries: FredSeriesId[];
  dualAxisEnabled: boolean;
  onChartReady?: (chart: ChartInstance) => void;
  minDate?: string;
  maxDate?: string;
};

const RECESSION_PLUGIN_ID = "nberRecessions";

const recessionPlugin: Plugin<"line"> = {
  id: RECESSION_PLUGIN_ID,
  beforeDraw: (chart, _args, _opts) => {
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;

    if (!chartArea || !xScale) return;

    const labels = chart.data.labels as string[] | undefined;
    if (!labels || labels.length === 0) return;

    const parseDate = (value: string) => new Date(value).getTime();

    ctx.save();
    ctx.fillStyle = "rgba(148, 163, 184, 0.18)"; // slate-400 with transparency

    for (const { start, end } of NBER_RECESSIONS) {
      const startMs = parseDate(start);
      const endMs = parseDate(end);

      let startIndex = -1;
      let endIndex = -1;

      for (let i = 0; i < labels.length; i += 1) {
        const labelTime = parseDate(labels[i]);
        if (startIndex === -1 && labelTime >= startMs) {
          startIndex = i;
        }
        if (labelTime <= endMs) {
          endIndex = i;
        }
      }

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        continue;
      }

      const xStart =
        xScale.getPixelForValue(startIndex) -
        (xScale.getPixelForValue(startIndex) -
          xScale.getPixelForValue(startIndex - 1 || 0)) /
          2;
      const xEnd =
        xScale.getPixelForValue(endIndex) +
        (xScale.getPixelForValue(endIndex + 1 || endIndex) -
          xScale.getPixelForValue(endIndex)) /
          2;

      const width = xEnd - xStart;

      ctx.fillRect(xStart, chartArea.top, width, chartArea.bottom - chartArea.top);
    }

    ctx.restore();
  },
};

ChartJS.register(recessionPlugin);

const SERIES_COLORS = [
  {
    borderColor: "rgb(37, 99, 235)", // blue-600
    backgroundColor: "rgba(37, 99, 235, 0.15)",
  },
  {
    borderColor: "rgb(16, 185, 129)", // emerald-500
    backgroundColor: "rgba(16, 185, 129, 0.14)",
  },
  {
    borderColor: "rgb(249, 115, 22)", // orange-500
    backgroundColor: "rgba(249, 115, 22, 0.15)",
  },
];

export function DashboardChart({
  data,
  note,
  selectedSeries,
  dualAxisEnabled,
  onChartReady,
  minDate,
  maxDate,
}: DashboardChartProps) {
  const rawLabels = data?.dates ?? [];

  const withinRange = (date: string) => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  const activeIndexes: number[] = [];
  const labels: string[] = [];

  rawLabels.forEach((date, index) => {
    if (withinRange(date)) {
      activeIndexes.push(index);
      labels.push(date);
    }
  });

  const datasets =
    data?.series.map((series, index) => {
      const palette = SERIES_COLORS[index % SERIES_COLORS.length];
      const yAxisID =
        dualAxisEnabled && index === 1
          ? ("y2" as const)
          : ("y" as const);

      return {
        label: series.title,
        data:
          activeIndexes.length > 0
            ? activeIndexes.map((i) => series.values[i] ?? null)
            : [],
        borderColor: palette.borderColor,
        backgroundColor: palette.backgroundColor,
        pointRadius: 0,
        borderWidth: 1.6,
        spanGaps: true,
        tension: 0.1,
        yAxisID,
      };
    }) ?? [];

  const chartRef = useRef<ChartInstance>(null);

  useEffect(() => {
    if (onChartReady) {
      onChartReady(chartRef.current);
    }
  }, [onChartReady, labels.length, datasets.length]);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          pointStyle: "line",
          boxWidth: 24,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          title(items) {
            if (!items.length) return "";
            return String(items[0].label);
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          maxTicksLimit: 6,
        },
        grid: {
          color: "rgba(148, 163, 184, 0.2)",
        },
      },
      ...(dualAxisEnabled
        ? {
            y2: {
              position: "right",
              ticks: {
                maxTicksLimit: 6,
              },
              grid: {
                drawOnChartArea: false,
              },
            },
          }
        : {}),
    },
  };

  if (!labels.length || !datasets.length) {
    const labelText = selectedSeries.length
      ? "Fetching data from FRED for the selected series…"
      : "Choose at least one series to see a chart.";

    return (
      <div className="flex h-64 w-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
        <div className="flex max-w-xs flex-col items-center gap-1 text-center">
          <span>{labelText}</span>
          {note && (
            <span className="text-[10px] text-slate-400">
              (A note is already saved and will appear alongside the chart.)
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[320px] w-full flex-col gap-2">
      <div className="relative flex-1">
        <Line
          ref={chartRef}
          data={{
            labels,
            datasets,
          }}
          options={options}
        />
      </div>
      {note && (
        <div className="mt-1 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
          <span className="font-medium text-slate-700">Note: </span>
          {note}
        </div>
      )}
    </div>
  );
}



