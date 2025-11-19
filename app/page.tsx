import { Suspense } from "react";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("./dashboard"), { ssr: false });

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 pb-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Interactive FRED series dashboard
        </h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Select up to three FRED series, view them over time with shaded NBER
          recessions, take notes, and export the current chart as a PNG.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading dashboard…
          </div>
        }
      >
        <Dashboard />
      </Suspense>
    </div>
  );
}
