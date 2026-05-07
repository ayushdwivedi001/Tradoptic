import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';

interface SignalData {
  time: string;
  total_ce_oi: number;
  total_pe_oi: number;
  net_oi_diff: number;
  signal: string;
}

interface OptionsRow {
  "Strike Price": number;
  "Call OI": number;
  "Call Chg OI": number;
  "Put OI": number;
  "Put Chg OI": number;
  "Net OI Diff": number;
}

interface Props {
  signals: SignalData[];
  underlying?: number;
  optionsData: OptionsRow[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: Record<string, unknown>[], label?: string }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value as number;
    return (
      <div className="bg-popover border border-border p-2 rounded-lg shadow-lg text-sm">
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className={`font-bold ${val > 0 ? 'text-success' : val < 0 ? 'text-destructive' : 'text-foreground'}`}>
          Net OI: {val > 0 ? '+' : ''}{val.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const TradingSignalCard: React.FC<Props> = ({ signals, optionsData }) => {
  // Current Signal
  const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;
  const signalText = latestSignal ? latestSignal.signal : "AWAITING DATA";
  
  let SignalIcon = MinusCircle;
  let signalColorClass = "text-muted-foreground";
  let signalBgClass = "bg-muted/10";
  
  if (signalText === "STRONG BUY") {
    SignalIcon = ArrowUpCircle;
    signalColorClass = "text-success";
    signalBgClass = "bg-success/10 border-success/20";
  } else if (signalText === "STRONG SELL") {
    SignalIcon = ArrowDownCircle;
    signalColorClass = "text-destructive";
    signalBgClass = "bg-destructive/10 border-destructive/20";
  }

  // Calculate Resistance and Support from optionsData
  let resistance = "N/A";
  let support = "N/A";
  
  if (optionsData && optionsData.length > 0) {
    let maxCe = { strike: 0, oi: -1 };
    let maxPe = { strike: 0, oi: -1 };
    
    optionsData.forEach(row => {
      if (row['Call OI'] > maxCe.oi) {
        maxCe = { strike: row['Strike Price'], oi: row['Call OI'] };
      }
      if (row['Put OI'] > maxPe.oi) {
        maxPe = { strike: row['Strike Price'], oi: row['Put OI'] };
      }
    });
    
    resistance = `${maxCe.strike} (${maxCe.oi.toLocaleString()})`;
    support = `${maxPe.strike} (${maxPe.oi.toLocaleString()})`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Signal Banner */}
      <div className={`border rounded-lg p-6 flex flex-col items-center justify-center transition-colors duration-500 ${signalBgClass}`}>
        <SignalIcon className={`mb-2 ${signalColorClass}`} size={48} strokeWidth={1.5} />
        <h3 className={`text-2xl font-bold tracking-tight ${signalColorClass}`}>{signalText}</h3>
        {latestSignal && (
          <p className="text-sm text-muted-foreground mt-2">
            Net OI Diff: <span className="font-medium text-foreground">{latestSignal.net_oi_diff?.toLocaleString() ?? '0'}</span>
          </p>
        )}
      </div>
      
      {/* Key Levels */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <p className="text-xs text-muted-foreground uppercase font-medium">Major Resistance (Call OI)</p>
          <p className="text-lg font-bold text-destructive mt-1">{resistance}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <p className="text-xs text-muted-foreground uppercase font-medium">Major Support (Put OI)</p>
          <p className="text-lg font-bold text-success mt-1">{support}</p>
        </div>
      </div>
      
      {/* Trend Chart */}
      <div className="mt-6 flex-1 min-h-[200px]">
        <p className="text-sm font-medium mb-3">Net OI Difference Trend</p>
        {signals.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={signals} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false} 
                axisLine={false} 
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                tickFormatter={(val) => `${((val || 0) / 1000000).toFixed(1)}M`}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="net_oi_diff" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-border rounded-lg text-sm text-muted-foreground">
            Waiting for more data points...
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingSignalCard;
