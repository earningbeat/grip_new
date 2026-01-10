const FMP_API_KEY = 'fWeo0LugXz19B3Da9tP3kwqoxnCFSlVM';
const FMP_STABLE_URL = 'https://financialmodelingprep.com/stable';

async function diag() {
    const listRes = await fetch(`${FMP_STABLE_URL}/stock-list?apikey=${FMP_API_KEY}`);
    const list = await listRes.json();
    const nasdaq = list.filter((s: any) => s.exchangeShortName === 'NASDAQ').slice(0, 5);

    console.log('NASDAQ Samples from stock-list:', nasdaq.map((s: any) => s.symbol));

    const symbols = nasdaq.map((s: any) => s.symbol).join(',');
    const quoteRes = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${FMP_API_KEY}`);
    const quotes = await quoteRes.json();

    console.log('Quotes received:', Array.isArray(quotes) ? quotes.length : 'Not an array');
    if (Array.isArray(quotes) && quotes.length > 0) {
        console.log('Sample Quote:', quotes[0].symbol, 'MCap:', quotes[0].marketCap);
    } else {
        console.log('Response body:', JSON.stringify(quotes));
    }
}
diag();
