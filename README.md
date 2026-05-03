# 📊 Tradoptic — Professional Live Market Terminal

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![Excel](https://img.shields.io/badge/Microsoft-Excel-green?logo=microsoftexcel&logoColor=white)](https://www.microsoft.com/excel)
[![Playwright](https://img.shields.io/badge/Playwright-Automated-orange?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen)]()

**Tradoptic** is a professional-grade, high-concurrency market terminal designed to transform raw NSE India data into actionable institutional-level insights. Built for traders who require a seamless "one-click" experience, it combines real-time data scraping with algorithmic sentiment analysis directly within a polished Microsoft Excel environment.

---

## 🚀 The Four Pillars of Tradoptic

Tradoptic operates across four specialized dynamic sheets, each providing a unique layer of market intelligence:

### 1. 📈 Live Dashboard
The command center. It provides an immediate pulse of the NIFTY 50, automatically calculating and visualizing:
- **Top 5 Gainers & Losers**: Real-time momentum tracking.
- **Dynamic Charts**: Instant visual representation of price change percentages.
- **Market Status**: Live tracking of the last update timestamp.

### 2. 🌡️ Market Heatmap
A high-density visualization of market breadth. It maps the entire NIFTY 50 index into a color-coded grid, allowing you to spot sector-wide trends and capital flows at a single glance.

### 3. 🔍 Options OI Analysis
Deep-dive into the Option Chain with automated ATM (At-The-Money) tracking:
- **Nearest 11 Strikes**: Automatically centers the view on the current spot price.
- **Support & Resistance**: Scans Call/Put Open Interest to identify institutional ceilings and floors.
- **Net OI Difference**: Calculated for every strike to detect directional bias.

### 4. 🤖 Algorithmic Trading Signals
The "Edge." An independent time-series algorithm that tracks institutional positioning over time:
- **10 Lakh Threshold**: Generates **STRONG BUY** or **STRONG SELL** signals based on cumulative Net OI Difference.
- **Historical Logging**: Appends a new data row every X minutes (User-configurable).
- **Trend Visualization**: A professional line graph that plots the "Trend of the Day," helping you spot momentum shifts before they happen.

---

## 📂 Project Structure

```text
Tradoptic/
├── Start_NSE_Terminal.bat   <-- The one-click entry point
├── live_nse_terminal.py      <-- The core daemon & AI signal engine
├── fetch_nse_cookies.py     <-- Session & Security bypass manager
├── update_nse_excel.py      <-- Spreadsheet UI formatter
├── requirements.txt         <-- Dependency manifest
├── .gitignore               <-- Environment safety configuration
└── README.md                <-- Documentation
```

---

## 🛠️ Installation & Setup

Tradoptic is designed for **zero-configuration setup**. Follow these steps to get started:

### Step 1: Clone the Repository
Open your command prompt or terminal and run:
```bash
git clone https://github.com/ayushdwivedi001/Tradoptic.git
cd Tradoptic
```

### Step 2: One-Click Launch
Locate the folder on your desktop and **Double-Click** the following file:
```text
Start_NSE_Terminal.bat
```

### What happens automatically once launched?
The setup script is self-healing and will perform the following actions in the background:
1.  **Virtual Environment**: Creates a localized Python environment (`venv`) to keep your system clean.
2.  **Dependency Injection**: Automatically installs `pandas`, `xlwings`, `playwright`, and other critical libraries via `pip`.
3.  **Browser Setup**: Downloads the necessary Chromium binaries required for secure NSE data fetching.
4.  **Security Bypass**: Launches a visible browser once to establish a secure handshake with NSE, then switches to **Headless Mode** for all subsequent updates.
5.  **Excel Initialization**: Automatically creates and formats the 4-sheet dynamic dashboard.

---

## ⚙️ Requirements
- **Python 3.10+**: Must be installed and added to your System PATH.
- **Microsoft Excel**: Required for the live dashboard visualization.
- **Active Internet Connection**: For real-time data fetching.

---

## 💡 Developer Note
Tradoptic uses a **"Jitter-based Background Daemon"**. It fetches broad market data every minute and runs the Algorithmic Signals on an independent timer (e.g., 15 minutes) with randomized delays. This ensures the system mimics human behavior, significantly increasing the reliability of the connection to NSE servers.

---

### 👨‍💻 Author
**Ayush Dwivedi**  
*Full-Stack Developer & Trading Systems Architect*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ayush-dwivedi29/)

---
*Developed with precision for a seamless trading experience.*