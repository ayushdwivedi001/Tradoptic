import time
import random
import requests
import pandas as pd
from playwright.sync_api import sync_playwright
import xlwings as xw
import os

EXCEL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "NSE_Live_Terminal.xlsx")

def get_cookies(headless=True):
    print(f"Fetching fresh cookies from NSE via browser (Headless: {headless})...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()
        try:
            page.goto("https://www.nseindia.com", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(5000)
        except Exception as e:
            print(f"Browser timeout or error: {e}")
        cookies = context.cookies()
        browser.close()
    return {c['name']: c['value'] for c in cookies}

def fetch_data(cookies):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/"
    }
    session = requests.Session()
    session.headers.update(headers)
    session.cookies.update(cookies)
    
    try:
        session.get("https://www.nseindia.com", timeout=10)
    except:
        pass
    
    api_url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050"
    try:
        resp = session.get(api_url, timeout=10)
        if resp.status_code != 200:
            return None
            
        data = resp.json()
        stocks = data.get("data", [])
        
        processed = []
        for stock in stocks:
            if stock.get("symbol") == "NIFTY 50": continue
            processed.append({
                "Symbol": stock.get("symbol", ""),
                "LTP": stock.get("lastPrice", 0),
                "% Chg": stock.get("pChange", 0),
                "Volume": stock.get("totalTradedVolume", 0),
                "Value(Cr)": stock.get("totalTradedValue", 0),
                "Open": stock.get("open", 0),
                "High": stock.get("dayHigh", 0),
                "Low": stock.get("dayLow", 0)
            })
        df = pd.DataFrame(processed)
        df["% Chg"] = pd.to_numeric(df["% Chg"])
        return df
    except Exception as e:
        print(f"Equity Request error: {e}")
        return None

def fetch_option_chain(cookies, symbol="NIFTY"):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/option-chain"
    }
    session = requests.Session()
    session.headers.update(headers)
    session.cookies.update(cookies)
    
    try:
        session.get("https://www.nseindia.com", timeout=10)
    except:
        pass
        
    api_url = f"https://www.nseindia.com/api/option-chain-indices?symbol={symbol}"
    try:
        resp = session.get(api_url, timeout=10)
        if resp.status_code != 200:
            return None, None
            
        data = resp.json()
        records = data.get("records", {})
        data_list = records.get("data", [])
        underlying_val = records.get("underlyingValue", 0)
        
        # Sort by strike price
        data_list.sort(key=lambda x: x.get("strikePrice", 0))
        
        # Find ATM strike
        closest_strike = None
        min_diff = float('inf')
        for item in data_list:
            strike = item.get("strikePrice")
            diff = abs(strike - underlying_val)
            if diff < min_diff:
                min_diff = diff
                closest_strike = strike
                
        # Find index of ATM
        atm_index = -1
        for i, item in enumerate(data_list):
            if item.get("strikePrice") == closest_strike:
                atm_index = i
                break
                
        if atm_index == -1:
            return None, None
            
        # Get 5 strikes below and 5 strikes above
        start_idx = max(0, atm_index - 5)
        end_idx = min(len(data_list), atm_index + 6)
        
        selected_data = data_list[start_idx:end_idx]
        
        processed = []
        for item in selected_data:
            ce = item.get("CE", {})
            pe = item.get("PE", {})
            strike = item.get("strikePrice")
            
            ce_oi = ce.get("openInterest", 0)
            ce_chg_oi = ce.get("changeinOpenInterest", 0)
            pe_oi = pe.get("openInterest", 0)
            pe_chg_oi = pe.get("changeinOpenInterest", 0)
            
            net_oi_diff = pe_oi - ce_oi
            
            processed.append({
                "Strike Price": strike,
                "Call OI": ce_oi,
                "Call Chg OI": ce_chg_oi,
                "Put OI": pe_oi,
                "Put Chg OI": pe_chg_oi,
                "Net OI Diff": net_oi_diff
            })
            
        df = pd.DataFrame(processed)
        return df, underlying_val
    except Exception as e:
        print(f"Option Chain error: {e}")
        return None, None

