import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time, CandlestickData, LineData } from 'lightweight-charts';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, List, LayoutGrid, Info, Scale } from 'lucide-react';

interface SignalData {
  time: string;
  total_ce_oi: number;
  total_pe_oi: number;
  net_oi_diff: number;
  signal: string;
}

interface MarketData {
  Symbol: string;
  LTP: number;
  '% Chg': number;
  Volume: number;
  Value: number;
  Open: number;
  High: number;
  Low: number;
}

interface Props {
  signals: SignalData[];
  marketData: MarketData[];
}

type TimeRange = '3d' | '7d' | '14d';

const PROJECTION_STORAGE_KEY = 'nse-projections-settings';

const getStoredSettings = () => {
  try {
    const stored = localStorage.getItem(PROJECTION_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* use defaults */ }
  return { timeframe: '7d' };
};

const saveSettings = (settings: { timeframe: TimeRange }) => {
  try {
    localStorage.setItem(PROJECTION_STORAGE_KEY, JSON.stringify(settings));
  } catch { /* storage unavailable */ }
};

interface ProjectionDay {
  dayTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  expected: number;
  bestCase: number;
  worstCase: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

const calculateProjections = (
  signals: SignalData[],
  marketData: MarketData[],
  timeframe: TimeRange
): ProjectionDay[] => {
  if (!signals || signals.length === 0 || !marketData || marketData.length === 0) return [];

  const daysMap: Record<TimeRange, number> = { '3d': 3, '7d': 7, '14d': 14 };
  const projectionDays = daysMap[timeframe];
  
  const currentMomentum = signals.slice(-5).reduce((sum, s) => sum + (s.net_oi_diff || 0), 0) / 5;
  const absMomentum = Math.abs(currentMomentum);
  
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (absMomentum > 1000000) confidence = 'HIGH';
  else if (absMomentum > 500000) confidence = 'MEDIUM';

  const recentPCR = signals.slice(-3).reduce((sum, s) => {
    const pcr = (s.total_pe_oi || 0) / ((s.total_ce_oi || 1));
    return sum + pcr;
  }, 0) / 3;

  const avgVolume = marketData.slice(0, 10).reduce((sum, m) => sum + (m.Volume || 0), 0) / 10;
  const basePrice = marketData[0]?.LTP || 25000;
  const baseTime = Math.floor(Date.now() / 1000);
  
  const trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 
    currentMomentum > 200000 ? 'BULLISH' : 
    currentMomentum < -200000 ? 'BEARISH' : 'NEUTRAL';

  const projections: ProjectionDay[] = [];
  let prevClose = basePrice;
  
  for (let i = 1; i <= projectionDays; i++) {
    const dayTime = baseTime + (i * 86400);
    const dayFactor = 1 + (i * 0.05);
    const volatility = absMomentum / 5000000;
    const pcrFactor = recentPCR > 1 ? -0.02 : 0.01;
    
    const expectedChange = (currentMomentum / avgVolume * 1000 * dayFactor) + (basePrice * pcrFactor * dayFactor);
    const expected = prevClose + expectedChange;
    
    const bestCase = expected + (Math.abs(expectedChange) * volatility * 1.5);
    const worstCase = expected - (Math.abs(expectedChange) * volatility * 1.2);
    
    const high = Math.max(prevClose, expected, bestCase) * (1 + volatility * 0.02);
    const low = Math.min(prevClose, expected, worstCase) * (1 - volatility * 0.02);
    
    projections.push({
      dayTime,
      open: prevClose,
      high,
      low,
      close: expected,
      expected,
      bestCase,
      worstCase,
      confidence,
      trend
    });
    
    prevClose = expected;
  }
  
  return projections;
};

const TrendProjections: React.FC<Props> = ({ signals, marketData }) => {
  const stored = getStoredSettings();
  const [timeframe, setTimeframe] = useState<TimeRange>(stored.timeframe as TimeRange);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeries = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    saveSettings({ timeframe });
  }, [timeframe]);

  const projections = useMemo(() => 
    calculateProjections(signals, marketData, timeframe),
    [signals, marketData, timeframe]
  );

  const latestProjection = projections[projections.length - 1];
  const trend = latestProjection?.trend || 'NEUTRAL';
  const confidence = latestProjection?.confidence || 'LOW';

  useEffect(() => {
    if (!chartContainerRef.current || projections.length === 0 || viewMode !== 'chart') return;

    if (!chartInstance.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: true },
      });

      const candle = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      const line = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 2,
        crosshairMarkerVisible: false,
      });

      chartInstance.current = chart;
      candleSeries.current = candle;
      lineSeries.current = line;
    }

    const candleData: CandlestickData[] = projections.map(p => ({
      time: p.dayTime as Time,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }));

    const lineData: LineData[] = projections.map(p => ({
      time: p.dayTime as Time,
      value: p.expected,
    }));

    if (candleSeries.current) candleSeries.current.setData(candleData);
    if (lineSeries.current) lineSeries.current.setData(lineData);
    if (chartInstance.current) chartInstance.current.timeScale().fitContent();

    const handleResize = () => {
      if (chartInstance.current && chartContainerRef.current) {
        chartInstance.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.remove();
        chartInstance.current = null;
        candleSeries.current = null;
        lineSeries.current = null;
      }
    };
  }, [projections, viewMode]);

  const renderTrendBanner = () => {
    let config = { icon: Activity, colorClass: 'text-muted-foreground', bgClass: 'bg-muted/20' };
    
    if (trend === 'BULLISH') config = { icon: TrendingUp, colorClass: 'text-success', bgClass: 'bg-success/20' };
    else if (trend === 'BEARISH') config = { icon: TrendingDown, colorClass: 'text-destructive', bgClass: 'bg-destructive/20' };

    const TrendIcon = config.icon;

    return (
      <div className={`rounded-xl p-5 border ${config.bgClass} border-border/50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendIcon className={config.colorClass} size={40} />
            <div>
              <h3 className={`text-2xl font-bold ${config.colorClass}`}>{trend} TREND</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Next {timeframe === '3d' ? '3 Days' : timeframe === '7d' ? '7 Days' : '14 Days'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Confidence</p>
              <span className={`text-lg font-bold ${confidence === 'HIGH' ? 'text-success' : confidence === 'MEDIUM' ? 'text-amber-400' : 'text-muted-foreground'}`}>
                {confidence}
              </span>
            </div>
            {latestProjection && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase">Expected</p>
                <span className="text-lg font-bold text-primary">{latestProjection.expected.toFixed(0)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMetrics = () => {
    if (!latestProjection) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card/60 border border-border/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-3.5 h-3.5 text-success" /><span className="text-[10px] text-muted-foreground uppercase">Best Case</span></div>
          <span className="text-lg font-bold text-success">+{latestProjection.bestCase.toFixed(0)}</span>
        </div>
        <div className="bg-card/60 border border-border/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1"><TrendingDown className="w-3.5 h-3.5 text-destructive" /><span className="text-[10px] text-muted-foreground uppercase">Worst Case</span></div>
          <span className="text-lg font-bold text-destructive">{latestProjection.worstCase.toFixed(0)}</span>
        </div>
        <div className="bg-card/60 border border-border/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] text-muted-foreground uppercase">Range</span></div>
          <span className="text-lg font-bold">{(latestProjection.bestCase - latestProjection.worstCase).toFixed(0)}</span>
        </div>
        <div className="bg-card/60 border border-border/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1"><Scale className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] text-muted-foreground uppercase">Change</span></div>
          <span className={`text-lg font-bold ${(latestProjection.expected - latestProjection.open) >= 0 ? 'text-success' : 'text-destructive'}`}>
            {(latestProjection.expected - latestProjection.open) >= 0 ? '+' : ''}{(latestProjection.expected - latestProjection.open).toFixed(0)}
          </span>
        </div>
      </div>
    );
  };

  const renderTable = () => (
    <div className="overflow-auto max-h-[250px]">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0">
          <tr><th className="px-3 py-2.5 font-medium">Day</th><th className="px-3 py-2.5 font-medium text-right">Open</th><th className="px-3 py-2.5 font-medium text-right">High</th><th className="px-3 py-2.5 font-medium text-right">Low</th><th className="px-3 py-2.5 font-medium text-right">Close</th><th className="px-3 py-2.5 font-medium text-right">Best</th><th className="px-3 py-2.5 font-medium text-right">Worst</th></tr>
        </thead>
        <tbody>
          {projections.map((p, idx) => {
            const date = new Date(p.dayTime * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <tr key={idx} className="border-b border-border/30 hover:bg-muted/30">
                <td className="px-3 py-2.5 font-medium">{dayName}</td>
                <td className="px-3 py-2.5 text-right">{p.open.toFixed(0)}</td>
                <td className="px-3 py-2.5 text-right text-success">{p.high.toFixed(0)}</td>
                <td className="px-3 py-2.5 text-right text-destructive">{p.low.toFixed(0)}</td>
                <td className="px-3 py-2.5 text-right font-medium">{p.close.toFixed(0)}</td>
                <td className="px-3 py-2.5 text-right text-success/80">+{p.bestCase.toFixed(0)}</td>
                <td className="px-3 py-2.5 text-right text-destructive/80">{p.worstCase.toFixed(0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (!signals || signals.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Calculating projections...</p>
        <p className="text-xs mt-2 opacity-60">Requires market data to generate</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {renderTrendBanner()}
      {renderMetrics()}

      <div className="flex flex-wrap items-center gap-3 p-3 border-y border-border/50 bg-card/30">
        <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as TimeRange)} className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 focus:border-primary focus:outline-none text-sm cursor-pointer">
          <option value="3d">3 Days</option>
          <option value="7d">7 Days</option>
          <option value="14d">14 Days</option>
        </select>

        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <button onClick={() => setViewMode('chart')} className={`p-2 rounded-md transition-colors ${viewMode === 'chart' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}><List className="w-4 h-4" /></button>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-3 h-3" /><span>Projections based on current trends</span>
        </div>
      </div>

      {viewMode === 'chart' ? <div ref={chartContainerRef} className="flex-1 min-h-[300px]" /> : renderTable()}

      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-500/80">These projections are calculated based on historical OI patterns and market momentum. They are NOT guaranteed outcomes and should be used alongside other analysis methods. Always verify with official sources before making investment decisions.</p>
      </div>
    </div>
  );
};

export default TrendProjections;