import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, TrendingUp, TrendingDown, Activity, Clock, Scale, BarChart3, List, LayoutGrid, RefreshCw } from 'lucide-react';

interface SignalData {
  time: string;
  total_ce_oi: number;
  total_pe_oi: number;
  net_oi_diff: number;
  signal: string;
}

interface Props {
  signals: SignalData[];
}

type SortOption = 'time' | 'call_oi' | 'put_oi' | 'net_diff';
type ViewMode = 'chart' | 'table';
type TimeRange = '5min' | '15min' | '30min' | 'all';

const SIGNAL_STORAGE_KEY = 'nse-signals-settings';

const getStoredSettings = () => {
  try {
    const stored = localStorage.getItem(SIGNAL_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* use defaults */ }
  return { sortBy: 'time', viewMode: 'chart', timeRange: 'all' };
};

const saveSettings = (settings: { sortBy: SortOption; viewMode: ViewMode; timeRange: TimeRange }) => {
  try {
    localStorage.setItem(SIGNAL_STORAGE_KEY, JSON.stringify(settings));
  } catch { /* storage unavailable */ }
};

const formatOI = (num: number): string => {
  if (!num || num === 0) return '0';
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  color: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-sm">
        <p className="text-muted-foreground mb-2 font-medium">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="text-xs" style={{ color: entry.color }}>
            {entry.dataKey === 'net_oi_diff' ? 'Net Diff' : entry.dataKey === 'total_ce_oi' ? 'Call OI' : 'Put OI'}: 
            <span className="font-medium ml-1">{formatOI(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TradingSignalCard: React.FC<Props> = ({ signals }) => {
  const stored = getStoredSettings();
  const [sortBy, setSortBy] = useState<SortOption>(stored.sortBy as SortOption);
  const [viewMode, setViewMode] = useState<ViewMode>(stored.viewMode as ViewMode);
  const [timeRange, setTimeRange] = useState<TimeRange>(stored.timeRange as TimeRange);

  useEffect(() => {
    saveSettings({ sortBy, viewMode, timeRange });
  }, [sortBy, viewMode, timeRange]);

  const filteredSignals = useMemo(() => {
    if (!signals || signals.length === 0 || timeRange === 'all') return signals;
    
    const lastSignalTime = signals[signals.length - 1]?.time;
    if (!lastSignalTime) return signals;
    
    const ranges: Record<TimeRange, number> = {
      '5min': 5,
      '15min': 15,
      '30min': 30,
      'all': 999
    };
    
    const maxPoints = ranges[timeRange];
    return signals.slice(-maxPoints);
  }, [signals, timeRange]);

  const stats = useMemo(() => {
    if (!filteredSignals || filteredSignals.length === 0) return null;
    
    const totalCallOI = filteredSignals.reduce((sum, s) => sum + (s.total_ce_oi || 0), 0);
    const totalPutOI = filteredSignals.reduce((sum, s) => sum + (s.total_pe_oi || 0), 0);
    const latestNet = filteredSignals[filteredSignals.length - 1]?.net_oi_diff || 0;
    const maxNetDiff = Math.max(...filteredSignals.map(s => s.net_oi_diff || 0));
    const minNetDiff = Math.min(...filteredSignals.map(s => s.net_oi_diff || 0));
    const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;
    
    let trend = 'NEUTRAL';
    if (filteredSignals.length >= 3) {
      const recent = filteredSignals.slice(-3).reduce((sum, s) => sum + (s.net_oi_diff || 0), 0) / 3;
      const older = filteredSignals.slice(0, 3).reduce((sum, s) => sum + (s.net_oi_diff || 0), 0) / 3;
      if (recent > older + 100000) trend = 'BULLISH';
      else if (recent < older - 100000) trend = 'BEARISH';
    }
    
    const signalChanges = filteredSignals.reduce((count, s, idx) => {
      if (idx > 0 && s.signal !== filteredSignals[idx - 1].signal) count++;
      return count;
    }, 0);

    return {
      totalCallOI,
      totalPutOI,
      latestNet,
      maxNetDiff,
      minNetDiff,
      pcr,
      trend,
      signalChanges,
      firstSignal: filteredSignals[0]?.signal || 'NEUTRAL',
      currentSignal: filteredSignals[filteredSignals.length - 1]?.signal || 'NEUTRAL'
    };
  }, [filteredSignals]);

  const sortedSignals = useMemo(() => {
    if (!filteredSignals) return [];
    const sorted = [...filteredSignals];
    
    switch (sortBy) {
      case 'call_oi':
        return sorted.sort((a, b) => (b.total_ce_oi || 0) - (a.total_ce_oi || 0));
      case 'put_oi':
        return sorted.sort((a, b) => (b.total_pe_oi || 0) - (a.total_pe_oi || 0));
      case 'net_diff':
        return sorted.sort((a, b) => (b.net_oi_diff || 0) - (a.net_oi_diff || 0));
      default:
        return sorted;
    }
  }, [filteredSignals, sortBy]);

  if (!signals || signals.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <RefreshCw className="animate-spin w-8 h-8 mx-auto mb-2" />
        <p>Awaiting signal data...</p>
        <p className="text-xs mt-2 opacity-60">Waiting for options chain data to populate</p>
      </div>
    );
  }

  const latestSignal = sortedSignals[sortedSignals.length - 1];
  const signalText = latestSignal?.signal || 'NEUTRAL';
  const netDiff = latestSignal?.net_oi_diff || 0;
  
  let signalConfig = {
    icon: MinusCircle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/20',
    gradientFrom: 'from-gray-500/20',
    gradientTo: 'to-gray-500/5'
  };
  
  if (signalText === 'STRONG BUY') {
    signalConfig = {
      icon: ArrowUpCircle,
      colorClass: 'text-success',
      bgClass: 'bg-success/20 border-success/40',
      gradientFrom: 'from-green-500/30',
      gradientTo: 'to-green-500/5'
    };
  } else if (signalText === 'BUY') {
    signalConfig = {
      icon: ArrowUpCircle,
      colorClass: 'text-success/80',
      bgClass: 'bg-success/10 border-success/20',
      gradientFrom: 'from-green-500/20',
      gradientTo: 'to-green-500/5'
    };
  } else if (signalText === 'STRONG SELL') {
    signalConfig = {
      icon: ArrowDownCircle,
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/20 border-destructive/40',
      gradientFrom: 'from-red-500/30',
      gradientTo: 'to-red-500/5'
    };
  } else if (signalText === 'SELL') {
    signalConfig = {
      icon: ArrowDownCircle,
      colorClass: 'text-destructive/80',
      bgClass: 'bg-destructive/10 border-destructive/20',
      gradientFrom: 'from-red-500/20',
      gradientTo: 'to-red-500/5'
    };
  }

  const SignalIcon = signalConfig.icon;
  const isStrong = Math.abs(netDiff) >= 1000000;

  const renderSignalBanner = () => (
    <div className={`relative overflow-hidden rounded-xl p-6 border ${signalConfig.bgClass} bg-gradient-to-br ${signalConfig.gradientFrom} ${signalConfig.gradientTo}`}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl bg-current" />
      <div className="relative flex flex-col items-center justify-center">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {latestSignal?.time || '--:--:--'}
          </span>
        </div>
        
        <SignalIcon className={`mt-3 ${signalConfig.colorClass}`} size={56} strokeWidth={1.5} />
        <h3 className={`text-3xl font-bold tracking-tight mt-2 ${signalConfig.colorClass}`}>
          {signalText}
        </h3>
        
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Net OI Diff:</span>
          <span className={`font-bold ${netDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
            {netDiff >= 0 ? '+' : ''}{formatOI(netDiff)}
          </span>
        </div>
        
        {isStrong && (
          <div className="mt-2 px-2 py-1 bg-primary/20 rounded-full">
            <span className="text-xs font-bold text-primary">THRESHOLD MET</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderSummaryMetrics = () => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <Scale className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase">PCR</span>
          </div>
          <span className={`text-lg font-bold ${stats.pcr > 1 ? 'text-destructive' : stats.pcr < 1 ? 'text-success' : 'text-foreground'}`}>
            {stats.pcr.toFixed(2)}
          </span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span className="text-[10px] text-muted-foreground uppercase">Max Net</span>
          </div>
          <span className="text-lg font-bold text-success">
            +{formatOI(stats.maxNetDiff)}
          </span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[10px] text-muted-foreground uppercase">Min Net</span>
          </div>
          <span className="text-lg font-bold text-destructive">
            {formatOI(stats.minNetDiff)}
          </span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase">Trend</span>
          </div>
          <span className={`text-lg font-bold ${stats.trend === 'BULLISH' ? 'text-success' : stats.trend === 'BEARISH' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {stats.trend}
          </span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase">Call OI</span>
          </div>
          <span className="text-lg font-bold text-destructive">
            {formatOI(stats.totalCallOI)}
          </span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-success" />
            <span className="text-[10px] text-muted-foreground uppercase">Put OI</span>
          </div>
          <span className="text-lg font-bold text-success">
            {formatOI(stats.totalPutOI)}
          </span>
        </div>
      </div>
    );
  };

  const renderChart = () => (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sortedSignals} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            tickFormatter={(val) => `${((val || 0) / 1000000).toFixed(1)}M`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={1000000} stroke="#22c55e" strokeDasharray="3 3" />
          <ReferenceLine y={-1000000} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
          <Area 
            type="monotone" 
            dataKey="net_oi_diff" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            fill="url(#netGradient)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderTable = () => (
    <div className="overflow-auto max-h-[300px]">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0">
          <tr>
            <th className="px-3 py-2.5 font-medium">Time</th>
            <th className="px-3 py-2.5 font-medium text-right">Call OI</th>
            <th className="px-3 py-2.5 font-medium text-right">Put OI</th>
            <th className="px-3 py-2.5 font-medium text-right">Net Diff</th>
            <th className="px-3 py-2.5 font-medium text-right">Signal</th>
          </tr>
        </thead>
        <tbody>
          {sortedSignals.map((sig, idx) => (
            <tr key={idx} className="border-b border-border/30 hover:bg-muted/30">
              <td className="px-3 py-2 text-muted-foreground font-mono">{sig.time}</td>
              <td className="px-3 py-2 text-right text-destructive">{formatOI(sig.total_ce_oi)}</td>
              <td className="px-3 py-2 text-right text-success">{formatOI(sig.total_pe_oi)}</td>
              <td className={`px-3 py-2 text-right font-medium ${(sig.net_oi_diff || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {(sig.net_oi_diff || 0) >= 0 ? '+' : ''}{formatOI(sig.net_oi_diff)}
              </td>
              <td className={`px-3 py-2 text-right font-medium ${
                sig.signal?.includes('BUY') ? 'text-success' : sig.signal?.includes('SELL') ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {sig.signal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4">
      {renderSignalBanner()}
      
      {renderSummaryMetrics()}

      <div className="flex flex-wrap items-center gap-3 p-3 border-y border-border/50 bg-card/30">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 focus:border-primary focus:outline-none text-sm cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="30min">Last 30 Min</option>
          <option value="15min">Last 15 Min</option>
          <option value="5min">Last 5 Min</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 focus:border-primary focus:outline-none text-sm cursor-pointer"
        >
          <option value="time">Time</option>
          <option value="call_oi">Highest Call OI</option>
          <option value="put_oi">Highest Put OI</option>
          <option value="net_diff">Net OI Diff</option>
        </select>

        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('chart')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'chart' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          <span className="font-medium">{sortedSignals.length}</span> data points
        </div>
      </div>

      {viewMode === 'chart' ? renderChart() : renderTable()}
    </div>
  );
};

export default TradingSignalCard;