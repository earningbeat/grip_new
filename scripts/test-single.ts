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

async function testSingle() {
    console.log('Key:', FMP_API_KEY);
    const url = `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${FMP_API_KEY}`;
    console.log('URL:', url);
    const res = await fetch(url);
    const data = await res.json();
    console.log('Data:', JSON.stringify(data, null, 2));
}

testSingle();
