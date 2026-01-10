import fs from 'fs';
import path from 'path';
import { StockData } from '@/types';

export function getCachedGRIPData(): { stocks: any[], lastUpdated: string } {
    try {
        const cachePath = path.join(process.cwd(), 'data', 'grip-cache.json');
        if (fs.existsSync(cachePath)) {
            const content = fs.readFileSync(cachePath, 'utf-8');
            const data = JSON.parse(content);
            return {
                stocks: data.stocks || [],
                lastUpdated: data.lastUpdated || ''
            };
        }
    } catch (e) {
        console.error('Error reading GRIP cache:', e);
    }
    return { stocks: [], lastUpdated: '' };
}
