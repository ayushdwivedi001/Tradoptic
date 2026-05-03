from playwright.sync_api import sync_playwright
import json
import os

def get_nse_cookies():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.goto("https://www.nseindia.com", wait_until="domcontentloaded", timeout=60000)
        
        # Wait a bit for background scripts to set cookies
        page.wait_for_timeout(5000)
        
        cookies = context.cookies()
        
        # Save to file
        save_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "NSE_cookies.json")
        with open(save_path, "w") as f:
            json.dump(cookies, f, indent=4)
            
        print(f"Fetched {len(cookies)} cookies.")
        for c in cookies:
            print(f"{c['name']}: {c['value'][:30]}...")
            
        browser.close()

if __name__ == "__main__":
    get_nse_cookies()
