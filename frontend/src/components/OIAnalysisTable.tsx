import React, { useState, useMemo, useEffect } from 'react';
import { Search, LayoutGrid, List, TrendingUp, TrendingDown, Activity, Target, Scale } from 'lucide-react';

interface OptionsRow {
  "Strike Price": number;
  "Call OI": number;
  "Call Chg OI": number;
  "Put OI": number;
  "Put Chg OI": number;
  "Net OI Diff": number;
}

interface Props {
  data: OptionsRow[];
  underlying?: number;
}

type SortOption = 'strike' | 'call_oi' | 'put_oi' | 'net_diff' | 'call_change' | 'put_change';
type ViewMode = 'visual' | 'table';

const OI_STORAGE_KEY = 'nse-options-settings';

const getStoredSettings = () => {
  try {
    const stored = localStorage.getItem(OI_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* use defaults */ }
  return { sortBy: 'strike', viewMode: 'visual' };
};

const saveSettings = (settings: { sortBy: SortOption; viewMode: ViewMode }) => {
  try {
    localStorage.setItem(OI_STORAGE_KEY, JSON.stringify(settings));
  } catch { /* storage unavailable */ }
};

const formatOI = (num: number): string => {
  if (!num || num === 0) return '0';
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const OIAnalysisTable: React.FC<Props> = ({ data, underlying = 0 }) => {
  const stored = getStoredSettings();
  const [sortBy, setSortBy] = useState<SortOption>(stored.sortBy as SortOption);
  const [viewMode, setViewMode] = useState<ViewMode>(stored.viewMode as ViewMode);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    saveSettings({ sortBy, viewMode });
  }, [sortBy, viewMode]);

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(s => 
        s['Strike Price'].toString().includes(searchQuery.trim())
      );
    }

    switch (sortBy) {
      case 'strike':
        return filtered.sort((a, b) => a['Strike Price'] - b['Strike Price']);
      case 'call_oi':
        return filtered.sort((a, b) => (b['Call OI'] || 0) - (a['Call OI'] || 0));
      case 'put_oi':
        return filtered.sort((a, b) => (b['Put OI'] || 0) - (a['Put OI'] || 0));
      case 'net_diff':
        return filtered.sort((a, b) => (b['Net OI Diff'] || 0) - (a['Net OI Diff'] || 0));
      case 'call_change':
        return filtered.sort((a, b) => (b['Call Chg OI'] || 0) - (a['Call Chg OI'] || 0));
      case 'put_change':
        return filtered.sort((a, b) => (b['Put Chg OI'] || 0) - (a['Put Chg OI'] || 0));
      default:
        return filtered;
    }
  }, [data, searchQuery, sortBy]);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const totalCallOI = data.reduce((sum, r) => sum + (r['Call OI'] || 0), 0);
    const totalPutOI = data.reduce((sum, r) => sum + (r['Put OI'] || 0), 0);
    const totalCallChg = data.reduce((sum, r) => sum + (r['Call Chg OI'] || 0), 0);
    const totalPutChg = data.reduce((sum, r) => sum + (r['Put Chg OI'] || 0), 0);
    const totalNetDiff = totalPutOI - totalCallOI;
    const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;
    
    let maxPain = 0;
    let minDiff = Infinity;
    data.forEach(row => {
      const callOI = row['Call OI'] || 0;
      const putOI = row['Put OI'] || 0;
      const diff = Math.abs(callOI - putOI);
      if (diff < minDiff) {
        minDiff = diff;
        maxPain = row['Strike Price'];
      }
    });

    const maxCallOI = Math.max(...data.map(r => r['Call OI'] || 0));
    const maxPutOI = Math.max(...data.map(r => r['Put OI'] || 0));

    const maxCallStrike = data.find(r => r['Call OI'] === maxCallOI)?.['Strike Price'] || 0;
    const maxPutStrike = data.find(r => r['Put OI'] === maxPutOI)?.['Strike Price'] || 0;

    return {
      totalCallOI,
      totalPutOI,
      totalCallChg,
      totalPutChg,
      totalNetDiff,
      pcr,
      maxPain,
      maxCallStrike,
      maxPutStrike
    };
  }, [data]);

  const getOIColor = (value: number, max: number): string => {
    if (!value || value === 0) return 'bg-transparent';
    const intensity = Math.min(value / max, 1);
    if (intensity > 0.8) return 'bg-success';
    if (intensity > 0.6) return 'bg-success/70';
    if (intensity > 0.4) return 'bg-success/50';
    if (intensity > 0.2) return 'bg-success/30';
    return 'bg-success/20';
  };

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No options data available</div>;
  }

  const renderPCRGauge = () => {
    if (!stats) return null;
    const pcr = stats.pcr;
    let pcrStatus = 'NEUTRAL';
    let pcrColor = 'text-muted-foreground';
    let gaugeColor = 'bg-muted';
    
    if (pcr > 1.5) {
      pcrStatus = 'BEARISH';
      pcrColor = 'text-destructive';
      gaugeColor = 'bg-destructive';
    } else if (pcr > 1.2) {
      pcrStatus = 'SLIGHTLY BEARISH';
      pcrColor = 'text-destructive/80';
      gaugeColor = 'bg-destructive/70';
    } else if (pcr < 0.7) {
      pcrStatus = 'BULLISH';
      pcrColor = 'text-success';
      gaugeColor = 'bg-success';
    } else if (pcr < 0.9) {
      pcrStatus = 'SLIGHTLY BULLISH';
      pcrColor = 'text-success/80';
      gaugeColor = 'bg-success/70';
    }

    return (
      <div className="flex flex-col items-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">PCR</div>
        <div className={`text-3xl font-bold ${pcrColor}`}>{pcr.toFixed(2)}</div>
        <div className="text-xs font-medium text-muted-foreground mt-1">{pcrStatus}</div>
        <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${gaugeColor}`}
            style={{ width: `${Math.min(pcr * 33, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const renderSummaryBar = () => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground uppercase">PCR</span>
          </div>
          {renderPCRGauge()}
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase">Max Pain</span>
          </div>
          <span className="text-2xl font-bold">₹{stats.maxPain}</span>
          <span className="text-xs text-muted-foreground mt-1">Min OI Diff</span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground uppercase">Call OI</span>
          </div>
          <span className="text-xl font-bold">{formatOI(stats.totalCallOI)}</span>
          <span className={`text-xs ${stats.totalCallChg >= 0 ? 'text-success' : 'text-destructive'}`}>
            {stats.totalCallChg >= 0 ? '+' : ''}{formatOI(Math.abs(stats.totalCallChg))}
          </span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground uppercase">Put OI</span>
          </div>
          <span className="text-xl font-bold">{formatOI(stats.totalPutOI)}</span>
          <span className={`text-xs ${stats.totalPutChg >= 0 ? 'text-success' : 'text-destructive'}`}>
            {stats.totalPutChg >= 0 ? '+' : ''}{formatOI(Math.abs(stats.totalPutChg))}
          </span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase">Max Call OI</span>
          </div>
          <span className="text-xl font-bold">₹{stats.maxCallStrike}</span>
          <span className="text-xs text-muted-foreground mt-1">{formatOI(Math.max(...data.map(r => r['Call OI'])))}</span>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground uppercase">Max Put OI</span>
          </div>
          <span className="text-xl font-bold">₹{stats.maxPutStrike}</span>
          <span className="text-xs text-muted-foreground mt-1">{formatOI(Math.max(...data.map(r => r['Put OI'])))}</span>
        </div>
      </div>
    );
  };

  const renderVisualGrid = () => {
    if (!stats) return null;
    const maxCall = Math.max(...data.map(r => r['Call OI'] || 0));
    const maxPut = Math.max(...data.map(r => r['Put OI'] || 0));

    return (
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1"></div>
        <div className="col-span-2 flex justify-around text-xs text-muted-foreground uppercase font-medium">
          <span className="text-destructive">CALL SIDE</span>
          <span className="text-success">PUT SIDE</span>
        </div>
        
        {sortedData.map((item, idx) => {
          const isATM = underlying > 0 && Math.abs(item['Strike Price'] - underlying) <= (item['Strike Price'] % 50 || 50);
          const callOI = item['Call OI'] || 0;
          const putOI = item['Put OI'] || 0;
          const callChg = item['Call Chg OI'] || 0;
          const putChg = item['Put Chg OI'] || 0;
          
          return (
            <React.Fragment key={idx}>
              <div className={`col-span-1 py-2 px-2 font-bold text-center ${isATM ? 'bg-primary/20 border border-primary/40 rounded-lg' : ''}`}>
                <span className="text-sm">₹{item['Strike Price']}</span>
                {isATM && <span className="ml-1 text-[10px] text-primary font-bold">ATM</span>}
              </div>
              
              <div className={`col-span-1 py-2 px-2 rounded-lg ${getOIColor(callOI, maxCall)} flex flex-col items-center justify-center`}>
                <span className="font-bold text-sm">{formatOI(callOI)}</span>
                <div className={`flex items-center text-xs ${callChg >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {callChg >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="ml-1">{callChg >= 0 ? '+' : ''}{formatOI(callChg)}</span>
                </div>
              </div>
              
              <div className={`col-span-1 py-2 px-2 rounded-lg ${getOIColor(putOI, maxPut)} flex flex-col items-center justify-center`}>
                <span className="font-bold text-sm">{formatOI(putOI)}</span>
                <div className={`flex items-center text-xs ${putChg >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {putChg >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="ml-1">{putChg >= 0 ? '+' : ''}{formatOI(putChg)}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderTable = () => {
    if (!stats) return null;

    return (
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0">
          <tr>
            <th className="px-3 py-2.5 font-medium">Strike</th>
            <th className="px-3 py-2.5 font-medium text-right">Call Chg</th>
            <th className="px-3 py-2.5 font-medium text-right text-destructive">Call OI</th>
            <th className="px-3 py-2.5 font-medium text-right text-success">Put OI</th>
            <th className="px-3 py-2.5 font-medium text-right">Put Chg</th>
            <th className="px-3 py-2.5 font-medium text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, idx) => {
            const isATM = underlying > 0 && Math.abs(item['Strike Price'] - underlying) <= (item['Strike Price'] % 50 || 50);
            const netDiff = item['Net OI Diff'] || 0;
            
            return (
              <tr key={idx} className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${isATM ? 'bg-primary/10' : ''}`}>
                <td className={`px-3 py-2.5 font-bold ${isATM ? 'text-primary' : ''}`}>
                  ₹{item['Strike Price']}
                  {isATM && <span className="ml-1 text-[10px] bg-primary/20 px-1 rounded">ATM</span>}
                </td>
                <td className={`px-3 py-2.5 text-right ${(item['Call Chg OI'] || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(item['Call Chg OI'] || 0) >= 0 ? '+' : ''}{formatOI(item['Call Chg OI'] || 0)}
                </td>
                <td className={`px-3 py-2.5 text-right font-medium ${isATM ? 'bg-destructive/20' : ''}`}>
                  {formatOI(item['Call OI'] || 0)}
                </td>
                <td className={`px-3 py-2.5 text-right font-medium ${isATM ? 'bg-success/20' : ''}`}>
                  {formatOI(item['Put OI'] || 0)}
                </td>
                <td className={`px-3 py-2.5 text-right ${(item['Put Chg OI'] || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(item['Put Chg OI'] || 0) >= 0 ? '+' : ''}{formatOI(item['Put Chg OI'] || 0)}
                </td>
                <td className={`px-3 py-2.5 text-right font-bold ${netDiff > 0 ? 'text-success' : netDiff < 0 ? 'text-destructive' : ''}`}>
                  {netDiff > 0 ? '+' : ''}{formatOI(netDiff)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {renderSummaryBar()}

      <div className="flex flex-wrap items-center gap-3 p-3 border-y border-border/50 bg-card/30">
        <div className="relative min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter strike..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-muted/50 border border-border/50 focus:border-primary focus:outline-none text-sm"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 focus:border-primary focus:outline-none text-sm cursor-pointer"
        >
          <option value="strike">Strike Price</option>
          <option value="call_oi">Highest Call OI</option>
          <option value="put_oi">Highest Put OI</option>
          <option value="net_diff">Net OI Diff</option>
          <option value="call_change">Call OI Change</option>
          <option value="put_change">Put OI Change</option>
        </select>

        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('visual')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'visual' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-muted-foreground'
            }`}
            title="Visual Grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'table' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-muted-foreground'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          <span className="font-medium">{sortedData.length}</span> strikes
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'visual' ? renderVisualGrid() : renderTable()}
      </div>
    </div>
  );
};

export default OIAnalysisTable;