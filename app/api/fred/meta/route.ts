import { NextResponse } from "next/server";

import {
  type FredCategory,
  type FredSeriesMeta,
  fetchFredCategoryChildren,
  fetchFredCategorySeries,
} from "../../../../lib/fred";

type MetaChildrenRequest = {
  kind: "children";
  categoryId: number;
};

type MetaSeriesRequest = {
  kind: "series";
  categoryId: number;
};

type MetaRequest = MetaChildrenRequest | MetaSeriesRequest;

type MetaChildrenResponse = {
  kind: "children";
  categories: FredCategory[];
};

type MetaSeriesResponse = {
  kind: "series";
  series: FredSeriesMeta[];
};

type MetaResponse = MetaChildrenResponse | MetaSeriesResponse;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MetaRequest;

    if (!body || typeof body !== "object" || !("kind" in body)) {
      return NextResponse.json(
        { error: "Invalid request body for FRED metadata." },
        { status: 400 },
      );
    }

    if (body.kind === "children") {
      if (typeof body.categoryId !== "number") {
        return NextResponse.json(
          { error: "categoryId must be a number for children requests." },
          { status: 400 },
        );
      }

      const categories = await fetchFredCategoryChildren(body.categoryId);
      const payload: MetaChildrenResponse = {
        kind: "children",
        categories,
      };
      return NextResponse.json<MetaResponse>(payload);
    }

    if (body.kind === "series") {
      if (typeof body.categoryId !== "number") {
        return NextResponse.json(
          { error: "categoryId must be a number for series requests." },
          { status: 400 },
        );
      }

      const series = await fetchFredCategorySeries(body.categoryId);
      const payload: MetaSeriesResponse = {
        kind: "series",
        series,
      };
      return NextResponse.json<MetaResponse>(payload);
    }

    return NextResponse.json(
      { error: "Unsupported FRED metadata request kind." },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch FRED metadata.";

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