def setup_ui(wb):
    sheet_names = [s.name for s in wb.sheets]
    if "Dashboard" not in sheet_names:
        wb.sheets.add("Dashboard", after=wb.sheets[-1])
    if "Heatmap" not in sheet_names:
        wb.sheets.add("Heatmap", after=wb.sheets[-1])
    if "OI Analysis" not in sheet_names:
        wb.sheets.add("OI Analysis", after=wb.sheets[-1])
    if "Trading Signals" not in sheet_names:
        wb.sheets.add("Trading Signals", after=wb.sheets[-1])
        
    dash = wb.sheets["Dashboard"]
    heat = wb.sheets["Heatmap"]
    oi_sheet = wb.sheets["OI Analysis"]
    ts_sheet = wb.sheets["Trading Signals"]
    
    # Hide gridlines
    try:
        dash.api.Tab.Color = 0x0000FF
        oi_sheet.api.Tab.Color = 0x00FF00
        ts_sheet.api.Tab.Color = 0xFF0000
        dash.api.Application.ActiveWindow.DisplayGridlines = False
        heat.api.Application.ActiveWindow.DisplayGridlines = False
        wb.app.activate()
        oi_sheet.activate()
        oi_sheet.api.Application.ActiveWindow.DisplayGridlines = False
        ts_sheet.activate()
        ts_sheet.api.Application.ActiveWindow.DisplayGridlines = False
        dash.activate()
    except:
        pass
    
    # --- Dashboard Setup ---
    dash.range("A1:R50").color = (20, 20, 20)
    dash.range("A1").value = "NIFTY 50 LIVE TERMINAL"
    dash.range("A1:K2").api.Merge()
    dash.range("A1").api.Font.Bold = True
    dash.range("A1").api.Font.Size = 24
    dash.range("A1").api.HorizontalAlignment = -4108 # Center
    dash.range("A1").api.VerticalAlignment = -4108
    dash.range("A1").color = (0, 102, 204)
    dash.range("A1").api.Font.Color = 0xFFFFFF 
    
    dash.range("A4").value = "TOP 5 GAINERS"
    dash.range("A4:E4").api.Merge()
    dash.range("A4").color = (0, 153, 0)
    dash.range("A4").api.Font.Color = 0xFFFFFF
    dash.range("A4").api.Font.Bold = True
    dash.range("A4").api.HorizontalAlignment = -4108
    
    dash.range("G4").value = "TOP 5 LOSERS"
    dash.range("G4:K4").api.Merge()
    dash.range("G4").color = (204, 0, 0)
    dash.range("G4").api.Font.Color = 0xFFFFFF
    dash.range("G4").api.Font.Bold = True
    dash.range("G4").api.HorizontalAlignment = -4108
    
    dash.range("A:K").column_width = 12
    dash.range("A5:K11").api.Font.Color = 0xFFFFFF
    
    # --- OI Analysis Setup ---
    oi_sheet.range("A1:R50").color = (255, 255, 255)
    
    oi_sheet.range("A1").value = "OPTIONS OPEN INTEREST ANALYSIS"
    oi_sheet.range("A1:G1").api.Merge()
    oi_sheet.range("A1").api.Font.Bold = True
    oi_sheet.range("A1").api.Font.Size = 18
    oi_sheet.range("A1").color = (230, 240, 250)
    oi_sheet.range("A1").api.Font.Color = 0x000000 
    
    oi_sheet.range("A2").value = "Select Index:"
    oi_sheet.range("A2").api.Font.Color = 0x000000
    oi_sheet.range("A2").api.Font.Bold = True
    
    oi_sheet.range("B2").value = "NIFTY"
    oi_sheet.range("B2").color = (240, 240, 240)
    oi_sheet.range("B2").api.Font.Color = 0x000000
    oi_sheet.range("B2").api.Font.Bold = True
    
    try:
        oi_sheet.range("B2").api.Validation.Delete()
        oi_sheet.range("B2").api.Validation.Add(Type=3, AlertStyle=1, Operator=1, Formula1="NIFTY,BANKNIFTY,FINNIFTY,MIDCPNIFTY")
    except:
        pass
        
    oi_sheet.range("D2").value = "Underlying:"
    oi_sheet.range("D2").api.Font.Color = 0x000000
    oi_sheet.range("D2").api.Font.Bold = True
    oi_sheet.range("E2").api.Font.Color = 0x000000
    oi_sheet.range("E2").api.Font.Bold = True

    oi_sheet.range("A4:G4").value = ["Strike Price", "Call OI", "Call Chg OI", "Put OI", "Put Chg OI", "Net OI Diff", ""]
    oi_sheet.range("A4:F4").color = (220, 220, 220)
    oi_sheet.range("A4:F4").api.Font.Color = 0x000000
    oi_sheet.range("A4:F4").api.Font.Bold = True
    oi_sheet.range("A:F").column_width = 15
    
    oi_sheet.range("A5:F15").api.Font.Color = 0x000000
    oi_sheet.range("A5:F15").api.HorizontalAlignment = -4108 # Center
    
    oi_sheet.range("A17").value = "MARKET SENTIMENT SUMMARY"
    oi_sheet.range("A17:G17").api.Merge()
    oi_sheet.range("A17").color = (230, 230, 230)
    oi_sheet.range("A17").api.Font.Color = 0x000000
    oi_sheet.range("A17").api.Font.Bold = True
    
    oi_sheet.range("A18:G20").api.Font.Color = 0x000000
    
    # --- Trading Signals Setup ---
    ts_sheet.range("A1:R50").color = (255, 255, 255)
    
    ts_sheet.range("A1").value = "ALGORITHMIC TRADING SIGNALS"
    ts_sheet.range("A1:C1").api.Merge()
    ts_sheet.range("A1").api.Font.Bold = True
    ts_sheet.range("A1").api.Font.Size = 18
    ts_sheet.range("A1").color = (230, 240, 250)
    ts_sheet.range("A1").api.Font.Color = 0x000000 
    
    ts_sheet.range("B2").value = "Refresh Interval (Mins):"
    ts_sheet.range("B2").api.Font.Bold = True
    ts_sheet.range("C2").value = 15
    ts_sheet.range("C2").color = (240, 240, 240)
    ts_sheet.range("C2").api.Font.Bold = True
    
    ts_sheet.range("B3").value = "Next Update Expected:"
    ts_sheet.range("B3").api.Font.Bold = True
    
    ts_sheet.range("A5:C10").api.Merge()
    ts_sheet.range("A5").value = "AWAITING DATA..."
    ts_sheet.range("A5").api.Font.Size = 22
    ts_sheet.range("A5").api.Font.Bold = True
    ts_sheet.range("A5").api.HorizontalAlignment = -4108
    ts_sheet.range("A5").api.VerticalAlignment = -4108
    ts_sheet.range("A5").color = (200, 200, 200)
    
    ts_sheet.range("A16:G16").value = ["Time", "Underlying", "Total CE OI", "Total PE OI", "Net OI Diff", "Signal", ""]
    ts_sheet.range("A16:F16").color = (0, 51, 102)
    ts_sheet.range("A16:F16").api.Font.Color = 0xFFFFFF
    ts_sheet.range("A16:F16").api.Font.Bold = True
    ts_sheet.range("A:F").column_width = 15

