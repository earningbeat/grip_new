import config from '@/config.json';

/**
 * 숫자 포맷팅
 */
export function formatNumber(value: number, decimals?: number): string {
    const places = decimals ?? config.output_settings.decimal_places.price;
    return value.toLocaleString('en-US', {
        minimumFractionDigits: places,
        maximumFractionDigits: places
    });
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 시가총액/금액 포맷팅 (축약) - 음수도 지원
 */
export function formatMarketCap(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e12) {
        return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
    } else if (absValue >= 1e9) {
        return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
        return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
    } else if (absValue >= 1e3) {
        return `${sign}$${(absValue / 1e3).toFixed(1)}K`;
    } else {
        return `${sign}$${absValue.toLocaleString()}`;
    }
}

/**
 * 날짜 포맷팅
 */
export function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

/**
 * 상대 시간 포맷팅
 */
export function formatRelativeTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}
