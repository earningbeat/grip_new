import { NextResponse } from 'next/server';
import config from '@/config.json';
import { HIGH_BETA_DEMO_DATA, HIGH_BETA_METADATA } from '@/lib/data/demo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * High-Beta (턴어라운드 후보) 데이터 조회 API
 * 
 * TTM EPS ≤ 0이지만 Forward EPS > 0인 종목
 * 현재 적자지만 미래에 흑자 전환이 예상되는 기업들
 */
export async function GET() {
    try {
        // 데모 모드 체크
        const demoConfig = config.demo_mode as { enabled: boolean; fallback_on_api_error: boolean } | undefined;

        if (demoConfig?.enabled) {
            console.log('[API/high-beta] Demo mode enabled, returning demo data');

            // Forward EPS가 양수인 것만 필터링 후 Forward EPS 기준 정렬
            const filtered = HIGH_BETA_DEMO_DATA
                .filter(stock => stock.fy2Eps > 0) // FY2 EPS가 양수면 턴어라운드 가능성
                .sort((a, b) => {
                    // FY2 EPS 대비 현재 적자폭 비율로 정렬 (개선폭이 큰 순)
                    const aImprovement = a.fy2Eps - a.ttmEps;
                    const bImprovement = b.fy2Eps - b.ttmEps;
                    return bImprovement - aImprovement;
                });

            return NextResponse.json({
                success: true,
                data: filtered,
                metadata: {
                    ...HIGH_BETA_METADATA,
                    timestamp: new Date().toISOString(),
                    isDemo: true
                }
            });
        }

        // TODO: 실제 API 파이프라인 호출

        // Fallback to demo data
        return NextResponse.json({
            success: true,
            data: HIGH_BETA_DEMO_DATA.filter(stock => stock.fy2Eps > 0),
            metadata: {
                ...HIGH_BETA_METADATA,
                timestamp: new Date().toISOString(),
                isDemo: true
            }
        });

    } catch (error) {
        console.error('[API/high-beta] Error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                data: []
            },
            { status: 500 }
        );
    }
}
