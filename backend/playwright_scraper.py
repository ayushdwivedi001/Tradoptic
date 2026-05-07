import time
import json
import logging
from playwright.sync_api import sync_playwright, Error as PlaywrightError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global persistent state
_playwright_instance = None
_browser = None
_context = None
_page = None

def _ensure_browser():
    global _playwright_instance, _browser, _context, _page
    
    if not _playwright_instance:
        _playwright_instance = sync_playwright().start()

    try:
        # Check if browser is alive
        if not _browser or not _browser.is_connected():
            logger.info("Launching persistent Playwright browser (off-screen)...")
            if _browser:
                try: _browser.close()
                except: pass
            
            _browser = _playwright_instance.chromium.launch(
                headless=False, 
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--window-position=-2000,-2000"
                ]
            )
            _context = _browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080}
            )
            _page = _context.new_page()
            _page.goto("https://www.nseindia.com/option-chain", wait_until="domcontentloaded", timeout=60000)
            return

        # Check if page is alive
        if not _page or _page.is_closed():
            logger.info("Page was closed. Recreating page...")
            _page = _context.new_page()
            _page.goto("https://www.nseindia.com/option-chain", wait_until="domcontentloaded", timeout=60000)
            return

        # Check URL
        if "nseindia.com/option-chain" not in _page.url:
            logger.info("Navigating back to Option Chain page...")
            _page.goto("https://www.nseindia.com/option-chain", wait_until="domcontentloaded", timeout=60000)
            return

        # Reload if already on the right page
        logger.info("Reloading Option Chain page...")
        _page.reload(wait_until="domcontentloaded", timeout=60000)

    except PlaywrightError as e:
        logger.error(f"Playwright ensure_browser error: {e}")
        _browser = None # Force restart next time

def scrape_option_chain_dom():
    """
    Uses Playwright to directly scrape the NSE Option Chain page DOM,
    bypassing the blocked API endpoints. Uses a persistent browser.
    """
    global _page
    logger.info("Preparing Playwright to scrape Option Chain DOM...")
    try:
        _ensure_browser()
        
        if not _page or _page.is_closed():
             logger.error("Failed to ensure browser page.")
             return None
        
        # Wait for the main data table to populate
        logger.info("Waiting for data table to render...")
        _page.wait_for_selector("#optionChainTable-indices tbody tr", timeout=30000)
        time.sleep(2) # Give it a moment to fully render
        
        logger.info("Extracting data via JavaScript...")
        data = _page.evaluate("""
            () => {
                const rows = Array.from(document.querySelectorAll('#optionChainTable-indices tbody tr'));
                let underlyingVal = 0;
                
                // Try to find underlying value text
                const underlyingTextEl = document.querySelector('#equity_underlyingVal');
                if (underlyingTextEl) {
                    const match = underlyingTextEl.innerText.match(/([\d,]+\.?\d*)/i);
                    if (match) {
                        underlyingVal = parseFloat(match[1].replace(/,/g, ''));
                    }
                }

                const extractedData = [];
                rows.forEach(row => {
                    const cols = row.querySelectorAll('td');
                    if (cols.length >= 21) {
                        // Extract values, removing commas and handling '-' as 0
                        const parseVal = (valStr) => {
                            if (!valStr || valStr.trim() === '-' || valStr.trim() === '') return 0;
                            return parseFloat(valStr.replace(/,/g, ''));
                        };

                        const ceOI = parseVal(cols[1].innerText);
                        const ceChgOI = parseVal(cols[2].innerText);
                        const strike = parseVal(cols[11].innerText);
                        const peOI = parseVal(cols[21].innerText);
                        const peChgOI = parseVal(cols[20].innerText);

                        if (strike > 0) {
                            extractedData.push({
                                "strikePrice": strike,
                                "CE": { "openInterest": ceOI, "changeinOpenInterest": ceChgOI },
                                "PE": { "openInterest": peOI, "changeinOpenInterest": peChgOI }
                            });
                        }
                    }
                });
                
                return { underlyingValue: underlyingVal, data: extractedData };
            }
        """)
        
        if data and len(data.get('data', [])) > 0:
            logger.info(f"Successfully scraped {len(data['data'])} strikes. Underlying: {data['underlyingValue']}")
            return data
        else:
            logger.warning("Scraping completed but no data rows found in DOM.")
            return None
            
    except PlaywrightError as e:
        logger.error(f"DOM Scraping Playwright error: {e}")
        global _browser
        _browser = None # Force restart next time
        return None
    except Exception as e:
        logger.error(f"DOM Scraping failed: {e}")
        return None

def cleanup():
    """Call this when shutting down the application."""
    global _playwright_instance, _browser
    if _browser:
        try: _browser.close()
        except: pass
    if _playwright_instance:
        try: _playwright_instance.stop()
        except: pass

if __name__ == "__main__":
    try:
        result = scrape_option_chain_dom()
        if result:
            print(f"Underlying Value: {result['underlyingValue']}")
            print(f"Number of Strikes Extracted: {len(result['data'])}")
            if len(result['data']) > 0:
                print("Sample Strike Data:")
                print(json.dumps(result['data'][len(result['data'])//2], indent=2))
    finally:
        cleanup()
