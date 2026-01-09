import config from '@/config.json';

const BASE_URL = 'https://www.alphavantage.co/query';

export interface AlphaOverview {
    Symbol: string;
    Name: string;
    Sector: string;
    Industry: string;
    MarketCapitalization: string;
    EPS: string;
    DilutedEPSTTM: string;
    PERatio: string;
    TrailingPE: string;
    ForwardPE: string;
    PEGRatio: string;
    FiscalYearEnd: string;
    AnalystTargetPrice: string;
    "52WeekHigh": string;
    "52WeekLow": string;
}

export interface AlphaQuote {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
}

export interface AlphaEarnings {
    symbol: string;
    annualEarnings: {
        fiscalDateEnding: string;
        reportedEPS: string;
    }[];
    quarterlyEarnings: {
        fiscalDateEnding: string;
        reportedDate: string;
        reportedEPS: string;
        estimatedEPS: string;
        surprise: string;
        surprisePercentage: string;
    }[];
}

/**
 * Alpha Vantage API 호출 기본 함수
 */
async function fetchFromAlpha<T>(params: Record<string, string>): Promise<T> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        throw new Error('ALPHA_VANTAGE_API_KEY environment variable is not set');
    }

    const searchParams = new URLSearchParams({ ...params, apikey: apiKey });
    const url = `${BASE_URL}?${searchParams.toString()}`;

    const response = await fetch(url, {
        next: { revalidate: config.refresh.cache_ttl_hours * 3600 }
    });

    if (!response.ok) {
        throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Alpha Vantage returns error messages in the response body
    if (data['Error Message']) {
        throw new Error(`Alpha Vantage Error: ${data['Error Message']}`);
    }

    if (data['Note']) {
        throw new Error(`Alpha Vantage Rate Limit: ${data['Note']}`);
    }

    return data;
}

/**
 * 회사 개요 조회 (TTM EPS, P/E, Forward P/E 포함)
 */
export async function getOverview(symbol: string): Promise<AlphaOverview | null> {
    try {
        const data = await fetchFromAlpha<AlphaOverview>({
            function: 'OVERVIEW',
            symbol
        });

        // Empty response check
        if (!data.Symbol) {
            return null;
        }

        return data;
    } catch (error) {
        console.error(`[AlphaVantage] Error fetching overview for ${symbol}:`, error);
        return null;
    }
}

/**
 * 글로벌 시세 조회 (현재 주가)
 */
export async function getGlobalQuote(symbol: string): Promise<AlphaQuote | null> {
    try {
        const data = await fetchFromAlpha<{ 'Global Quote': AlphaQuote }>({
            function: 'GLOBAL_QUOTE',
            symbol
        });

        return data['Global Quote'] || null;
    } catch (error) {
        console.error(`[AlphaVantage] Error fetching quote for ${symbol}:`, error);
        return null;
    }
}

/**
 * 어닝 데이터 조회 (연간/분기별 EPS)
 */
export async function getEarnings(symbol: string): Promise<AlphaEarnings | null> {
    try {
        const data = await fetchFromAlpha<AlphaEarnings>({
            function: 'EARNINGS',
            symbol
        });

        if (!data.annualEarnings) {
            return null;
        }

        return data;
    } catch (error) {
        console.error(`[AlphaVantage] Error fetching earnings for ${symbol}:`, error);
        return null;
    }
}

/**
 * 회계연도 종료월 파싱
 */
export function parseFiscalYearEnd(fiscalYearEnd: string): number {
    const monthMap: Record<string, number> = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    return monthMap[fiscalYearEnd] || 12;
}

/**
 * 숫자 파싱 (문자열 → 숫자, 안전하게)
 */
export function parseNumber(value: string | undefined): number | null {
    if (!value || value === 'None' || value === '-') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}
