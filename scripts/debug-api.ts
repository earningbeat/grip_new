import fs from 'fs';
import path from 'path';

// .env.local 파일에서 환경변수 수동 로드
const envPath = path.join(process.cwd(), '.env.local');
let FMP_API_KEY = '';
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/FMP_API_KEY=([^\r\n]+)/);
    if (match) FMP_API_KEY = match[1].trim();
}

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const FMP_BASE_URL_V3 = 'https://financialmodelingprep.com/api/v3';

async function debug() {
    console.log('API Key:', FMP_API_KEY ? 'Present' : 'Missing');

    try {
        console.log('\n--- Testing Stock List ---');
        const listRes = await fetch(`${FMP_BASE_URL}/stock-list?apikey=${FMP_API_KEY}`);
        const fullList = await listRes.json();
        console.log('Total stocks in list:', Array.isArray(fullList) ? fullList.length : 'Not an array');
        if (Array.isArray(fullList) && fullList.length > 0) {
            console.log('Sample stock:', JSON.stringify(fullList[0], null, 2));
        }

        console.log('\n--- Testing Quote (Batch - V3) ---');
        const symbols = ['AAPL', 'MSFT', 'GOOGL'];
        // V3 is often more reliable for batching
        const quoteRes = await fetch(`${FMP_BASE_URL_V3}/quote/${symbols.join(',')}?apikey=${FMP_API_KEY}`);

        if (!quoteRes.ok) {
            const text = await quoteRes.text();
            console.error(`V3 Error: ${quoteRes.status} ${quoteRes.statusText}`, text);
        } else {
            const quotes = await quoteRes.json();
            console.log('V3 Quotes response length:', Array.isArray(quotes) ? quotes.length : 'Not an array');
            if (Array.isArray(quotes) && quotes.length > 0) {
                console.log('V3 Quote Sample:', quotes[0].symbol, quotes[0].marketCap);
            }
        }
    } catch (e) {
        console.error('Debug error:', e);
    }
}

debug();
