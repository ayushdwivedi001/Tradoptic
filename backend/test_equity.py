from curl_cffi import requests
import json

def test_equity():
    headers = {
        "Accept": "*/*",
        "Referer": "https://www.nseindia.com/market-data/live-equity-market",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    session = requests.Session(impersonate="chrome120")
    session.get("https://www.nseindia.com", timeout=10)
    
    url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050"
    resp = session.get(url, headers=headers, timeout=15)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text[:200]}")

if __name__ == "__main__":
    test_equity()
