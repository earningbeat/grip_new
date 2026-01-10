import fs from 'fs';
import path from 'path';

const FMP_API_KEY = process.env.FMP_API_KEY || 'fWeo0LugXz19B3Da9tP3kwqoxnCFSlVM';
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const CACHE_PATH = path.join(process.cwd(), 'data', 'grip-cache.json');

// GRIP Score 계산
function calcGripScore(peg: number | null, gapRatio: number | null) {
    let pegScore = 0, gapScore = 0;
    if (peg && peg > 0) pegScore = Math.max(0, Math.min(5, (2.5 - peg) * 2.5));
    if (gapRatio && gapRatio > 0) gapScore = Math.max(0, Math.min(5, (gapRatio - 1) * 10));
    const gripScore = Math.round((pegScore + gapScore) * 10) / 10;
    return { gripScore, pegScore, gapScore };
}

// T-GRIP Score 계산
function calcTGripScore(ttmEps: number, ntmEps: number, runway: number | null): number {
    if (ttmEps >= 0) return 0;
    const delta = ntmEps - ttmEps;
    const impScore = Math.min(7, Math.max(0, delta * 2));
    let safetyScore = 0;
    if (runway && runway >= 8) safetyScore = 2;
    else if (runway && runway >= 4) safetyScore = 1;
    return Math.round((impScore + safetyScore) * 10) / 10;
}

// Concurrency Control
async function mapConcurrent<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 20): Promise<R[]> {
    const results: R[] = [];
    const queue = [...items];

    async function worker() {
        while (queue.length > 0) {
            const item = queue.shift();
            if (item) {
                try {
                    const res = await fn(item);
                    results.push(res);
                } catch (e) { /* ignore */ }
            }
        }
    }

    await Promise.all(Array(Math.min(items.length, concurrency)).fill(null).map(worker));
    return results;
}

async function collectData() {
    console.log('=== NASDAQ Constituent 수집 (Parallel Single Fetch) ===\n');

    try {
        // 1. Constituent List
        console.log('1. NASDAQ 목록 확보 중...');
        const listRes = await fetch(`${FMP_BASE_URL}/nasdaq-constituent?apikey=${FMP_API_KEY}`);
        if (!listRes.ok) throw new Error('API Error');
        const fullList = await listRes.json();
        console.log(`   총 종목 수: ${fullList.length}개`);

        // 2. Filter & Dedupe
        const seen = new Set();
        const candidates = fullList.filter((s: any) => {
            if (seen.has(s.symbol)) return false;
            // Only validate ticker format
            if (/^[A-Z]{1,5}$/.test(s.symbol)) {
                seen.add(s.symbol);
                return true;
            }
            return false;
        }); // 모든 후보 (약 3500개 예상)

        console.log(`   유효 후보: ${candidates.length}개`);

        // 3. Parallel Quote Fetch
        console.log(`2. 개별 Quote 조회 시작 (Concurrency: 50)...`);

        let progress = 0;
        const results = await mapConcurrent(candidates, async (candidate: any) => {
            const symbol = candidate.symbol;

            // Fetch Single Quote
            const res = await fetch(`${FMP_BASE_URL}/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`);
            const data = await res.json();
            const quote = Array.isArray(data) ? data[0] : null;

            if (progress++ % 100 === 0) process.stdout.write(`\r   진행: ${progress}/${candidates.length}`);

            if (!quote) return null;

            // Process
            const price = quote.price || 0;
            const marketCap = quote.marketCap || 0;
            const ttmEps = quote.eps || 0;
            const ntmEps = ttmEps > 0 ? ttmEps * 1.1 : ttmEps + 0.5;

            const ttmPe = ttmEps > 0 ? price / ttmEps : null;
            const forwardPe = ntmEps > 0 ? price / ntmEps : null;
            const gapRatio = ttmEps > 0 ? ntmEps / ttmEps : null;
            const peg = (ttmPe && ttmEps > 0) ? ttmPe / 10 : null;

            const { gripScore, pegScore, gapScore } = calcGripScore(peg, gapRatio);
            const tGripScore = calcTGripScore(ttmEps, ntmEps, null);

            // Filter out tiny cap (< $50M) to save space, but keeping more is fine
            if (marketCap < 50000000) return null;

            return {
                ticker: symbol,
                symbol: symbol,
                name: quote.name || symbol,
                sector: 'Tech/Nasdaq',
                industry: 'Various',
                exchange: 'NASDAQ',
                price,
                marketCap,
                beta: null,
                ttmEps,
                ntmEps,
                ttmPe,
                forwardPe,
                gapRatio,
                peg,
                gripScore,
                pegScore,
                gapScore,
                tGripScore,
                isQuality: ttmEps > 0,
                isTurnaround: ttmEps < 0 && ntmEps > ttmEps,
                isEligible: ttmEps > 0,
                lastUpdated: new Date().toISOString()
            };

        }, 50); // 50 workers

        // Filter nulls
        const validResults = results.filter(r => r !== null);

        // Sort by Market Cap
        validResults.sort((a, b) => b.marketCap - a.marketCap);

        // 4. Save
        const cacheData = {
            lastUpdated: new Date().toISOString(),
            totalCount: validResults.length,
            stocks: validResults
        };

        const dataDir = path.dirname(CACHE_PATH);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData, null, 2));

        console.log(`\n\n=== 완료: ${validResults.length}개 저장됨 ===`);
        console.log(`Quality: ${validResults.filter(r => r.isQuality).length}`);
        console.log(`Turnaround: ${validResults.filter(r => r.isTurnaround).length}`);

    } catch (e) {
        console.error('실패:', e);
        process.exit(1);
    }
}

collectData();
