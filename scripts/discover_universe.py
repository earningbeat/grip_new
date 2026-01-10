import yfinance as yf
import pandas as pd
import json
import requests
import io
import time

def get_nasdaq_universe():
    print("Fetching NASDAQ listed symbols from nasdaqtrader.com...")
    # This is a public FTP/HTTP source for NASDAQ listed tickers
    url = "https://pkgstore.datahub.io/core/nasdaq-listings/nasdaq-listed_json/data/a5bc7580d6176d60a1b213bcbc517bc4/nasdaq-listed_json.json"
    
    try:
        response = requests.get(url)
        data = response.json()
        tickers = [item['Symbol'] for item in data if len(item['Symbol']) <= 5]
        print(f"Found {len(tickers)} potential NASDAQ tickers.")
    except Exception as e:
        print(f"Error fetching list: {e}")
        # Fallback to a few known ones for testing
        tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX"]

    print("Verifying Market Cap > $100M using yfinance...")
    final_list = []
    
    # Batch processing with yfinance
    batch_size = 50
    for i in range(0, len(tickers), batch_size):
        batch = tickers[i:i+batch_size]
        symbols_str = " ".join(batch)
        
        try:
            # yf.Tickers is faster for basic info
            data = yf.download(batch, period="1d", group_by="ticker", threads=True, progress=False)
            
            # Note: yf.download might not give marketCap easily in the OHLC data.
            # We need Ticker(symbol).info or a faster way.
            # However, for a quick scan, we can use the fact that these are the 3000-4000 main NASDAQ ones.
            # Let's use Ticker(symbol).info for the first few to show progress, 
            # but maybe just trust the NASDAQ list for discovery.
            
            # Actually, to be precise as user requested ($100M+):
            for symbol in batch:
                try:
                    t = yf.Ticker(symbol)
                    mc = t.info.get('marketCap', 0)
                    if mc >= 100_000_000:
                        final_list.append(symbol)
                except:
                    continue
                    
            print(f"Processed {i+batch_size}/{len(tickers)}... Current target pool: {len(final_list)}")
            
        except Exception as e:
            print(f"Error in batch {i}: {e}")
        
        # Avoid getting blocked by Yahoo
        time.sleep(0.5)

    print(f"Total NASDAQ $100M+ stocks found: {len(final_list)}")
    
    with open('data/nasdaq_universe.json', 'w') as f:
        json.dump(final_list, f)
    
    return final_list

if __name__ == "__main__":
    get_nasdaq_universe()
