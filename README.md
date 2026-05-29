# ProfitPulse

Stock Exit Strategy Calculator for hackathons. Search a company and see **KEEP INVESTING** (green) or **EXIT NOW** (red).

Built for the Anakin Build-a-thon. Uses Node.js as the backend and the Anakin Wire API to scrape data from Yahoo Finance and Screener.

## Stack

- **Backend:** Node.js + Express
- **Data:** [Anakin](https://anakin.io) Wire API + URL scraper (Yahoo Finance, Screener.in)
- **Frontend:** HTML/CSS (black theme, handwriting title)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and add your Anakin API key:

```
ANAKIN_API_KEY=ak-your-key-here
PORT=3000
```

3. Start the server:

```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000)

Without an API key, the app runs in **demo mode** with sample data (try "Reliance", "TCS", or "Adani").

## How it works

1. User searches a company on the home page.
2. Backend uses Anakin **Wire** (pre-built actions when available) and **scrapes** Screener.in and Yahoo Finance.
3. Metrics (P/E, debt, profit growth, etc.) feed a simple score.
4. Score ≥ 55 → **KEEP INVESTING** · otherwise → **EXIT NOW**

## Scripts

| Command     | Description        |
|------------|--------------------|
| `npm start` | Run the server     |
| `npm run dev` | Run with auto-reload |
