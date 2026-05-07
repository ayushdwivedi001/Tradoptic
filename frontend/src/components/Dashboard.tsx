import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, AlertCircle, Clock } from 'lucide-react';
import GainerLoserChart from './GainerLoserChart';
import EquityHeatmap from './EquityHeatmap';
import OIAnalysisTable from './OIAnalysisTable';
import TradingSignalCard from './TradingSignalCard';
import MarketBreadthSummary from './MarketBreadthSummary';
import type { ActiveTab, MarketData, OptionsRow, SignalData, IndexList } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

interface DashboardProps {
  activeTab: ActiveTab;
}

const Dashboard: React.FC<DashboardProps> = ({ activeTab }) => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [optionsData, setOptionsData] = useState<OptionsRow[]>([]);
  const [underlyingVal, setUnderlyingVal] = useState<number>(0);
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [dataTimestamp, setDataTimestamp] = useState<number>(0);
  const [availableIndices, setAvailableIndices] = useState<string[]>(['NIFTY 50']);
  const [selectedIndex, setSelectedIndex] = useState<string>('NIFTY 50');

  const marketBreadth = useMemo(() => {
    if (marketData.length === 0) return null;
    
    const advances = marketData.filter(s => s['% Chg'] > 0).length;
    const declines = marketData.filter(s => s['% Chg'] < 0).length;
    const unchanged = marketData.filter(s => s['% Chg'] === 0).length;
    const totalVolume = marketData.reduce((sum, s) => sum + s.Volume, 0);
    const totalValue = marketData.reduce((sum, s) => sum + s.Value, 0);
    const dayHigh = Math.max(...marketData.map(s => s.High));
    const dayLow = Math.min(...marketData.filter(s => s.Low > 0).map(s => s.Low));
    const breadthPct = marketData.length > 0 ? (advances / marketData.length) * 100 : 0;
    
    return {
      advances,
      declines,
      unchanged,
      totalVolume,
      totalValue,
      dayHigh,
      dayLow,
      breadthPct
    };
  }, [marketData]);

useEffect(() => {
    const fetchIndices = async () => {
      try {
        const indicesRes = await axios.get<IndexList>(`${API_BASE_URL}/indices`);
        if (indicesRes.data.status === 'success') {
          setAvailableIndices(indicesRes.data.indices || ['NIFTY 50']);
        }
      } catch (err) {
        console.warn('Failed to fetch indices list:', err);
      }
    };
    fetchIndices();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [niftyRes, optionsRes, signalsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/market/index/${encodeURIComponent(selectedIndex)}`),
          axios.get(`${API_BASE_URL}/options/NIFTY`),
          axios.get(`${API_BASE_URL}/signals`)
        ]);

        if (!isMounted) return;

        if (niftyRes.data.status === 'success') {
          setMarketData(niftyRes.data.data || []);
          if (niftyRes.data.last_updated) {
            const timestamp = niftyRes.data.last_updated;
            setLastUpdated(new Date(timestamp * 1000).toLocaleTimeString());
            setDataTimestamp(timestamp);
          }
        } else {
          console.warn('Market API returned non-success status:', niftyRes.data);
        }
        
        if (optionsRes.data.status === 'success') {
          setOptionsData(optionsRes.data.data || []);
          setUnderlyingVal(optionsRes.data.underlying || 0);
        } else {
          console.warn('Options API returned non-success status:', optionsRes.data);
        }
        
        if (signalsRes.data.status === 'success') {
          setSignals(signalsRes.data.data || []);
        } else {
          console.warn('Signals API returned non-success status:', signalsRes.data);
        }
        
        setError(null);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error("Error fetching data", err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to backend API';
        setError(errorMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedIndex]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
        <RefreshCw className="animate-spin mb-4 text-primary" size={32} />
        <p className="text-sm font-medium">Connecting to NSE Data Stream...</p>
        <p className="text-xs mt-2 opacity-60">Fetching market data from backend</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
        <AlertCircle className="mb-4 text-destructive" size={32} />
        <p className="text-sm font-medium text-destructive">{error}</p>
        <p className="text-xs mt-2 opacity-60">Please ensure FastAPI backend is running on port 8000</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="h-full flex flex-col space-y-6">
            <MarketBreadthSummary data={marketBreadth} />
            <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-lg">Top Performers</h2>
              </div>
              <div className="p-6 flex-1 min-h-[400px]">
                <GainerLoserChart data={marketData} timestamp={dataTimestamp} />
              </div>
            </div>
          </div>
        );
      case 'heatmap':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-lg">Equity Heatmap</h2>
                  <select
                    value={selectedIndex}
                    onChange={(e) => setSelectedIndex(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border/60 focus:border-primary focus:outline-none text-sm font-medium"
                  >
                    {availableIndices.map((idx) => (
                      <option key={idx} value={idx}>{idx}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <EquityHeatmap data={marketData} />
              </div>
            </div>
          </div>
        );
      case 'options':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                <h2 className="font-semibold text-lg">Options Open Interest (ATM &plusmn; 5)</h2>
                <div className="bg-muted px-3 py-1 rounded-md text-sm font-medium">
                  Underlying: <span className="text-foreground">{underlyingVal}</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <OIAnalysisTable data={optionsData} underlying={underlyingVal} />
              </div>
            </div>
          </div>
        );
      case 'signals':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-lg">Trading Signals Analysis</h2>
              </div>
              <div className="p-6 flex-1 overflow-auto bg-muted/20">
                 <TradingSignalCard signals={signals} underlying={underlyingVal} optionsData={optionsData} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full space-y-6">
      {/* Top Status Bar */}
      <div className="flex justify-between items-center bg-card border border-border rounded-xl px-6 py-4 shadow-sm flex-none">
        <div>
          <h1 className="text-2xl font-bold tracking-tight capitalize">{activeTab.replace('-', ' ')}</h1>
          <div className="flex items-center text-sm text-muted-foreground mt-1 space-x-4">
            <div className="flex items-center">
              <span className="relative flex h-2.5 w-2.5 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
              </span>
              Market LIVE
            </div>
            <div className="flex items-center">
              <Clock size={14} className="mr-1.5" />
              {lastUpdated || 'Fetching...'}
            </div>
          </div>
        </div>
        <button 
          onClick={() => { setLoading(true); /* force refresh logic here if needed */ }}
          className="flex items-center text-sm font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 transition-colors px-4 py-2 rounded-lg border border-border/50 shadow-sm"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> 
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="flex-none bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center shadow-sm">
          <AlertCircle className="mr-2 flex-shrink-0" size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Debug Data Status (Development Only) */}
      {marketData.length === 0 && !loading && !error && (
        <div className="flex-none bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-lg flex items-center shadow-sm">
          <AlertCircle className="mr-2 flex-shrink-0" size={18} />
          <span className="text-sm font-medium">Warning: API returned success but market data is empty. Check backend logs.</span>
        </div>
      )}

      {/* Dynamic Content Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
