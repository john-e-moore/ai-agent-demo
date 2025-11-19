import { NextResponse } from "next/server";
import {
  type FredSeriesId,
  fetchFredSeriesBundle,
} from "../../../lib/fred";

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

