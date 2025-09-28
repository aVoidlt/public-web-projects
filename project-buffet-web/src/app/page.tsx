"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { calculateEMA, calculateMACD, calculateRSI, calculateSMA, extractCloses, type Candle } from "@/lib/indicators";
import { ReloadIcon, DownloadIcon } from "@radix-ui/react-icons";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Line, ResponsiveContainer } from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DEFAULT_TICKERS = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA"];

export default function Home() {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [selected, setSelected] = useState<string>(tickers[0]!);
  const { data: history, isLoading: loadingHistory, mutate } = useSWR<{ candles: Candle[] }>(
    `/api/history?ticker=${encodeURIComponent(selected)}&period=1y&interval=1d`,
    fetcher
  );
  const { data: quote, isLoading: loadingQuote } = useSWR(`/api/quote?ticker=${encodeURIComponent(selected)}`, fetcher);
  const { data: news, isLoading: loadingNews } = useSWR<{ articles: any[] }>(`/api/news?q=${encodeURIComponent(selected)}`, fetcher);
  // FX: USD -> EUR (Yahoo symbol USDEUR=X)
  const { data: fx, isLoading: loadingFx } = useSWR<{ quote: { regularMarketPrice?: number } }>(
    `/api/quote?ticker=${encodeURIComponent("USDEUR=X")}`,
    fetcher
  );

  const chartData = useMemo(() => {
    const candles = history?.candles ?? [];
    const closes = extractCloses(candles);
    const sma20 = calculateSMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const rsi14 = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const usdToEur = fx?.quote?.regularMarketPrice ?? 1; // multiply USD values to get EUR

    return candles.map((c, idx) => ({
      date: c.date ? new Date(c.date).toLocaleDateString() : "",
      close: typeof c.close === "number" ? c.close * usdToEur : c.close,
      sma20: idx >= candles.length - sma20.length ? sma20[idx - (candles.length - sma20.length)] * usdToEur : undefined,
      ema50: idx >= candles.length - ema50.length ? ema50[idx - (candles.length - ema50.length)] * usdToEur : undefined,
      rsi14: idx >= candles.length - rsi14.length ? rsi14[idx - (candles.length - rsi14.length)] : undefined,
      macd: idx >= candles.length - macd.length ? macd[idx - (candles.length - macd.length)]?.MACD : undefined,
      signal: idx >= candles.length - macd.length ? macd[idx - (candles.length - macd.length)]?.signal : undefined,
    }));
  }, [history, fx]);

  const exportToCSV = () => {
    if (!chartData.length) return;

    const headers = ["Date", "Close (EUR)", "SMA 20 (EUR)", "EMA 50 (EUR)", "RSI 14", "MACD", "Signal"];
    const csvContent = [
      headers.join(","),
      ...chartData.map((row) =>
        [
          row.date,
          row.close?.toFixed(2) ?? "",
          row.sma20?.toFixed(2) ?? "",
          row.ema50?.toFixed(2) ?? "",
          row.rsi14?.toFixed(2) ?? "",
          row.macd?.toFixed(4) ?? "",
          row.signal?.toFixed(4) ?? "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${selected}_chart_data_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setSelected((prev) => (tickers.includes(prev) ? prev : tickers[0]!));
  }, [tickers]);

  return (
    <div className="min-h-dvh p-6 space-y-6">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-2xl font-semibold">Project Buffet • Marktanalyse</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded-md px-3 py-2 text-sm"
            placeholder="Ticker hinzufügen (z.B. SAP.DE)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim().toUpperCase();
                if (v && !tickers.includes(v)) setTickers((t) => [...t, v]);
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
          <button
            className="border rounded-md px-3 py-2 text-sm"
            onClick={() => mutate()}
            disabled={loadingHistory}
            title="Neu laden"
          >
            {loadingHistory ? <ReloadIcon className="animate-spin" /> : "Neu laden"}
          </button>
          <button
            className="border rounded-md px-3 py-2 text-sm flex items-center gap-1"
            onClick={exportToCSV}
            disabled={!chartData.length}
            title="CSV exportieren"
          >
            <DownloadIcon className="w-4 h-4" />
            CSV
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <aside className="md:col-span-1 border rounded-md p-3 space-y-2">
          <div className="text-sm font-medium mb-2">Tickers</div>
          <ul className="space-y-1">
            {tickers.map((t) => (
              <li key={t}>
                <button
                  className={`w-full text-left px-2 py-1 rounded ${selected === t ? "bg-black text-white" : "hover:bg-gray-100"}`}
                  onClick={() => setSelected(t)}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="md:col-span-3 space-y-4">
          <div className="border rounded-md p-3">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">{selected}</div>
              <div className="text-sm text-muted-foreground">
                {loadingQuote || loadingFx
                  ? "Lade Quote..."
                  : new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
                      (quote?.quote?.regularMarketPrice ?? 0) * (fx?.quote?.regularMarketPrice ?? 1)
                    )}
              </div>
            </div>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} syncId="synced" margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#111827" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide tick={{ fontSize: 12 }} />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(v))}
                  />
                  <Tooltip />
                  <Area type="monotone" dataKey="close" stroke="#111827" fill="url(#colorClose)" name="Close" />
                  <Line type="monotone" dataKey="sma20" stroke="#1d4ed8" dot={false} name="SMA 20" />
                  <Line type="monotone" dataKey="ema50" stroke="#dc2626" dot={false} name="EMA 50" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-2">RSI (14)</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} syncId="synced" margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <XAxis dataKey="date" hide tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rsi14" stroke="#16a34a" dot={false} name="RSI 14" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-2">MACD</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} syncId="synced" margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="macd" stroke="#7c3aed" dot={false} name="MACD" />
                  <Line type="monotone" dataKey="signal" stroke="#f59e0b" dot={false} name="Signal" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-2">Aktuelle Nachrichten</div>
            {loadingNews ? (
              <div className="text-sm text-muted-foreground">Lade Nachrichten...</div>
            ) : (
              <ul className="space-y-2">
                {news?.articles?.slice(0, 8).map((a, idx) => (
                  <li key={idx} className="text-sm">
                    <a className="underline" href={a.url} target="_blank" rel="noreferrer">
                      {a.title}
                    </a>
                    <span className="text-muted-foreground"> — {a.source?.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </section>
    </div>
  );
}
