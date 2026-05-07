export type ActiveTab = 'overview' | 'heatmap' | 'options' | 'signals' | 'projections';

export interface MarketData {
  Symbol: string;
  LTP: number;
  '% Chg': number;
  Volume: number;
  Value: number;
  Open: number;
  High: number;
  Low: number;
}

export interface MarketDataResponse {
  data: MarketData[];
  last_updated: number;
  status: string;
}

export interface IndexList {
  status: string;
  indices: string[];
}

export interface OptionsRow {
  "Strike Price": number;
  "Call OI": number;
  "Call Chg OI": number;
  "Put OI": number;
  "Put Chg OI": number;
  "Net OI Diff": number;
}

export interface SignalData {
  time: string;
  total_ce_oi: number;
  total_pe_oi: number;
  net_oi_diff: number;
  signal: string;
}

export interface MarketBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  totalVolume: number;
  totalValue: number;
  dayHigh: number;
  dayLow: number;
  breadthPct: number;
}
