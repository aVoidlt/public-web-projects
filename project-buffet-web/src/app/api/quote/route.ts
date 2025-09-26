import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json(
      { error: "Missing ticker query parameter" },
      { status: 400 }
    );
  }

  try {
    const quote = await yahooFinance.quote(ticker.toUpperCase());
    return NextResponse.json({ ticker: ticker.toUpperCase(), quote });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


