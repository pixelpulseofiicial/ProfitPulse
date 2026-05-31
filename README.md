# ProfitPulse

Stock Exit Strategy Calculator for hackathons. Search a company and see **KEEP INVESTING** (green) or **EXIT NOW** (red).

Built for the Anakin Build-a-thon. Uses Node.js as the backend and the Anakin Wire API to scrape data from Yahoo Finance and Screener.

## Stack

- **Backend:** Node.js + Express
- **Data:** [Anakin](https://anakin.io) Wire API + URL scraper (Yahoo Finance, Screener.in)
- **Frontend:** HTML/CSS (black theme, handwriting title)


## How it works

1. User searches a company on the home page.
2. Backend uses Anakin **Wire** (pre-built actions when available) and **scrapes** Screener.in and Yahoo Finance.
3. Metrics (P/E, debt, profit growth, etc.) feed a simple score.
4. Score ≥ 55 → **KEEP INVESTING** · otherwise → **EXIT NOW**

## Live Demonstration
Drive link: https://drive.google.com/drive/folders/1wFVYWX9fNaXHSY6whPCjtff6whpt3Jyn?usp=drive_link

## URL
Try it out on https://profitpulse-production-553d.up.railway.app
