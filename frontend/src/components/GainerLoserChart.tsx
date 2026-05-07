import React, { useMemo, useEffect, useRef, useState } from 'react';
import { createChart, ColorType, HistogramSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time, HistogramData } from 'lightweight-charts';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const CHART_STORAGE_KEY = 'nse-chart-stock-count';

const getStoredStockCount = (): number => {
  try {
    const saved = localStorage.getItem(CHART_STORAGE_KEY);
    if (!saved) return 15;
    const count = parseInt(saved, 10);
    if (!isNaN(count) && count >= 5 && count <= 25) return count;
  } catch { /* use default */ }
  return 15;
};

const saveStockCount = (count: number) => {
  try {
    localStorage.setItem(CHART_STORAGE_KEY, count.toString());
  } catch { /* storage full or unavailable */ }
};

interface EquityData {
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
  data: EquityData[];
  timestamp: number;
}

interface TooltipDataType {
  time: Time;
  value: number;
  color: string;
  symbol: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

const GainerLoserChart: React.FC<Props> = ({ data, timestamp }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const seriesInstance = useRef<ISeriesApi<"Histogram"> | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipDataType | null>(null);
  const [stockCount, setStockCount] = useState(getStoredStockCount);

  const handleStockCountChange = (newCount: number) => {
    setStockCount(newCount);
    saveStockCount(newCount);
  };

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sorted = [...data].sort((a, b) => b['% Chg'] - a['% Chg']);
    const gainers = sorted.slice(0, stockCount);
    const losers = sorted.slice(-stockCount);
    
    const combined = [...gainers, ...losers].sort((a, b) => b['% Chg'] - a['% Chg']);

    const baseTime = timestamp;

    return combined.map((item, index) => ({
      time: (baseTime + index * 300) as Time, 
      value: item['% Chg'],
      color: item['% Chg'] >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
      symbol: item.Symbol,
      price: item.LTP,
      volume: item.Volume,
      high: item.High,
      low: item.Low,
      open: item.Open
    }));
  }, [data, timestamp, stockCount]);

  useEffect(() => {
    if (!chartContainerRef.current || processedData.length === 0) return;

    const containerRef = chartContainerRef.current;
    let chartApi: IChartApi | null = null;

    try {
      chartApi = createChart(containerRef, {
        layout: {
          background: { type: ColorType.Solid, color: '#111115' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderVisible: false,
          timeVisible: false,
        },
        crosshair: {
          mode: 1, 
          vertLine: {
            width: 1,
            color: 'rgba(255, 255, 255, 0.4)',
            style: 3, 
          },
          horzLine: {
            visible: false,
          }
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      });

      const seriesApi = chartApi.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'custom', formatter: (price: number) => `${(price || 0).toFixed(2)}%` },
      });

      chartApi.subscribeCrosshairMove((param) => {
        if (!param || !param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
          setTooltipData(null);
        } else {
          const item = processedData.find(d => d.time === param.time);
          if (item) {
            setTooltipData(item);
          } else {
            setTooltipData(null);
          }
        }
      });

      chartInstance.current = chartApi;
      seriesInstance.current = seriesApi;

      const histogramData = processedData.map(item => ({
        time: item.time,
        value: item.value || 0,
        color: item.color,
      }));

      seriesApi.setData(histogramData as HistogramData[]);
      chartApi.timeScale().fitContent();

      const resizeObserver = new ResizeObserver((entries) => {
        if (entries.length === 0) { return; }
        const newRect = entries[0].contentRect;
        if (chartApi && newRect.width > 0 && newRect.height > 0) {
          chartApi.applyOptions({ width: newRect.width, height: newRect.height });
        }
      });

      resizeObserver.observe(containerRef);
      resizeRef.current = resizeObserver;
    } catch (err) {
      console.error('Chart initialization error:', err);
    }

    return () => {
      if (resizeRef.current) {
        resizeRef.current.disconnect();
        resizeRef.current = null;
      }
      if (chartInstance.current) {
        chartInstance.current.remove();
        chartInstance.current = null;
        seriesInstance.current = null;
      }
    };
  }, [processedData]);

  if (processedData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
        <Activity className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No market data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Chart Section */}
      <div className="relative w-full h-[350px] bg-[#111115] border border-border/50 rounded-xl overflow-hidden p-4 group flex flex-col">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4" /> Market Breadth Overview
          </h3>
        </div>
        
        <div className="absolute top-4 right-4 z-10">
          <select
            value={stockCount}
            onChange={(e) => handleStockCountChange(parseInt(e.target.value))}
            className="bg-muted/80 border border-border/50 rounded-lg px-2 py-1 text-xs cursor-pointer"
          >
            <option value="5">5 stocks</option>
            <option value="10">10 stocks</option>
            <option value="15">15 stocks</option>
            <option value="20">20 stocks</option>
          </select>
        </div>
        
        {/* Custom HTML Tooltip */}
        {tooltipData && (
          <div className="absolute top-12 left-4 z-20 bg-background/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-2xl min-w-[200px] pointer-events-none transition-opacity duration-150">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-foreground text-lg">{tooltipData.symbol}</span>
              <span className={`font-semibold flex items-center text-sm ${tooltipData.value >= 0 ? 'text-success' : 'text-destructive'}`}>
                {tooltipData.value >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                {tooltipData.value.toFixed(2)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">LTP</span>
              <span className="text-right font-medium text-foreground">₹{tooltipData.price?.toLocaleString()}</span>
              <span className="text-muted-foreground">Open</span>
              <span className="text-right text-foreground">₹{tooltipData.open?.toLocaleString()}</span>
              <span className="text-muted-foreground">High</span>
              <span className="text-right text-success">₹{tooltipData.high?.toLocaleString()}</span>
              <span className="text-muted-foreground">Low</span>
              <span className="text-right text-destructive">₹{tooltipData.low?.toLocaleString()}</span>
            </div>
          </div>
        )}
        
        <div ref={chartContainerRef} className="w-full flex-1 mt-4" />
      </div>

      {/* Tabular Details Section */}
      <div className="flex-1 bg-card border border-border/50 rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border/50 bg-muted/20">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Movers Detail</h4>
        </div>
        <div className="overflow-auto flex-1 custom-scrollbar p-2">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-card z-10 text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium px-2">Symbol</th>
                <th className="pb-2 font-medium text-right px-2">LTP</th>
                <th className="pb-2 font-medium text-right px-2">% Chg</th>
                <th className="pb-2 font-medium text-right px-2">Volume</th>
                <th className="pb-2 font-medium text-right px-2 hidden sm:table-cell">High</th>
                <th className="pb-2 font-medium text-right px-2 hidden sm:table-cell">Low</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {processedData.map((item, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors group cursor-default">
                  <td className="py-2 px-2 font-medium text-foreground">{item.symbol}</td>
                  <td className="py-2 px-2 text-right font-mono">₹{item.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className={`py-2 px-2 text-right font-medium ${item.value >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {item.value > 0 ? '+' : ''}{item.value?.toFixed(2)}%
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground font-mono">
                    {item.volume >= 10000000 
                      ? `${(item.volume / 10000000).toFixed(2)}Cr` 
                      : item.volume >= 100000 
                        ? `${(item.volume / 100000).toFixed(2)}L` 
                        : item.volume?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground hidden sm:table-cell">{item.high?.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground hidden sm:table-cell">{item.low?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GainerLoserChart;
