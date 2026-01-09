import config from '@/config.json';

const fmpConfig = config.data_source.providers.fmp;
const BASE_URL = fmpConfig.base_url;
const ENDPOINTS = fmpConfig.endpoints;

interface Quote {
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
    marketCap: number;
    pe: number;
    eps: number;
}

interface IncomeStatement {
    date: string;
    symbol: string;
    reportedCurrency: string;
    calendarYear: string;
    period: string;
    eps: number;
    epsdiluted: number;
}

interface AnalystEstimate {
    symbol: string;
    date: string;
    estimatedEpsAvg: number;
    estimatedEpsHigh: number;
    estimatedEpsLow: number;
    numberAnalystsEstimatedEps: number;
}

interface CompanyProfile {
    symbol: string;
    companyName: string;
    sector: string;
    industry: string;
    mktCap: number;
    isFund: boolean;
    isEtf: boolean;
    isActivelyTrading: boolean;
    country: string;
    exchangeShortName: string;
}

interface SP500Constituent {
    symbol: string;
    name: string;
    sector: string;
    subSector: string;
    headQuarter: string;
    founded: string;
}

/**
 * API 호출 기본 함수
 */
async function fetchFromFMP<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const apiKey = process.env.FMP_API_KEY;

    if (!apiKey) {
        throw new Error('FMP_API_KEY environment variable is not set');
    }

    const searchParams = new URLSearchParams({ ...params, apikey: apiKey });
    const url = `${BASE_URL}${endpoint}?${searchParams.toString()}`;

    const response = await fetch(url, {
        next: { revalidate: config.refresh.cache_ttl_hours * 3600 }
    });

    if (!response.ok) {
        throw new Error(`FMP API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * S&P 500 구성 종목 목록 조회
 */
export async function getSP500Constituents(): Promise<SP500Constituent[]> {
    return fetchFromFMP<SP500Constituent[]>(ENDPOINTS.sp500_constituents);
}

/**
 * 현재 주가 조회 (단일 또는 복수)
 */
export async function getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    const symbolList = symbols.join(',');
    return fetchFromFMP<Quote[]>(`${ENDPOINTS.quote}/${symbolList}`);
}

/**
 * TTM 손익계산서 조회 (TTM EPS 추출용)
 */
export async function getIncomeStatements(symbol: string, limit: number = 4): Promise<IncomeStatement[]> {
    return fetchFromFMP<IncomeStatement[]>(
        `${ENDPOINTS.income_statement}/${symbol}`,
        { limit: limit.toString() }
    );
}

/**
 * 애널리스트 추정치 조회 (FY1, FY2 EPS)
 */
export async function getAnalystEstimates(symbol: string, limit: number = 5): Promise<AnalystEstimate[]> {
    return fetchFromFMP<AnalystEstimate[]>(
        `${ENDPOINTS.analyst_estimates}/${symbol}`,
        { limit: limit.toString() }
    );
}

/**
 * 회사 프로필 조회 (섹터, 시가총액 등)
 */
export async function getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    const profiles = await fetchFromFMP<CompanyProfile[]>(
        `${ENDPOINTS.profile}/${symbol}`
    );
    return profiles.length > 0 ? profiles[0] : null;
}

/**
 * 복수 종목 프로필 일괄 조회 (최대 1000개씩 배치)
 */
export async function getCompanyProfiles(symbols: string[]): Promise<CompanyProfile[]> {
    if (symbols.length === 0) return [];

    const batchSize = 100;
    const results: CompanyProfile[] = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const symbolList = batch.join(',');
        const profiles = await fetchFromFMP<CompanyProfile[]>(
            `${ENDPOINTS.profile}/${symbolList}`
        );
        results.push(...profiles);
    }

    return results;
}

export type { Quote, IncomeStatement, AnalystEstimate, CompanyProfile, SP500Constituent };