def update_ui(wb, df):
    dash = wb.sheets["Dashboard"]
    heat = wb.sheets["Heatmap"]
    
    dash.range("A3").value = f"Market Status: LIVE  |  Last Updated: {time.strftime('%I:%M:%S %p')}"
    dash.range("A3").api.Font.Color = 0x00FF00 # Green
    dash.range("A3").api.Font.Bold = True
    
    gainers = df.sort_values(by="% Chg", ascending=False).head(5)[["Symbol", "LTP", "% Chg", "Volume"]]
    losers = df.sort_values(by="% Chg", ascending=True).head(5)[["Symbol", "LTP", "% Chg", "Volume"]]
    
    dash.range("A5").options(index=False).value = gainers
    dash.range("G5").options(index=False).value = losers
    
    # Format Heatmap
    heat.clear_contents()
    heat.range("A1").options(index=False).value = df
    heat.range("A1:H1").color = (0, 51, 102)
    heat.range("A1:H1").api.Font.Color = 0xFFFFFF
    heat.range("A1:H1").api.Font.Bold = True
    
    last_row = len(df) + 1
    vals = heat.range(f"C2:C{last_row}").value
    for i, v in enumerate(vals):
        try:
            cell = heat.range(f"C{i+2}")
            if float(v) > 0:
                cell.color = (102, 255, 102) 
            elif float(v) < 0:
                cell.color = (255, 102, 102) 
            else:
                cell.color = (200, 200, 200) 
        except:
            pass
            
    if len(dash.charts) == 0:
        chart1 = dash.charts.add(left=dash.range("A13").left, top=dash.range("A13").top, width=350, height=200)
        chart1.set_source_data(dash.range("A5:A10,C5:C10"))
        chart1.chart_type = 'column_clustered'
        chart1.api[1].HasTitle = True
        chart1.api[1].ChartTitle.Text = "Gainers %"
        
        chart2 = dash.charts.add(left=dash.range("G13").left, top=dash.range("G13").top, width=350, height=200)
        chart2.set_source_data(dash.range("G5:G10,I5:I10"))
        chart2.chart_type = 'column_clustered'
        chart2.api[1].HasTitle = True
        chart2.api[1].ChartTitle.Text = "Losers %"
    else:
        dash.charts[0].set_source_data(dash.range("A5:A10,C5:C10"))
        dash.charts[1].set_source_data(dash.range("G5:G10,I5:I10"))

