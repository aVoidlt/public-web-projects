import { NextResponse } from "next/server";
import NewsAPI from "newsapi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const pageSize = Number(searchParams.get("pageSize") || 10);

  if (!process.env.NEWSAPI_KEY) {
    return NextResponse.json(
      { error: "Missing NEWSAPI_KEY env variable" },
      { status: 500 }
    );
  }

  if (!q) {
    return NextResponse.json(
      { error: "Missing q query parameter" },
      { status: 400 }
    );
  }

  try {
    const newsapi = new NewsAPI(process.env.NEWSAPI_KEY);
    const res = await newsapi.v2.everything({
      q,
      language: "de",
      sortBy: "publishedAt",
      pageSize,
    });
    return NextResponse.json({ q, articles: res.articles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


