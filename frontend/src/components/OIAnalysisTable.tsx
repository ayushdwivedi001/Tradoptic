import React from 'react';

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
}

const OIAnalysisTable: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No options data available</div>;
  }

  // Calculate totals
  const totalCallOI = data.reduce((acc, curr) => acc + (curr['Call OI'] || 0), 0);
  const totalPutOI = data.reduce((acc, curr) => acc + (curr['Put OI'] || 0), 0);
  const totalNetDiff = data.reduce((acc, curr) => acc + (curr['Net OI Diff'] || 0), 0);

  return (
    <div className="w-full">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-medium">Strike</th>
            <th className="px-4 py-3 font-medium text-right text-destructive">Call OI</th>
            <th className="px-4 py-3 font-medium text-right">Call Chg</th>
            <th className="px-4 py-3 font-medium text-right text-success">Put OI</th>
            <th className="px-4 py-3 font-medium text-right">Put Chg</th>
            <th className="px-4 py-3 font-medium text-right">Net Diff</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const netDiff = item['Net OI Diff'];
            const isBullish = netDiff > 0;
            const isBearish = netDiff < 0;

            return (
              <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-bold">{item['Strike Price']}</td>
                <td className="px-4 py-2.5 text-right">{item['Call OI']?.toLocaleString() ?? '0'}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{item['Call Chg OI']?.toLocaleString() ?? '0'}</td>
                <td className="px-4 py-2.5 text-right">{item['Put OI']?.toLocaleString() ?? '0'}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{item['Put Chg OI']?.toLocaleString() ?? '0'}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${isBullish ? 'text-success' : isBearish ? 'text-destructive' : ''}`}>
                  {isBullish ? '+' : ''}{netDiff?.toLocaleString() ?? '0'}
                </td>
              </tr>
            );
          })}
          {/* Totals Row */}
          <tr className="bg-muted/50 font-bold border-t-2 border-border">
            <td className="px-4 py-3">TOTAL (11 ATM)</td>
            <td className="px-4 py-3 text-right text-destructive">{totalCallOI?.toLocaleString() ?? '0'}</td>
            <td className="px-4 py-3 text-right"></td>
            <td className="px-4 py-3 text-right text-success">{totalPutOI?.toLocaleString() ?? '0'}</td>
            <td className="px-4 py-3 text-right"></td>
            <td className={`px-4 py-3 text-right ${totalNetDiff > 0 ? 'text-success' : totalNetDiff < 0 ? 'text-destructive' : ''}`}>
              {totalNetDiff > 0 ? '+' : ''}{totalNetDiff?.toLocaleString() ?? '0'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default OIAnalysisTable;