def update_oi_ui(wb, oi_df, underlying_val):
    if oi_df is None or oi_df.empty:
        return
        
    oi_sheet = wb.sheets["OI Analysis"]
    oi_sheet.range("E2").value = underlying_val
    
    oi_sheet.range("A5").options(index=False, header=False).value = oi_df
    
    if underlying_val == 0 and oi_df["Strike Price"].sum() == 0:
        sentiment = "⚠️ NSE Data Unavailable (Market Closed / Maintenance)"
        summary_text1 = "Waiting for live market data to populate Call OI Resistance."
        summary_text2 = "Waiting for live market data to populate Put OI Support."
        summary_text3 = sentiment
    else:
        max_ce_row = oi_df.loc[oi_df["Call OI"].idxmax()]
        max_pe_row = oi_df.loc[oi_df["Put OI"].idxmax()]
        
        res_strike = max_ce_row["Strike Price"]
        supp_strike = max_pe_row["Strike Price"]
        
        net_oi_sum = oi_df["Net OI Diff"].sum()
        sentiment = "BULLISH (Put Writers Dominating)" if net_oi_sum > 0 else "BEARISH (Call Writers Dominating)"
        if abs(net_oi_sum) < sum(oi_df["Call OI"]) * 0.05:
            sentiment = "NEUTRAL / RANGEBOUND"
            
        summary_text1 = f"Highest Call OI (Resistance) is at Strike {res_strike} with {max_ce_row['Call OI']} contracts."
        summary_text2 = f"Highest Put OI (Support) is at Strike {supp_strike} with {max_pe_row['Put OI']} contracts."
        summary_text3 = f"Overall Sentiment (Nearest 11 Strikes): {sentiment}. Net OI Diff: {net_oi_sum}."
        
    oi_sheet.range("A18").value = summary_text1
    oi_sheet.range("A19").value = summary_text2
    oi_sheet.range("A20").value = summary_text3
    
    if len(oi_sheet.charts) == 0:
        chart = oi_sheet.charts.add(left=oi_sheet.range("H4").left, top=oi_sheet.range("H4").top, width=600, height=350)
        chart.chart_type = 'line_markers'
        chart.set_source_data(oi_sheet.range("A4:B15,D4:D15,F4:F15")) 
        chart.api[1].HasTitle = True
        chart.api[1].ChartTitle.Text = "Open Interest Profile"
    else:
        oi_sheet.charts[0].set_source_data(oi_sheet.range("A4:B15,D4:D15,F4:F15"))

