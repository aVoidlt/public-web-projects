import { NextResponse } from "next/server";
import NewsAPI from "newsapi";
import yahooFinance from "yahoo-finance2";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const pageSize = Number(searchParams.get("pageSize") || 20);

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

    // Try to enrich query: if q looks like a ticker, resolve company name
    let candidates: string[] = [];
    if (q) candidates.push(q);
    try {
      if (q && /^[A-Za-z.:-]{1,10}$/.test(q)) {
        const quote = await yahooFinance.quote(q);
        const names = [quote.longName, quote.shortName, quote.displayName].filter(Boolean) as string[];
        candidates.push(...names);
      }
    } catch {}
    // Deduplicate and keep non-empty
    candidates = Array.from(new Set(candidates.filter((s) => s && s.trim().length > 0)));

    // Combine into a single query using OR to minimize requests
    const combined = candidates.map((t) => `"${t}"`).join(" OR ") || q || "";

    // Try German first, then English; single request per language for `everything`
    let articles: any[] = [];
    for (const lang of ["de", "en"]) {
      try {
        const res = await newsapi.v2.everything({
          q: combined,
          language: lang as any,
          sortBy: "publishedAt",
          searchIn: "title,description" as any,
          pageSize,
        });
        if (res.articles?.length) {
          articles = res.articles;
          break;
        }


      } catch {}
    }

    // Fallback: use Top Headlines (often returns more on free plan)
    if (!articles.length) {
      for (const country of ["de", "us"]) {
        try {
          const res = await newsapi.v2.topHeadlines({
            q: (combined && combined !== "\"\"") ? combined : undefined,
            country: country as any,
            category: "business" as any,
            pageSize,
          });
          if (res.articles?.length) {
            articles = res.articles;
            break;
          }
        } catch {}
      }
    }

    // If still empty, try GNews as alternative provider if key is present
    if (!articles.length && process.env.GNEWS_API_KEY) {
      const gnewsToken = process.env.GNEWS_API_KEY;
      // Search first (de → en)
      for (const lang of ["de", "en"]) {
        try {
          const url = new URL("https://gnews.io/api/v4/search");
          if (combined && combined !== "\"\"") url.searchParams.set("q", combined);
          url.searchParams.set("lang", lang);
          url.searchParams.set("token", gnewsToken);
          url.searchParams.set("max", String(pageSize));
          const res = await fetch(url.toString());
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.articles) && data.articles.length) {
              articles = data.articles.map((a: any) => ({
                title: a.title,
                description: a.description,
                url: a.url,
                urlToImage: a.image,
                publishedAt: a.publishedAt,
                source: { name: a.source?.name },
              }));
              break;
            }
          }
        } catch {}
      }

      // Fallback top headlines on GNews
      if (!articles.length) {
        for (const lang of ["de", "en"]) {
          try {
            const url = new URL("https://gnews.io/api/v4/top-headlines");
            if (combined && combined !== "\"\"") url.searchParams.set("q", combined);
            url.searchParams.set("lang", lang);
            url.searchParams.set("topic", "business");
            url.searchParams.set("token", gnewsToken);
            url.searchParams.set("max", String(pageSize));
            const res = await fetch(url.toString());
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.articles) && data.articles.length) {
                articles = data.articles.map((a: any) => ({
                  title: a.title,
                  description: a.description,
                  url: a.url,
                  urlToImage: a.image,
                  publishedAt: a.publishedAt,
                  source: { name: a.source?.name },
                }));
                break;
              }
            }
          } catch {}
        }
      }
    }

    return NextResponse.json({ q, articles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Gracefully degrade: return empty array to avoid breaking UI
    return NextResponse.json({ q, articles: [], error: message }, { status: 200 });
  }
}


