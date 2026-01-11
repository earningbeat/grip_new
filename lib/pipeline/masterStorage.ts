import fs from 'fs';
import path from 'path';

export interface RawStockFinancials {
    symbol: string;
    profile: any;
    quote: any;
    incomeQuarterly: any[];
    incomeAnnual: any[];
    balanceSheetQuarterly: any[];
    cashFlowQuarterly: any[];
    ratiosTtm: any;
    keyMetrics: any;
    lastUpdated: string;
}

const MASTER_DIR = path.join(process.cwd(), 'data', 'master');

export class MasterStorage {
    constructor() {
        if (!fs.existsSync(MASTER_DIR)) {
            fs.mkdirSync(MASTER_DIR, { recursive: true });
        }
    }

    private getFilePath(symbol: string): string {
        // Grouping by first character to avoid thousands of files in one directory if needed,
        // but for 3500 stocks, a flat structure in a sub-folder is also manageable on modern systems.
        // We'll use a simple flat structure first for easier visual debugging.
        return path.join(MASTER_DIR, `${symbol.toUpperCase()}.json`);
    }

    public saveRawData(symbol: string, data: Partial<RawStockFinancials>) {
        const filePath = this.getFilePath(symbol);
        const existing = this.getRawData(symbol) || {};

        const updated: RawStockFinancials = {
            ...existing,
            ...data,
            symbol: symbol.toUpperCase(),
            lastUpdated: new Date().toISOString()
        } as RawStockFinancials;

        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    }

    public getRawData(symbol: string): RawStockFinancials | null {
        const filePath = this.getFilePath(symbol);
        if (!fs.existsSync(filePath)) return null;
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error(`[MasterStorage] Error reading ${symbol}:`, e);
            return null;
        }
    }

    public getAllSymbols(): string[] {
        if (!fs.existsSync(MASTER_DIR)) return [];
        return fs.readdirSync(MASTER_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''));
    }

    public deleteRawData(symbol: string) {
        const filePath = this.getFilePath(symbol);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

export const masterStorage = new MasterStorage();
