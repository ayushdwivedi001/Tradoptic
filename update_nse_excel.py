from playwright.sync_api import sync_playwright
import requests
import pandas as pd
import time
import os

def fetch_nse_live_data():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/"
    }
    
    print("Starting browser to fetch cookies...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(user_agent=headers["User-Agent"])
        page = context.new_page()
        
        # Navigate to NSE
        page.goto("https://www.nseindia.com", wait_until="domcontentloaded", timeout=60000)
        
        # Wait for bot protection to pass and cookies to be set
        print("Waiting 5 seconds for security clearance...")
        page.wait_for_timeout(5000)
        
        cookies_list = context.cookies()
        browser.close()
        
    # Format cookies for requests
    cookies_dict = {cookie['name']: cookie['value'] for cookie in cookies_list}
    print(f"Fetched {len(cookies_dict)} cookies. Now fetching live data...")
    
    # Use requests to fetch live NIFTY 50 data
    session = requests.Session()
    session.headers.update(headers)
    session.cookies.update(cookies_dict)
    
    # We must hit the base URL once with the session before the API to establish routing
    session.get("https://www.nseindia.com", timeout=10)
    
    api_url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050"
    response = session.get(api_url, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        print("Live data fetched successfully. Processing...")
        
        # Extract stock data
        stocks = data.get("data", [])
        
        # We'll pick the most relevant columns to display
        processed_data = []
        for stock in stocks:
            processed_data.append({
                "Symbol": stock.get("symbol", ""),
                "Open": stock.get("open", 0),
                "High": stock.get("dayHigh", 0),
                "Low": stock.get("dayLow", 0),
                "LTP (Last Price)": stock.get("lastPrice", 0),
                "Previous Close": stock.get("previousClose", 0),
                "% Change": stock.get("pChange", 0),
                "Volume (Traded Qty)": stock.get("totalTradedVolume", 0),
                "Value (Rs. Crores)": stock.get("totalTradedValue", 0),
                "52W High": stock.get("yearHigh", 0),
                "52W Low": stock.get("yearLow", 0)
            })
            
        df = pd.DataFrame(processed_data)
        
        # Save to Excel
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Live_NIFTY50_Data.xlsx")
        df.to_excel(output_path, index=False)
        print(f"Excel file created successfully at: {output_path}")
    else:
        print(f"Failed to fetch data. Status code: {response.status_code}")
        print("Response text:", response.text[:200])

if __name__ == "__main__":
    fetch_nse_live_data()
