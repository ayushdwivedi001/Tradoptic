import sys
sys.path.append('C:\\Users\\AYUSH\\Desktop\\NSE_Terminal')
import live_nse_terminal
import xlwings as xw
import os
cookies = live_nse_terminal.get_cookies()
app = xw.App(visible=False)
EXCEL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'NSE_Live_Terminal.xlsx')
wb = app.books.open(EXCEL_FILE)
live_nse_terminal.setup_ui(wb)
oi_df, val = live_nse_terminal.fetch_option_chain(cookies)
if oi_df is not None:
  live_nse_terminal.update_trading_signals(wb, oi_df, val)
wb.save()
wb.close()
app.quit()
print('Done')
