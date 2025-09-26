import {
  SMA,
  EMA,
  RSI,
  MACD,
} from "technicalindicators";

export type Candle = {
  date: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

export function calculateSMA(values: number[], period: number): number[] {
  return SMA.calculate({ values, period });
}

export function calculateEMA(values: number[], period: number): number[] {
  return EMA.calculate({ values, period });
}

export function calculateRSI(values: number[], period: number): number[] {
  return RSI.calculate({ values, period });
}

export function calculateMACD(values: number[], fast = 12, slow = 26, signal = 9) {
  return MACD.calculate({ values, fastPeriod: fast, slowPeriod: slow, signalPeriod: signal, SimpleMAOscillator: false, SimpleMASignal: false });
}

export function extractCloses(candles: Candle[]): number[] {
  return candles
    .map((c) => (typeof c.close === "number" ? c.close : null))
    .filter((v): v is number => v !== null);
}


