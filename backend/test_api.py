import time
from curl_cffi import requests
import json
import logging

logging.basicConfig(level=logging.INFO)

def test_nse():
    headers = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Host": "www.nseindia.com",
        "Referer": "https://www.nseindia.com/option-chain",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    session = requests.Session(impersonate="chrome120")
    session.headers.update(headers)
    
    print("--- STEP 1: Homepage ---")
    r1 = session.get("https://www.nseindia.com", timeout=15)
    print(f"Status: {r1.status_code}")
    
    time.sleep(2)
    
    print("--- STEP 2: Option Chain Page ---")
    r2 = session.get("https://www.nseindia.com/option-chain", timeout=15)
    print(f"Status: {r2.status_code}")
    
    time.sleep(2)
    
    print("--- STEP 3: API Request ---")
    api_url = "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY"
    r3 = session.get(api_url, timeout=15)
    print(f"Status: {r3.status_code}")
    print(f"Response (first 200 chars): {r3.text[:200]}")
    
    try:
        data = r3.json()
        if "records" in data:
            print(f"SUCCESS! Underlying: {data['records'].get('underlyingValue')}")
        else:
            print(f"FAILED: Keys in JSON: {list(data.keys())}")
    except Exception as e:
        print(f"JSON ERROR: {e}")

if __name__ == "__main__":
    test_nse()
