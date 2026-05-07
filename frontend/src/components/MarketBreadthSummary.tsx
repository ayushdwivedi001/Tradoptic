import React from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, Volume2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { MarketBreadth } from '../types';

interface Props {
  data: MarketBreadth | null;
}

const formatVolume = (vol: number): string => {
  if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)}Cr`;
  if (vol >= 100000) return `${(vol / 100000).toFixed(2)}L`;
  return vol.toLocaleString();
};

const MarketBreadthSummary: React.FC<Props> = ({ data }) => {
  if (!data) return null;

  const isPositive = data.breadthPct > 50;
  const isNegative = data.breadthPct < 50;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-success" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Advances</span>
        </div>
        <span className="text-2xl font-bold text-success">{data.advances}</span>
        <span className="text-xs text-muted-foreground mt-1">
          {data.advances > 0 ? `+${((data.advances / (data.advances + data.declines)) * 100).toFixed(0)}%` : '0%'}
        </span>
      </div>

      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-destructive" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Declines</span>
        </div>
        <span className="text-2xl font-bold text-destructive">{data.declines}</span>
        <span className="text-xs text-muted-foreground mt-1">
          {data.declines > 0 ? `${((data.declines / (data.advances + data.declines)) * 100).toFixed(0)}%` : '0%'}
        </span>
      </div>

      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Minus className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Unchanged</span>
        </div>
        <span className="text-2xl font-bold text-muted-foreground">{data.unchanged}</span>
      </div>

      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Breadth</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{data.breadthPct.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isPositive ? 'bg-success' : isNegative ? 'bg-destructive' : 'bg-muted-foreground'
            }`}
            style={{ width: `${data.breadthPct}%` }}
          />
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Volume</span>
        </div>
        <span className="text-xl font-bold text-foreground">{formatVolume(data.totalVolume)}</span>
        <span className="text-xs text-muted-foreground mt-1">shared</span>
      </div>

      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Day Range</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowDownRight className="w-4 h-4 text-destructive" />
          <span className="text-sm font-bold text-destructive">₹{data.dayLow.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <ArrowUpRight className="w-4 h-4 text-success" />
          <span className="text-sm font-bold text-success">₹{data.dayHigh.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default MarketBreadthSummary;