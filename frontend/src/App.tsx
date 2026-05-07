import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { Moon, Sun, Activity, BarChart2, TrendingUp, Layers, Zap } from 'lucide-react';
import type { ActiveTab } from './types';

const TAB_STORAGE_KEY = 'nse-active-tab';
const THEME_STORAGE_KEY = 'nse-terminal-theme';

function App() {
  const storedTab = (): ActiveTab => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved && ['overview', 'heatmap', 'options', 'signals'].includes(saved)) {
        return saved as ActiveTab;
      }
    } catch { /* use default */ }
    return 'overview';
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as 'light' | 'dark') || 'dark';
  });
  
  const [activeTab, setActiveTab] = useState<ActiveTab>(storedTab);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
    { id: 'heatmap', label: 'Equity Heatmap', icon: <BarChart2 size={18} /> },
    { id: 'options', label: 'Options Chain', icon: <Layers size={18} /> },
    { id: 'signals', label: 'Trading Signals', icon: <TrendingUp size={18} /> },
    { id: 'projections', label: 'Trend Projections', icon: <Zap size={18} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-500">
      <header className="flex-none border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Activity className="text-primary" size={20} />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="font-bold text-lg text-foreground tracking-tight">NSE Terminal</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] opacity-80">Live Market</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-bold uppercase tracking-wider">
               <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse mr-2"></span>
               System Online
             </div>
             
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/40 transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-64 flex-none border-r border-border/40 bg-card/30 backdrop-blur-sm hidden lg:flex flex-col py-6 sticky top-14 h-[calc(100vh-3.5rem)]">
          <div className="px-4 pb-4">
            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4 opacity-60">Main Menu</p>
            <nav className="space-y-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                    activeTab === item.id
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                  }`}
                >
                  <span className={`${activeTab === item.id ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'} transition-opacity`}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="mt-auto px-6 py-6 border-t border-border/20">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                Professional terminal for NSE India. Always verify trades via official broker.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 min-h-[calc(100vh-3.5rem)] bg-background/50">
          {/* Mobile Nav - visible only on small screens */}
          <div className="lg:hidden flex overflow-x-auto p-4 space-x-2 border-b border-border/40 bg-card/20">
             {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex-none flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === item.id
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
          </div>

          <div className="p-4 lg:p-8 flex flex-col flex-1">
            <ErrorBoundary>
              <Dashboard activeTab={activeTab} />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}


export default App;
