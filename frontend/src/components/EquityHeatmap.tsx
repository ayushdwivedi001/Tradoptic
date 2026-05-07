import React from 'react';

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

const EquityHeatmap: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No equity data available</div>;
  }

  // Sort alphabetically by symbol for heatmap
  const sortedData = [...data].sort((a, b) => a.Symbol.localeCompare(b.Symbol));

  return (
    <div className="w-full">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
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
            
            // Heatmap color logic
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
              <tr key={index} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${bgClass}`}>
                <td className="px-4 py-2.5 font-medium">{item.Symbol}</td>
                <td className="px-4 py-2.5 text-right font-medium">₹{item.LTP?.toLocaleString() ?? '0'}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${isPositive ? 'text-success' : isNegative ? 'text-destructive' : ''}`}>
                  {isPositive ? '+' : ''}{chg ?? '0'}%
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{item.Volume?.toLocaleString() ?? '0'}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{item.Open ?? '0'}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{item.High ?? '0'}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{item.Low ?? '0'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EquityHeatmap;
