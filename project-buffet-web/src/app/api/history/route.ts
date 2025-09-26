import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const period = searchParams.get("period") || "1y"; // 1d,5d,1mo,3mo,6mo,1y,5y,max
  const interval = searchParams.get("interval") || "1d"; // 1m,5m,15m,1d,1wk,1mo

  if (!ticker) {
    return NextResponse.json(
      { error: "Missing ticker query parameter" },
      { status: 400 }
    );
  }

  try {
    const now = Date.now();
    const periodToMs = (p: string): number => {
      switch (p) {
        case "1d":
          return 24 * 60 * 60 * 1000;
        case "5d":
          return 5 * 24 * 60 * 60 * 1000;
        case "1mo":
          return 30 * 24 * 60 * 60 * 1000;
        case "3mo":
          return 90 * 24 * 60 * 60 * 1000;
        case "6mo":
          return 182 * 24 * 60 * 60 * 1000;
        case "1y":
          return 365 * 24 * 60 * 60 * 1000;
        case "5y":
          return 5 * 365 * 24 * 60 * 60 * 1000;
        case "max":
          return 20 * 365 * 24 * 60 * 60 * 1000; // fallback window
        default:
          return 365 * 24 * 60 * 60 * 1000;
      }
    };

    const period1 = new Date(now - periodToMs(period));
    const period2 = new Date(now);

    const results = await yahooFinance.chart(ticker.toUpperCase(), {
      period1,
      period2,
      interval: interval as any,
    });

    const candles = results.quotes.map((q: any) => ({
      date: q.date?.toISOString() ?? null,
      open: q.open ?? null,
      high: q.high ?? null,
      low: q.low ?? null,
      close: q.close ?? null,
      volume: q.volume ?? null,
    }));

    return NextResponse.json({ ticker: ticker.toUpperCase(), candles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


