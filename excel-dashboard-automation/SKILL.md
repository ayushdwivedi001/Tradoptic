---
name: excel-dashboard-automation
description: Workflow for building and styling professional live-updating dashboards in Microsoft Excel using Python (xlwings). Covers sheet setup, UI themes, data validation dropdowns, and robust fallback patterns for unavailable data.
---

# Excel Dashboard Automation with Python

This skill provides patterns for creating "terminal-style" interactive dashboards in Excel, optimized for real-time monitoring and professional aesthetics.

## Workflow

### 1. UI Infrastructure
Automate the creation and coloring of sheets to organize the dashboard.

```python
import xlwings as xw

def setup_ui(wb):
    sheets = ["Dashboard", "Analysis", "Signals"]
    colors = [0xFF0000, 0x00FF00, 0x0000FF] # Blue, Green, Red tabs
    
    for i, name in enumerate(sheets):
        if name not in [s.name for s in wb.sheets]:
            wb.sheets.add(name, after=wb.sheets[-1])
        sheet = wb.sheets[name]
        sheet.api.Tab.Color = colors[i]
        # Professional look: Hide gridlines
        sheet.api.Application.ActiveWindow.DisplayGridlines = False
```

### 2. Theming and Formatting
Apply consistent styles (Light/Dark mode) and high-visibility headers.

- **Backgrounds**: Use `.color = (R, G, B)` for precision.
- **Font Colors**: Invert font color based on background (e.g., white text on dark background).
- **Alignment**: Center data for a "product" feel.

### 3. User Interaction (Dropdowns)
Use Excel Data Validation to let users control the Python script.

```python
def setup_index_selector(sheet):
    # Setup dropdown in cell B2
    dv_formula = "NIFTY,BANKNIFTY,FINNIFTY"
    sheet.range("B2").api.Validation.Delete()
    sheet.range("B2").api.Validation.Add(Type=3, Formula1=dv_formula) # 3 = xlValidateList
    sheet.range("B2").value = "NIFTY"
```

### 4. Robust Fallback (The "Market Closed" Pattern)
Prevent the UI from breaking or appearing "pitch dark" when data fetching fails (e.g., market is closed).

- **Placeholder Data**: If API returns empty, populate the sheet with zeroed DataFrames or clear headers.
- **Status Messages**: Explicitly state "⚠️ DATA UNAVAILABLE" in a prominent cell.
- **Graphic Maintenance**: Ensure charts are linked to ranges that still exist even if data is zeroed, to avoid "missing chart" errors.

### 5. Independent Refresh Cycles
Implement a main loop that handles different sheets at different frequencies.

```python
import time

while True:
    # High-frequency update (e.g., every 1 min)
    df_live = fetch_live_data()
    update_dashboard(wb, df_live)
    
    # Low-frequency update (e.g., every 15 mins)
    if time.time() - last_signal_time > interval * 60:
        update_signals(wb, df_live)
        last_signal_time = time.time()
        
    time.sleep(60) # Jitter can be added here
```

## Pitfalls & Landmines
- **COM Errors**: Ensure the script checks if the Excel file is open (`wb.app.books`).
- **Overwriting User Input**: Be careful not to overwrite the cell where the user makes selections (e.g., the dropdown cell).
- **Z-Order of Charts**: When adding charts via code, they may overlap. Use specific `top` and `left` anchors linked to cell ranges.
