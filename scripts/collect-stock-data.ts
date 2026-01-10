import fs from 'fs';
import path from 'path';

// .env.local 파일에서 환경변수 수동 로드
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split(/\r?\n/)) {
        const parts = line.split('=');
        if (parts[0].trim() === 'FMP_API_KEY') {
            process.env.FMP_API_KEY = parts[1].trim().replace(/^['"]|['"]$/g, '');
        }
    }
}

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const CACHE_PATH = path.join(process.cwd(), 'data', 'grip-cache.json');

console.log('FMP_API_KEY:', FMP_API_KEY ? `${FMP_API_KEY.slice(0, 4)}...` : 'NOT SET');

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

// GRIP Score 계산 (단순화: PEG + GAP)
function calcGripScore(peg: number | null, gapRatio: number | null): number {
    let pegScore = 0, gapScore = 0;
    if (peg && peg > 0) pegScore = Math.max(0, Math.min(5, (2.5 - peg) * 2.5));
    if (gapRatio && gapRatio > 0) gapScore = Math.max(0, Math.min(5, (gapRatio - 1) * 10));
    return Math.round((pegScore + gapScore) * 10) / 10;
}

// T-GRIP Score 계산 (TTM EPS 음수 종목용)
function calcTGripScore(ttmEps: number, ntmEps: number, runway: number | null): number {
    if (ttmEps >= 0) return 0;
    const delta = ntmEps - ttmEps;
    const impScore = Math.min(7, Math.max(0, delta * 2));
    let safetyScore = 0;
    if (runway && runway >= 8) safetyScore = 2;
    else if (runway && runway >= 4) safetyScore = 1;
    return Math.round((impScore + safetyScore) * 10) / 10;
}

async function collectData() {
    if (!FMP_API_KEY) {
        console.error('FMP_API_KEY 필요');
        process.exit(1);
    }

    console.log('=== 시총 상위 3000개 종목 수집 시작 ===\n');

    // 1. 전체 종목 리스트
    console.log('1. 종목 리스트 확보 중...');
    const fullList = await fetchWithRetry(`${FMP_BASE_URL}/stock-list?apikey=${FMP_API_KEY}`);
    if (!Array.isArray(fullList)) {
        console.error('종목 리스트 실패:', fullList);
        return;
    }
    console.log(`   전체 종목: ${fullList.length}개`);

    // 2. 미국 주식만 필터 (1-5자 티커)
    const candidates = fullList.filter((s: any) => /^[A-Z]{1,5}$/.test(s.symbol)).slice(0, 5000);
    console.log(`   후보군: ${candidates.length}개`);

    // 3. 배치 Quote 조회 (시총 확인용)
    console.log('2. 시총 배치 조회 중...');
    const enriched: any[] = [];
    for (let i = 0; i < candidates.length; i += 100) {
        const batch = candidates.slice(i, i + 100).map((s: any) => s.symbol);
        try {
            const quotes = await fetchWithRetry(`${FMP_BASE_URL}/quote?symbol=${batch.join(',')}&apikey=${FMP_API_KEY}`);
            if (Array.isArray(quotes)) enriched.push(...quotes);
        } catch (e) { /* skip */ }
        process.stdout.write(`\r   진행: ${Math.min(i + 100, candidates.length)}/${candidates.length}`);
    }
    console.log(`\n   Quote 확보: ${enriched.length}개`);

    // 4. 시총 상위 3000개 선정
    const topStocks = enriched
        .filter(q => q.marketCap && q.marketCap > 10000000) // $10M+
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, 3000);
    console.log(`\n3. 상위 ${topStocks.length}개 종목 분석 시작...`);

    // 5. 개별 분석
    const results: any[] = [];
    let count = 0;

    for (const stock of topStocks) {
        count++;
        try {
            // Quote 기본 데이터
            const price = stock.price || 0;
            const marketCap = stock.marketCap || 0;
            const ttmEps = stock.eps || 0;

            // NTM EPS 추정 (10% 성장 가정, 실제로는 estimate API 필요)
            const ntmEps = ttmEps > 0 ? ttmEps * 1.1 : ttmEps + 0.5;

            // PE & PEG 계산
            const ttmPe = ttmEps > 0 ? price / ttmEps : null;
            const forwardPe = ntmEps > 0 ? price / ntmEps : null;
            const gapRatio = ttmEps > 0 ? ntmEps / ttmEps : null;
            const peg = (ttmPe && ttmEps > 0) ? ttmPe / (ttmEps * 10) : null;

            // Score 계산
            const gripScore = calcGripScore(peg, gapRatio);
            const tGripScore = calcTGripScore(ttmEps, ntmEps, null);

            results.push({
                ticker: stock.symbol,
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                sector: stock.sector || 'Unknown',
                industry: stock.industry || 'Unknown',
                exchange: stock.exchange || 'Unknown',
                price,
                marketCap,
                beta: stock.beta || null,
                ttmEps,
                ntmEps,
                ttmPe,
                forwardPe,
                gapRatio,
                peg,
                gripScore,
                tGripScore,
                isQuality: ttmEps > 0,
                isTurnaround: ttmEps < 0 && ntmEps > ttmEps,
                isEligible: ttmEps > 0,
                lastUpdated: new Date().toISOString()
            });

            if (count % 100 === 0) {
                process.stdout.write(`\r   분석: ${count}/${topStocks.length}`);
            }
        } catch (e) { /* skip */ }
    }

    // 6. 저장
    const cacheData = {
        lastUpdated: new Date().toISOString(),
        totalCount: results.length,
        stocks: results
    };

    const dataDir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData, null, 2));

    console.log(`\n\n=== 완료: ${results.length}개 종목 저장 ===`);
    console.log(`Quality (TTM EPS > 0): ${results.filter(r => r.isQuality).length}개`);
    console.log(`Turnaround (TTM EPS < 0): ${results.filter(r => r.isTurnaround).length}개`);
}

collectData();
