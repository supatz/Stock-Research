"""Curated US large/mega equity seed list used when FinanceDatabase is unavailable."""

from __future__ import annotations

from typing import Any, Dict, List

# ~70 liquid US large/mega names spanning the 11 sectors.
SEED_EQUITIES: List[Dict[str, Any]] = [
    {"ticker": "AAPL", "company": "Apple", "sectorId": "information-technology", "industry": "Consumer electronics", "exchange": "NASDAQ", "marketCap": 3.4e12},
    {"ticker": "MSFT", "company": "Microsoft", "sectorId": "information-technology", "industry": "Software", "exchange": "NASDAQ", "marketCap": 3.1e12},
    {"ticker": "NVDA", "company": "NVIDIA", "sectorId": "information-technology", "industry": "Semiconductors", "exchange": "NASDAQ", "marketCap": 3.0e12},
    {"ticker": "AVGO", "company": "Broadcom", "sectorId": "information-technology", "industry": "Semiconductors", "exchange": "NASDAQ", "marketCap": 8.2e11},
    {"ticker": "ORCL", "company": "Oracle", "sectorId": "information-technology", "industry": "Software", "exchange": "NYSE", "marketCap": 4.8e11},
    {"ticker": "AMD", "company": "Advanced Micro Devices", "sectorId": "information-technology", "industry": "Semiconductors", "exchange": "NASDAQ", "marketCap": 1.8e11},
    {"ticker": "CRM", "company": "Salesforce", "sectorId": "information-technology", "industry": "Software", "exchange": "NYSE", "marketCap": 2.6e11},
    {"ticker": "ADBE", "company": "Adobe", "sectorId": "information-technology", "industry": "Software", "exchange": "NASDAQ", "marketCap": 2.1e11},
    {"ticker": "CSCO", "company": "Cisco", "sectorId": "information-technology", "industry": "Networking", "exchange": "NASDAQ", "marketCap": 2.2e11},
    {"ticker": "ACN", "company": "Accenture", "sectorId": "information-technology", "industry": "IT services", "exchange": "NYSE", "marketCap": 2.0e11},
    {"ticker": "JPM", "company": "JPMorgan Chase", "sectorId": "financials", "industry": "Banks", "exchange": "NYSE", "marketCap": 6.8e11},
    {"ticker": "V", "company": "Visa", "sectorId": "financials", "industry": "Payments", "exchange": "NYSE", "marketCap": 5.9e11},
    {"ticker": "MA", "company": "Mastercard", "sectorId": "financials", "industry": "Payments", "exchange": "NYSE", "marketCap": 4.7e11},
    {"ticker": "BAC", "company": "Bank of America", "sectorId": "financials", "industry": "Banks", "exchange": "NYSE", "marketCap": 3.1e11},
    {"ticker": "WFC", "company": "Wells Fargo", "sectorId": "financials", "industry": "Banks", "exchange": "NYSE", "marketCap": 2.2e11},
    {"ticker": "GS", "company": "Goldman Sachs", "sectorId": "financials", "industry": "Capital markets", "exchange": "NYSE", "marketCap": 1.6e11},
    {"ticker": "MS", "company": "Morgan Stanley", "sectorId": "financials", "industry": "Capital markets", "exchange": "NYSE", "marketCap": 1.7e11},
    {"ticker": "BLK", "company": "BlackRock", "sectorId": "financials", "industry": "Asset management", "exchange": "NYSE", "marketCap": 1.4e11},
    {"ticker": "LLY", "company": "Eli Lilly", "sectorId": "health-care", "industry": "Pharmaceuticals", "exchange": "NYSE", "marketCap": 7.8e11},
    {"ticker": "UNH", "company": "UnitedHealth", "sectorId": "health-care", "industry": "Managed care", "exchange": "NYSE", "marketCap": 4.6e11},
    {"ticker": "JNJ", "company": "Johnson & Johnson", "sectorId": "health-care", "industry": "Pharmaceuticals", "exchange": "NYSE", "marketCap": 3.9e11},
    {"ticker": "ABBV", "company": "AbbVie", "sectorId": "health-care", "industry": "Pharmaceuticals", "exchange": "NYSE", "marketCap": 3.3e11},
    {"ticker": "MRK", "company": "Merck", "sectorId": "health-care", "industry": "Pharmaceuticals", "exchange": "NYSE", "marketCap": 2.8e11},
    {"ticker": "TMO", "company": "Thermo Fisher", "sectorId": "health-care", "industry": "Life sciences tools", "exchange": "NYSE", "marketCap": 2.1e11},
    {"ticker": "AMZN", "company": "Amazon", "sectorId": "consumer-discretionary", "industry": "Internet retail", "exchange": "NASDAQ", "marketCap": 2.0e12},
    {"ticker": "TSLA", "company": "Tesla", "sectorId": "consumer-discretionary", "industry": "Automobiles", "exchange": "NASDAQ", "marketCap": 6.4e11},
    {"ticker": "HD", "company": "Home Depot", "sectorId": "consumer-discretionary", "industry": "Home improvement", "exchange": "NYSE", "marketCap": 3.7e11},
    {"ticker": "MCD", "company": "McDonald's", "sectorId": "consumer-discretionary", "industry": "Restaurants", "exchange": "NYSE", "marketCap": 2.1e11},
    {"ticker": "NKE", "company": "Nike", "sectorId": "consumer-discretionary", "industry": "Apparel", "exchange": "NYSE", "marketCap": 1.2e11},
    {"ticker": "SBUX", "company": "Starbucks", "sectorId": "consumer-discretionary", "industry": "Restaurants", "exchange": "NASDAQ", "marketCap": 1.1e11},
    {"ticker": "COST", "company": "Costco", "sectorId": "consumer-staples", "industry": "Retail", "exchange": "NASDAQ", "marketCap": 4.1e11},
    {"ticker": "WMT", "company": "Walmart", "sectorId": "consumer-staples", "industry": "Retail", "exchange": "NYSE", "marketCap": 6.7e11},
    {"ticker": "PG", "company": "Procter & Gamble", "sectorId": "consumer-staples", "industry": "Household products", "exchange": "NYSE", "marketCap": 3.8e11},
    {"ticker": "KO", "company": "Coca-Cola", "sectorId": "consumer-staples", "industry": "Beverages", "exchange": "NYSE", "marketCap": 2.9e11},
    {"ticker": "PEP", "company": "PepsiCo", "sectorId": "consumer-staples", "industry": "Beverages", "exchange": "NASDAQ", "marketCap": 2.0e11},
    {"ticker": "PM", "company": "Philip Morris", "sectorId": "consumer-staples", "industry": "Tobacco", "exchange": "NYSE", "marketCap": 1.8e11},
    {"ticker": "CAT", "company": "Caterpillar", "sectorId": "industrials", "industry": "Machinery", "exchange": "NYSE", "marketCap": 2.1e11},
    {"ticker": "GE", "company": "GE Aerospace", "sectorId": "industrials", "industry": "Aerospace", "exchange": "NYSE", "marketCap": 2.3e11},
    {"ticker": "RTX", "company": "RTX", "sectorId": "industrials", "industry": "Aerospace and defense", "exchange": "NYSE", "marketCap": 1.8e11},
    {"ticker": "BA", "company": "Boeing", "sectorId": "industrials", "industry": "Aerospace and defense", "exchange": "NYSE", "marketCap": 1.3e11},
    {"ticker": "HON", "company": "Honeywell", "sectorId": "industrials", "industry": "Conglomerate", "exchange": "NASDAQ", "marketCap": 1.4e11},
    {"ticker": "UNP", "company": "Union Pacific", "sectorId": "industrials", "industry": "Railroads", "exchange": "NYSE", "marketCap": 1.4e11},
    {"ticker": "UPS", "company": "United Parcel Service", "sectorId": "industrials", "industry": "Logistics", "exchange": "NYSE", "marketCap": 1.1e11},
    {"ticker": "XOM", "company": "Exxon Mobil", "sectorId": "energy", "industry": "Integrated oil", "exchange": "NYSE", "marketCap": 4.9e11},
    {"ticker": "CVX", "company": "Chevron", "sectorId": "energy", "industry": "Integrated oil", "exchange": "NYSE", "marketCap": 2.7e11},
    {"ticker": "COP", "company": "ConocoPhillips", "sectorId": "energy", "industry": "Exploration and production", "exchange": "NYSE", "marketCap": 1.3e11},
    {"ticker": "SLB", "company": "Schlumberger", "sectorId": "energy", "industry": "Oilfield services", "exchange": "NYSE", "marketCap": 6.5e10},
    {"ticker": "NEE", "company": "NextEra Energy", "sectorId": "utilities", "industry": "Electric utilities", "exchange": "NYSE", "marketCap": 1.5e11},
    {"ticker": "DUK", "company": "Duke Energy", "sectorId": "utilities", "industry": "Electric utilities", "exchange": "NYSE", "marketCap": 8.5e10},
    {"ticker": "SO", "company": "Southern Company", "sectorId": "utilities", "industry": "Electric utilities", "exchange": "NYSE", "marketCap": 9.0e10},
    {"ticker": "PLD", "company": "Prologis", "sectorId": "real-estate", "industry": "Industrial REITs", "exchange": "NYSE", "marketCap": 1.1e11},
    {"ticker": "AMT", "company": "American Tower", "sectorId": "real-estate", "industry": "Tower REITs", "exchange": "NYSE", "marketCap": 9.2e10},
    {"ticker": "EQIX", "company": "Equinix", "sectorId": "real-estate", "industry": "Data center REITs", "exchange": "NASDAQ", "marketCap": 8.0e10},
    {"ticker": "SPG", "company": "Simon Property Group", "sectorId": "real-estate", "industry": "Retail REITs", "exchange": "NYSE", "marketCap": 5.4e10},
    {"ticker": "LIN", "company": "Linde", "sectorId": "materials", "industry": "Industrial gases", "exchange": "NASDAQ", "marketCap": 2.2e11},
    {"ticker": "APD", "company": "Air Products", "sectorId": "materials", "industry": "Industrial gases", "exchange": "NYSE", "marketCap": 6.8e10},
    {"ticker": "SHW", "company": "Sherwin-Williams", "sectorId": "materials", "industry": "Specialty chemicals", "exchange": "NYSE", "marketCap": 8.5e10},
    {"ticker": "ECL", "company": "Ecolab", "sectorId": "materials", "industry": "Specialty chemicals", "exchange": "NYSE", "marketCap": 6.5e10},
    {"ticker": "GOOGL", "company": "Alphabet", "sectorId": "communication-services", "industry": "Internet content", "exchange": "NASDAQ", "marketCap": 2.1e12},
    {"ticker": "META", "company": "Meta Platforms", "sectorId": "communication-services", "industry": "Interactive media", "exchange": "NASDAQ", "marketCap": 1.5e12},
    {"ticker": "DIS", "company": "Walt Disney", "sectorId": "communication-services", "industry": "Entertainment", "exchange": "NYSE", "marketCap": 1.8e11},
    {"ticker": "NFLX", "company": "Netflix", "sectorId": "communication-services", "industry": "Entertainment", "exchange": "NASDAQ", "marketCap": 3.5e11},
    {"ticker": "CMCSA", "company": "Comcast", "sectorId": "communication-services", "industry": "Cable", "exchange": "NASDAQ", "marketCap": 1.5e11},
    {"ticker": "TMUS", "company": "T-Mobile", "sectorId": "communication-services", "industry": "Wireless", "exchange": "NASDAQ", "marketCap": 2.4e11},
    {"ticker": "INTC", "company": "Intel", "sectorId": "information-technology", "industry": "Semiconductors", "exchange": "NASDAQ", "marketCap": 1.0e11},
    {"ticker": "QCOM", "company": "Qualcomm", "sectorId": "information-technology", "industry": "Semiconductors", "exchange": "NASDAQ", "marketCap": 1.9e11},
    {"ticker": "TXN", "company": "Texas Instruments", "sectorId": "information-technology", "industry": "Semiconductors", "exchange": "NASDAQ", "marketCap": 1.8e11},
    {"ticker": "IBM", "company": "IBM", "sectorId": "information-technology", "industry": "IT services", "exchange": "NYSE", "marketCap": 2.0e11},
    {"ticker": "AMAT", "company": "Applied Materials", "sectorId": "information-technology", "industry": "Semiconductor equipment", "exchange": "NASDAQ", "marketCap": 1.5e11},
    {"ticker": "NOW", "company": "ServiceNow", "sectorId": "information-technology", "industry": "Software", "exchange": "NYSE", "marketCap": 1.7e11},
]


def seed_universe(limit: int | None = None) -> List[Dict[str, Any]]:
    rows = [dict(row) for row in SEED_EQUITIES]
    if limit is not None:
        rows = rows[: max(0, limit)]
    for row in rows:
        row["capTier"] = "mega" if row["marketCap"] >= 200_000_000_000 else "large"
        row["sectorBenchmark"] = {
            "information-technology": "XLK",
            "financials": "XLF",
            "health-care": "XLV",
            "consumer-discretionary": "XLY",
            "consumer-staples": "XLP",
            "industrials": "XLI",
            "energy": "XLE",
            "utilities": "XLU",
            "real-estate": "XLRE",
            "materials": "XLB",
            "communication-services": "XLC",
        }[row["sectorId"]]
        row["active"] = True
        row["source"] = "seed:curated"
    return rows
