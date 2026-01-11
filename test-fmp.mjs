// Quick debug script to test FMP API responses
const apiKey = process.env.FMP_API_KEY;
const ticker = 'AEYE'; // First stock in the screenshot

async function testFMPAPI() {
    const baseUrl = 'https://financialmodelingprep.com/api/v3';

    console.log('=== Testing FMP API for', ticker, '===\n');

    // 1. Balance Sheet
    console.log('1. BALANCE SHEET:');
    const balanceRes = await fetch(`${baseUrl}/balance-sheet-statement?symbol=${ticker}&period=quarter&limit=1&apikey=${apiKey}`);
    const balanceData = await balanceRes.json();
    if (balanceData[0]) {
        console.log('  cashAndCashEquivalents:', balanceData[0].cashAndCashEquivalents);
        console.log('  shortTermInvestments:', balanceData[0].shortTermInvestments);
        console.log('  totalDebt:', balanceData[0].totalDebt);
        console.log('  All keys:', Object.keys(balanceData[0]).join(', '));
    } else {
        console.log('  ERROR:', balanceData);
    }

    // 2. Cash Flow
    console.log('\n2. CASH FLOW (4 quarters):');
    const cfRes = await fetch(`${baseUrl}/cash-flow-statement?symbol=${ticker}&period=quarter&limit=4&apikey=${apiKey}`);
    const cfData = await cfRes.json();
    if (Array.isArray(cfData) && cfData.length > 0) {
        let totalFCF = 0;
        cfData.forEach((q, i) => {
            console.log(`  Q${i + 1} freeCashFlow:`, q.freeCashFlow);
            totalFCF += Number(q.freeCashFlow) || 0;
        });
        console.log('  TTM Total:', totalFCF);
    } else {
        console.log('  ERROR:', cfData);
    }

    // 3. Income Statement (Annual for CAGR)
    console.log('\n3. INCOME STATEMENT (Annual):');
    const incomeRes = await fetch(`${baseUrl}/income-statement?symbol=${ticker}&period=annual&limit=4&apikey=${apiKey}`);
    const incomeData = await incomeRes.json();
    if (Array.isArray(incomeData)) {
        console.log('  Years available:', incomeData.length);
        incomeData.forEach((y, i) => {
            console.log(`  Year ${i}: revenue=${y.revenue}, grossProfit=${y.grossProfit}`);
        });
    } else {
        console.log('  ERROR:', incomeData);
    }
}

testFMPAPI().catch(console.error);
