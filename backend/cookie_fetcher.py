from playwright.sync_api import sync_playwright
import time
import logging

logger = logging.getLogger(__name__)

def get_nse_session_data():
    """
    Launches a browser to perform the NSE handshake and returns 
    the cookies and user-agent needed for API requests.
    """
    logger.info("Launching browser for NSE handshake...")
    try:
        with sync_playwright() as p:
            # Launch in headful mode to bypass headless detection
            browser = p.chromium.launch(
                headless=False,
                args=["--disable-blink-features=AutomationControlled", "--disable-infobars"]
            )
            
            user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            
            context = browser.new_context(
                user_agent=user_agent,
                viewport={'width': 1920, 'height': 1080},
                extra_http_headers={"Accept-Language": "en-US,en;q=0.9"}
            )
            
            page = context.new_page()
            
            # Step 1: Visit homepage first to build basic session
            logger.info("Step 1: Visiting NSE Homepage...")
            page.goto("https://www.nseindia.com", wait_until="domcontentloaded", timeout=60000)
            time.sleep(2)
            
            # Step 2: Navigate to option chain page
            logger.info("Step 2: Navigating to Option Chain page...")
            page.goto("https://www.nseindia.com/option-chain", wait_until="domcontentloaded", timeout=60000)
            
            # Critical wait for NSE's anti-bot JS to finish and table to start loading
            time.sleep(5)
            
            # Extract cookies
            cookies = context.cookies()
            cookie_dict = {c['name']: c['value'] for c in cookies}
            
            browser.close()
            
            logger.info(f"Handshake successful. Captured {len(cookie_dict)} cookies.")
            return {
                "cookies": cookie_dict,
                "user_agent": user_agent
            }
    except Exception as e:
        logger.error(f"Playwright Handshake Failed: {e}")
        return None