def update_trading_signals(wb, oi_df, underlying_val):
    if oi_df is None or oi_df.empty:
        return
        
    ts_sheet = wb.sheets["Trading Signals"]
    
    try:
        interval = float(ts_sheet.range("C2").value)
    except:
        interval = 15.0
        ts_sheet.range("C2").value = interval
        
    total_ce_oi = oi_df["Call OI"].sum()
    total_pe_oi = oi_df["Put OI"].sum()
    net_oi_diff = total_pe_oi - total_ce_oi
    
    if net_oi_diff > 1000000:
        signal = "STRONG BUY"
        color = (0, 204, 0) # Green
    elif net_oi_diff < -1000000:
        signal = "STRONG SELL"
        color = (255, 0, 0) # Red
    else:
        signal = "NEUTRAL"
        color = (200, 200, 200) # Gray
        
    if underlying_val == 0 and oi_df["Strike Price"].sum() == 0:
        signal = "MARKET CLOSED"
        color = (150, 150, 150)
        
    # Update Signal Box
    ts_sheet.range("A5").value = signal
    ts_sheet.range("A5").color = color
    if color == (200, 200, 200) or color == (150, 150, 150):
        ts_sheet.range("A5").api.Font.Color = 0x000000
    else:
        ts_sheet.range("A5").api.Font.Color = 0xFFFFFF
        
    # Append to Historical Log
    # Find last row in column A starting from A16
    last_row = ts_sheet.range("A" + str(ts_sheet.cells.last_cell.row)).end('up').row
    if last_row < 16:
        last_row = 16
    next_row = last_row + 1
    
    current_time = time.strftime('%I:%M %p')
    new_data = [current_time, underlying_val, total_ce_oi, total_pe_oi, net_oi_diff, signal]
    ts_sheet.range(f"A{next_row}").value = new_data
    
    # Update the Line Chart for Net OI Diff
    if len(ts_sheet.charts) == 0:
        chart = ts_sheet.charts.add(left=ts_sheet.range("E2").left, top=ts_sheet.range("E2").top, width=500, height=250)
        chart.chart_type = 'line_markers'
        chart.set_source_data(ts_sheet.range(f"A16:A{next_row},E16:E{next_row}")) 
        chart.api[1].HasTitle = True
        chart.api[1].ChartTitle.Text = "Net OI Trend"
    else:
        ts_sheet.charts[0].set_source_data(ts_sheet.range(f"A16:A{next_row},E16:E{next_row}"))

def get_selected_index(wb):
    try:
        val = wb.sheets["OI Analysis"].range("B2").value
        if val in ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"]:
            return val
    except:
        pass
    return "NIFTY"

def main():
    print("=== VOXKAGE NSE TERMINAL DAEMON ===")
    # First connection: Visible to show it's working
    cookies = get_cookies(headless=False)
    
    app = xw.App(visible=True)
    if os.path.exists(EXCEL_FILE):
        wb = app.books.open(EXCEL_FILE)
    else:
        wb = app.books.add()
        wb.save(EXCEL_FILE)
        
    setup_ui(wb)
    
    last_signal_time = 0
    
    while True:
        try:
            print(f"[{time.strftime('%I:%M:%S %p')}] Fetching Market Data...")
            
            df = fetch_data(cookies)
            if df is None:
                # Background refresh: Headless so it doesn't interrupt
                cookies = get_cookies(headless=True)
                df = fetch_data(cookies)
                
            selected_index = get_selected_index(wb)
            print(f"[{time.strftime('%I:%M:%S %p')}] Fetching OI Data for {selected_index}...")
            oi_df, underlying_val = fetch_option_chain(cookies, selected_index)
            if oi_df is None:
                # Background refresh: Headless
                cookies = get_cookies(headless=True)
                oi_df, underlying_val = fetch_option_chain(cookies, selected_index)
                
            if df is not None:
                update_ui(wb, df)
            if oi_df is not None:
                update_oi_ui(wb, oi_df, underlying_val)
                
            # --- Trading Signals Independent Timer Logic ---
            try:
                interval_mins = float(wb.sheets["Trading Signals"].range("C2").value)
            except:
                interval_mins = 15.0
                
            target_seconds = interval_mins * 60
            # Add small jitter (e.g. +/- 5% of the interval)
            jitter_seconds = target_seconds + random.uniform(-0.05 * target_seconds, 0.05 * target_seconds)
            
            if time.time() - last_signal_time >= jitter_seconds:
                print(f"[{time.strftime('%I:%M:%S %p')}] Generating Trading Signals (Interval: {interval_mins}m)...")
                update_trading_signals(wb, oi_df, underlying_val)
                last_signal_time = time.time()
                
                # Update next expected time
                next_time = time.strftime('%I:%M %p', time.localtime(last_signal_time + target_seconds))
                wb.sheets["Trading Signals"].range("C3").value = next_time
                
            wb.save()
            
            sleep_time = random.uniform(60, 85)
            print(f"Update complete. Sleeping for {sleep_time:.2f} seconds.")
            
            time.sleep(sleep_time)
        except Exception as e:
            print(f"Main loop error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()