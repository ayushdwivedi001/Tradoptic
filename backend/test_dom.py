from playwright.sync_api import sync_playwright
import time

def test_dom_scraping():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()
        print("Navigating to Option Chain...")
        try:
            page.goto("https://www.nseindia.com/option-chain", wait_until="networkidle", timeout=60000)
            time.sleep(5)
            
            # Check for table
            selector = "#optionChainTable-indices tbody tr"
            print(f"Waiting for selector: {selector}")
            page.wait_for_selector(selector, timeout=20000)
            
            rows = page.query_selector_all(selector)
            print(f"Found {len(rows)} rows.")
            
            underlying = page.evaluate("() => document.querySelector('#equity_underlyingVal')?.innerText || document.querySelector('#underlyingValue')?.innerText")
            print(f"Underlying: {underlying}")
            
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    test_dom_scraping()
