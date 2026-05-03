# Tradoptic — Live Market Terminal

A professional-grade, one-click terminal for live market tracking and algorithmic OI analysis. Designed for seamless execution.

## Features
- **Live Data**: Fetches real-time NIFTY 50 stock data from NSE India.
- **Excel Dashboard**: Automatically builds a live-updating dashboard with Gainers/Losers and Heatmaps.
- **One-Click Setup**: Automatically manages dependencies and virtual environments.

## How to Install
1. **Download**: Clone or download this repository to your computer.
2. **Launch**: Double-click Start_NSE_Terminal.bat.
3. **Wait**: The setup will automatically:
   - Create a Python virtual environment.
   - Install all required libraries (pandas, xlwings, playwright, etc.).
   - Install the necessary browser binaries.
   - Launch the terminal and the Excel file.

## Requirements
- **Python 3.10+**: Ensure Python is installed and added to your system PATH.
- **Microsoft Excel**: Required for the live dashboard visualization.

## Note
The browser will open briefly during startup to bypass NSE security checks. Do not close the black terminal window while you are tracking the market.

---
*Created by Ayush for Dad.*
