import { NextResponse } from "next/server";
import {
  type FredSeriesId,
  fetchFredSeriesBundle,
} from "../../../../lib/fred";

type RequestBody = {
  seriesIds?: FredSeriesId[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const seriesIds = Array.isArray(body.seriesIds)
      ? (body.seriesIds.filter(Boolean) as FredSeriesId[])
      : [];

    if (seriesIds.length === 0) {
      return NextResponse.json(
        { dates: [], series: [] },
        {
          status: 200,
        },
      );
    }

    const bundle = await fetchFredSeriesBundle(seriesIds);
    return NextResponse.json(bundle);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch FRED data.";
    const status =
      error instanceof Error && message.includes("FRED_API_KEY") ? 500 : 502;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";

import {
  type FredSeriesId,
  fetchFredSeries,
  normalizeFredSeries,
} from "../../../lib/fred";

type RequestBody = {
  seriesIds?: string[];
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "FRED_API_KEY is not configured. Add it to your environment before using the dashboard.",
      },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const rawIds = Array.isArray(body.seriesIds) ? body.seriesIds : [];
  const uniqueIds = Array.from(new Set(rawIds)).filter(Boolean) as string[];

  if (uniqueIds.length === 0) {
    return NextResponse.json(
      {
        dates: [],
        series: [],
      },
      { status: 200 },
    );
  }

  const allowedIds = new Set<string>([
    "GDP",
    "UNRATE",
    "CPIAUCSL",
    "FEDFUNDS",
    "PCE",
    "PAYEMS",
  ]);

  const filteredIds = uniqueIds.filter((id) => allowedIds.has(id));

  if (filteredIds.length === 0) {
    return NextResponse.json(
      { error: "No valid FRED series IDs provided." },
      { status: 400 },
    );
  }

  try {
    const seriesList = await Promise.all(
      filteredIds.map((id) => fetchFredSeries(id as FredSeriesId, apiKey)),
    );
    const normalized = normalizeFredSeries(seriesList);
    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch FRED data.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}


