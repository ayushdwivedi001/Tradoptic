import time
import threading
import json
import logging
from curl_cffi import requests
from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NSEScraper:
    def __init__(self):
        self.nifty_data = []
        self.options_data = {"NIFTY": {"df": [], "underlying_val": 0}}
        self.trading_signals = []
        self.is_fetching = False
        self.last_updated = 0
        
        self.base_headers = {
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
        self.session = requests.Session(impersonate="chrome120")
        self.session.headers.update(self.base_headers)

    def clean_float(self, val):
        if val is None or val == "-": return 0.0
        try:
            if isinstance(val, str):
                return float(val.replace(',', '').strip())
            return float(val)
        except (ValueError, TypeError):
            return 0.0

    def fetch_equity_data(self):
        api_url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050"
        page_url = "https://www.nseindia.com/market-data/live-equity-market"
        
        try:
            headers = self.base_headers.copy()
            headers["Accept"] = "*/*"
            headers["Referer"] = page_url
            headers["X-Requested-With"] = "XMLHttpRequest"

            resp = self.session.get(api_url, headers=headers, timeout=15)
            if resp.status_code != 200 or not resp.json():
                # Equity API is less strict, a simple homepage ping often unsticks it
                self.session.get("https://www.nseindia.com", timeout=10)
                resp = self.session.get(api_url, headers=headers, timeout=15)

            data = resp.json()
            stocks = data.get("data", [])
            
            processed = []
            for stock in stocks:
                if stock.get("symbol") == "NIFTY 50": continue
                processed.append({
                    "Symbol": stock.get("symbol", ""),
                    "LTP": self.clean_float(stock.get("lastPrice")),
                    "% Chg": self.clean_float(stock.get("pChange")),
                    "Volume": self.clean_float(stock.get("totalTradedVolume")),
                    "Value": self.clean_float(stock.get("totalTradedValue")),
                    "Open": self.clean_float(stock.get("open")),
                    "High": self.clean_float(stock.get("dayHigh")),
                    "Low": self.clean_float(stock.get("dayLow"))
                })
            
            if processed:
                self.nifty_data = processed
            return True
        except Exception as e:
            logger.error(f"Equity Request error: {e}")
            return False

    def _ensure_browser(self):
        from playwright.sync_api import Error as PlaywrightError
        try:
            # Check if browser is alive
            if not getattr(self, 'browser', None) or not self.browser.is_connected():
                logger.info("Launching persistent Playwright browser (off-screen)...")
                if getattr(self, 'browser', None):
                    try: self.browser.close()
                    except: pass
                
                self.browser = self.p.chromium.launch(
                    headless=False, 
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--window-position=-2000,-2000"
                    ]
                )
                self.context = self.browser.new_context(
                    user_agent=self.base_headers["User-Agent"],
                    viewport={'width': 1920, 'height': 1080}
                )
                self.page = self.context.new_page()
                self.page.goto("https://www.nseindia.com/option-chain", wait_until="domcontentloaded", timeout=60000)
                return

            # Check if page is alive
            if not getattr(self, 'page', None) or self.page.is_closed():
                logger.info("Page was closed. Recreating page...")
                self.page = self.context.new_page()
                self.page.goto("https://www.nseindia.com/option-chain", wait_until="domcontentloaded", timeout=60000)
                return

            # Check URL
            if "nseindia.com/option-chain" not in self.page.url:
                logger.info("Navigating back to Option Chain page...")
                self.page.goto("https://www.nseindia.com/option-chain", wait_until="domcontentloaded", timeout=60000)
                return

            # Reload if already on the right page
            logger.info("Reloading Option Chain page...")
            self.page.reload(wait_until="domcontentloaded", timeout=60000)

        except PlaywrightError as e:
            logger.error(f"Playwright ensure_browser error: {e}")
            self.browser = None # Force restart next time

    def fetch_option_chain_via_dom(self, symbol="NIFTY"):
        """
        Scrapes option chain data directly from the DOM using Playwright
        to bypass the 'empty JSON' API block. Uses a persistent browser.
        """
        logger.info(f"Scraping Option Chain DOM for {symbol}...")
        from playwright.sync_api import Error as PlaywrightError
        try:
            self._ensure_browser()
            
            if not getattr(self, 'page', None) or self.page.is_closed():
                return False

            # Wait for table
            self.page.wait_for_selector("#optionChainTable-indices tbody tr", timeout=30000)
            time.sleep(2)
            
            # Extract data via JS
            data = self.page.evaluate(
                """ 
                () => {
                    const rows = Array.from(document.querySelectorAll('#optionChainTable-indices tbody tr'));
                    let underlyingVal = 0;
                    const underlyingTextEl = document.querySelector('#equity_underlyingVal');
                    if (underlyingTextEl) {
                        const match = underlyingTextEl.innerText.match(/([\d,]+\.?\d*)/i);
                        if (match) underlyingVal = parseFloat(match[1].replace(/,/g, ''));
                    }

                    const extractedData = [];
                    rows.forEach(row => {
                        const cols = row.querySelectorAll('td');
                        if (cols.length >= 21) {
                            const parseVal = (valStr) => {
                                if (!valStr || valStr.trim() === '-' || valStr.trim() === '') return 0;
                                return parseFloat(valStr.replace(/,/g, ''));
                            };
                            const strike = parseVal(cols[11].innerText);
                            if (strike > 0) {
                                extractedData.push({
                                    "strikePrice": strike,
                                    "CE": { "openInterest": parseVal(cols[1].innerText), "changeinOpenInterest": parseVal(cols[2].innerText) },
                                    "PE": { "openInterest": parseVal(cols[21].innerText), "changeinOpenInterest": parseVal(cols[20].innerText) }
                                });
                            }
                        }
                    });
                    return { underlyingValue: underlyingVal, data: extractedData };
                }
            """
            )

            if not data or not data.get('data'):
                logger.warning("DOM scraping returned empty.")
                return False

            data_list = data['data']
            underlying_val = data['underlyingValue']
            
            if underlying_val == 0:
                logger.warning("DOM scraping found 0 underlying value.")
                return False

            # Sort and filter ATM ± 5
            data_list.sort(key=lambda x: x.get("strikePrice", 0))
            closest_strike = min(data_list, key=lambda x: abs(x.get("strikePrice", 0) - underlying_val)).get("strikePrice")
            atm_index = next((i for i, item in enumerate(data_list) if item.get("strikePrice") == closest_strike), -1)
            
            if atm_index == -1: return False
                
            start_idx = max(0, atm_index - 5)
            end_idx = min(len(data_list), atm_index + 6)
            
            processed = []
            for item in data_list[start_idx:end_idx]:
                ce = item.get("CE", {})
                pe = item.get("PE", {})
                processed.append({
                    "Strike Price": item.get("strikePrice"),
                    "Call OI": ce.get("openInterest", 0),
                    "Call Chg OI": ce.get("changeinOpenInterest", 0),
                    "Put OI": pe.get("openInterest", 0),
                    "Put Chg OI": pe.get("changeinOpenInterest", 0),
                    "Net OI Diff": pe.get("openInterest", 0) - ce.get("openInterest", 0)
                })
                
            if processed:
                self.options_data[symbol] = {
                    "df": processed,
                    "underlying_val": underlying_val
                }
                logger.info(f"Successfully processed option chain data. Underlying: {underlying_val}")
            return True
            
        except PlaywrightError as e:
            logger.error(f"DOM Scraping Playwright error: {e}")
            self.browser = None # Force restart next loop
            return False
        except Exception as e:
            logger.error(f"DOM Scraping Option Chain error: {e}")
            return False

    def calculate_signals(self, symbol="NIFTY"):
        options = self.options_data.get(symbol)
        if not options or not options.get("df"):
            return
            
        df = options["df"]
        underlying_val = options["underlying_val"]
        
        total_ce_oi = sum(row["Call OI"] for row in df)
        total_pe_oi = sum(row["Put OI"] for row in df)
        net_oi_diff = total_pe_oi - total_ce_oi
        
        if net_oi_diff > 1000000:
            signal = "STRONG BUY"
        elif net_oi_diff > 0:
            signal = "BUY"
        elif net_oi_diff < -1000000:
            signal = "STRONG SELL"
        elif net_oi_diff < 0:
            signal = "SELL"
        else:
            signal = "NEUTRAL"
            
        new_signal = {
            "time": time.strftime('%H:%M:%S'),
            "underlying": underlying_val,
            "total_ce_oi": total_ce_oi,
            "total_pe_oi": total_pe_oi,
            "net_oi_diff": net_oi_diff,
            "signal": signal
        }
        
        self.trading_signals.append(new_signal)
        if len(self.trading_signals) > 50:
            self.trading_signals = self.trading_signals[-50:]

    def _loop(self):
        self.is_fetching = True
        with sync_playwright() as p:
            self.p = p
            self.browser = None
            self.context = None
            self.page = None
            
            while self.is_fetching:
                logger.info("Syncing Market Data...")
                self.fetch_equity_data()
                if self.fetch_option_chain_via_dom("NIFTY"):
                    self.calculate_signals("NIFTY")
                self.last_updated = time.time()
                time.sleep(60)
                
            # Cleanup when stopping
            if self.browser:
                try: self.browser.close()
                except: pass

    def start(self):
        if not self.is_fetching:
            thread = threading.Thread(target=self._loop, daemon=True)
            thread.start()
            logger.info("DOM-Scraper started.")
            
    def stop(self):
        self.is_fetching = False

scraper_instance = NSEScraper()
