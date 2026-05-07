import React, { useState, useMemo, useEffect } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';

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
}

type SortOption = 'alphabetical' | 'gainers' | 'losers' | 'volume' | 'ltp' | 'chg_asc';
type ViewMode = 'visual' | 'table';

const STORAGE_KEY = 'nse-heatmap-settings';

interface StoredSettings {
  searchQuery: string;
  sortBy: SortOption;
  viewMode: ViewMode;
}

const getStoredSettings = (): StoredSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch { /* use defaults */ }
  return { searchQuery: '', sortBy: 'alphabetical', viewMode: 'visual' };
};

const saveSettings = (settings: StoredSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* storage full or unavailable */ }
};

const formatVolume = (vol: number): string => {
  if (vol >= 10000000) return `${(vol / 10000000).toFixed(1)}Cr`;
  if (vol >= 100000) return `${(vol / 100000).toFixed(1)}L`;
  return vol.toLocaleString();
};

const EquityHeatmap: React.FC<Props> = ({ data }) => {
  const storedSettings = getStoredSettings();
  const [searchQuery, setSearchQuery] = useState(storedSettings.searchQuery);
  const [sortBy, setSortBy] = useState<SortOption>(storedSettings.sortBy);
  const [viewMode, setViewMode] = useState<ViewMode>(storedSettings.viewMode);

  useEffect(() => {
    saveSettings({ searchQuery, sortBy, viewMode });
  }, [searchQuery, sortBy, viewMode]);

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(s => 
        s.Symbol.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }

    switch (sortBy) {
      case 'alphabetical':
        return filtered.sort((a, b) => a.Symbol.localeCompare(b.Symbol));
      case 'gainers':
        return filtered.sort((a, b) => b['% Chg'] - a['% Chg']);
      case 'losers':
        return filtered.sort((a, b) => a['% Chg'] - b['% Chg']);
      case 'volume':
        return filtered.sort((a, b) => b.Volume - a.Volume);
      case 'ltp':
        return filtered.sort((a, b) => b.LTP - a.LTP);
      case 'chg_asc':
        return filtered.sort((a, b) => a['% Chg'] - b['% Chg']);
      default:
        return filtered;
    }
  }, [data, searchQuery, sortBy]);

  const getColorIntensity = (chg: number): string => {
    const absChg = Math.abs(chg);
    if (chg > 0) {
      if (absChg >= 5) return 'bg-success';
      if (absChg >= 3) return 'bg-success/80';
      if (absChg >= 2) return 'bg-success/60';
      if (absChg >= 1) return 'bg-success/40';
      return 'bg-success/20';
    } else if (chg < 0) {
      if (absChg >= 5) return 'bg-destructive';
      if (absChg >= 3) return 'bg-destructive/80';
      if (absChg >= 2) return 'bg-destructive/60';
      if (absChg >= 1) return 'bg-destructive/40';
      return 'bg-destructive/20';
    }
    return 'bg-muted';
  };

  const getTextColor = (chg: number): string => {
    if (chg > 0) return 'text-success';
    if (chg < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No equity data available</div>;
  }

  const renderVisualHeatmap = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 p-2">
      {sortedData.map((item, index) => {
        const chg = item['% Chg'];
        const isPositive = chg > 0;
        const isNegative = chg < 0;

        return (
          <div
            key={index}
            className={`
              relative flex flex-col justify-between p-3 rounded-lg border border-border/30 
              hover:scale-[1.02] hover:shadow-lg hover:z-10 transition-all duration-200 cursor-pointer
              ${getColorIntensity(chg)}
              ${isPositive ? 'hover:border-success/50' : isNegative ? 'hover:border-destructive/50' : 'hover:border-muted-foreground/30'}
            `}
          >
            <div className="flex justify-between items-start">
              <span className="font-semibold text-xs truncate" title={item.Symbol}>
                {item.Symbol}
              </span>
              <span className={`text-xs font-bold ${getTextColor(chg)}`}>
                {isPositive ? '+' : ''}{chg.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2">
              <span className="text-lg font-bold">₹{item.LTP?.toLocaleString()}</span>
            </div>
            <div className="mt-1 opacity-70">
              <span className="text-[10px]">{formatVolume(item.Volume)}</span>
            </div>
            {chg > 2 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
            {chg < -2 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTableView = () => (
    <table className="w-full text-sm text-left">
      <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0">
        <tr>
          <th className="px-4 py-3 font-medium">Symbol</th>
          <th className="px-4 py-3 font-medium text-right">LTP</th>
          <th className="px-4 py-3 font-medium text-right">% Chg</th>
          <th className="px-4 py-3 font-medium text-right">Volume</th>
          <th className="px-4 py-3 font-medium text-right">Open</th>
          <th className="px-4 py-3 font-medium text-right">High</th>
          <th className="px-4 py-3 font-medium text-right">Low</th>
        </tr>
      </thead>
      <tbody>
        {sortedData.map((item, index) => {
          const chg = item['% Chg'];
          const isPositive = chg > 0;
          const isNegative = chg < 0;
          
          let bgClass = "bg-transparent";
          if (isPositive) {
            if (chg > 2) bgClass = "bg-success/20";
            else if (chg > 1) bgClass = "bg-success/10";
            else bgClass = "bg-success/5";
          } else if (isNegative) {
            if (chg < -2) bgClass = "bg-destructive/20";
            else if (chg < -1) bgClass = "bg-destructive/10";
            else bgClass = "bg-destructive/5";
          }

          return (
            <tr key={index} className={`border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors ${bgClass}`}>
              <td className="px-4 py-2.5 font-medium">{item.Symbol}</td>
              <td className="px-4 py-2.5 text-right font-medium">₹{item.LTP?.toLocaleString() ?? '0'}</td>
              <td className={`px-4 py-2.5 text-right font-medium ${getTextColor(chg)}`}>
                {isPositive ? '+' : ''}{chg ?? '0'}%
              </td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">{formatVolume(item.Volume)}</td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">₹{item.Open ?? '0'}</td>
              <td className="px-4 py-2.5 text-right text-success">₹{item.High ?? '0'}</td>
              <td className="px-4 py-2.5 text-right text-destructive">₹{item.Low ?? '0'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border/50 focus:border-primary focus:outline-none text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 focus:border-primary focus:outline-none text-sm cursor-pointer"
          >
            <option value="alphabetical">A-Z Alphabetical</option>
            <option value="gainers">Top Gainers</option>
            <option value="losers">Top Losers</option>
            <option value="volume">Highest Volume</option>
            <option value="ltp">Highest LTP</option>
            <option value="chg_asc">% Change (Low to High)</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('visual')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'visual' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-muted-foreground'
            }`}
            title="Grid View"
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

        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{sortedData.length}</span> / <span className="text-muted-foreground/60">{data.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'visual' ? renderVisualHeatmap() : renderTableView()}
      </div>
    </div>
  );
};

export default EquityHeatmap;