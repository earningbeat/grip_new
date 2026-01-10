import requests
import yfinance as yf
import json
import os
import time

def discover():
    # 1. Get NASDAQ tickers from DumbStockAPI (Fast)
    print("Fetching NASDAQ tickers...")
    try:
        res = requests.get('https://dumbstockapi.com/stock?exchanges=NASDAQ')
        tickers = [item['ticker'] for item in res.json() if len(item['ticker']) <= 5]
        print(f"Found {len(tickers)} potential NASDAQ tickers.")
    except Exception as e:
        print(f"Error: {e}")
        return

    # 2. Bulk fetch Market Caps using yfinance (FAST)
    print("Filtering Market Cap > $100M...")
    final_list = []
    batch_size = 100
    
    for i in range(0, len(tickers), batch_size):
        batch = tickers[i:i+batch_size]
        try:
            # Tickers bulk object
            ts = yf.Tickers(" ".join(batch))
            for sym in batch:
                try:
                    # fast_info is near-instant access to cached/scraped data
                    mc = ts.tickers[sym].fast_info.get('market_cap', 0)
                    if mc >= 100_000_000:
                        final_list.append(sym)
                except:
                    continue
        except Exception as e:
            print(f"Batch {i} failed: {e}")
        
        print(f"   Progress: {min(i+batch_size, len(tickers))}/{len(tickers)}... Targets: {len(final_list)}")
        # Gentle delay
        time.sleep(0.1)

    print(f"Success! Found {len(final_list)} stocks. Saving to data/nasdaq_universe.json")
    os.makedirs('data', exist_ok=True)
    with open('data/nasdaq_universe.json', 'w') as f:
        json.dump(final_list, f)

if __name__ == "__main__":
    discover()
