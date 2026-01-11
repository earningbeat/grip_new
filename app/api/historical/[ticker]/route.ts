import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker } = await params;

    if (!FMP_API_KEY) {
        return NextResponse.json({ error: 'FMP API key not configured' }, { status: 500 });
    }

    try {
        // Fetch quarterly income statements (last 8 quarters)
        const incomeRes = await fetch(
            `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=quarter&limit=8&apikey=${FMP_API_KEY}`
        );

        // Fetch quarterly balance sheets (last 8 quarters)
        const balanceRes = await fetch(
            `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=quarter&limit=8&apikey=${FMP_API_KEY}`
        );

        if (!incomeRes.ok || !balanceRes.ok) {
            throw new Error('Failed to fetch historical data from FMP');
        }

        const incomeData = await incomeRes.json();
        const balanceData = await balanceRes.json();

        // Process data into a clean structure for trends
        // We want to map metrics by date/quarter
        const trends = incomeData.map((income: any, index: number) => {
            const balance = balanceData.find((b: any) => b.date === income.date) || {};

            return {
                date: income.date,
                calendarYear: income.calendarYear,
                period: income.period, // Q1, Q2, etc.
                label: `${income.calendarYear.slice(-2)}.${income.period}`,
                revenue: income.revenue,
                eps: income.eps,
                grossMargin: income.grossProfitRatio,
                operatingMargin: income.operatingIncomeRatio,
                netMargin: income.netIncomeRatio,
                cash: balance.cashAndShortTermInvestments || 0,
                fcf: income.operatingIncome - (balance.propertyPlantEquipmentNet || 0), // Simple FCF approx if not available
                // Add more as needed
            };
        }).reverse(); // chronological order

        return NextResponse.json(trends);
    } catch (error) {
        console.error('Historical API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
    }
}
