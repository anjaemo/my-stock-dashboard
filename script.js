// 🐶 바둑이의 주식 데이터 처리 스크립트
// 업데이트: 2026-02-09 (프록시 다중 시도 전략)

const CONFIG = {
    // 원본 주소 (CORS 에러 가능성 높음, 하지만 가장 빠름)
    summaryURL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAvQcej4ON8V6_bjKeqDwbYP9SQL7gGWf9JPREaA5xzoFK3xrwqb4u1IL6lJYjUz5e0IZ9hGRkCKn/pub?gid=0&single=true&output=csv",
    holdingsURL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAvQcej4ON8V6_bjKeqDwbYP9SQL7gGWf9JPREaA5xzoFK3xrwqb4u1IL6lJYjUz5e0IZ9hGRkCKn/pub?gid=58859590&single=true&output=csv",
    historyURL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAvQcej4ON8V6_bjKeqDwbYP9SQL7gGWf9JPREaA5xzoFK3xrwqb4u1IL6lJYjUz5e0IZ9hGRkCKn/pub?gid=1713255630&single=true&output=csv"
};

// 프록시 목록 (순서대로 시도)
const PROXIES = [
    // 1. AllOrigins (JSONP/Raw 지원, 안정적)
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 2. CorsProxy.io (간편함)
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // 3. Google Apps Script Proxy (이건 예시, 필요하면 추가 가능)
];

// ... (BACKUP_DATA는 그대로 유지) ...
const BACKUP_DATA = {
    summary: `,총 평가금,총 투자금,총 수입액,수익률,일 변화율,일 변화액,국내 1일 변화율,국내 1일 변화액,국외 1일 변화율,국외 1일 변화액,배당금,,,
AJM,"417,509,479","250,683,881","166,825,598",66.55%,1.77%,"7,253,710",2.08%,"3,045,330",1.59%,"4,208,380","24,781,805",,,
AJM jr,"11,627,085","9,600,000","2,027,085",21.12%,2.20%,"250,114",2.14%,"239,050",5.18%,"11,064","155,121",,,
JJG-w-AJM,"34,703,997","60,000,000","-25,296,003",-42.16%,2.92%,"984,995",4.04%,"289,740",2.62%,"695,255","160,166",,,
JJG-w-KKO,"131,696,998","116,658,793","15,038,205",12.89%,2.03%,"2,619,034",-,0,2.03%,"2,619,034","625,326",,,
JJG-w-AJMjr,"103,679,479","91,270,000","12,409,479",13.60%,1.99%,"2,024,274",1.98%,"1,427,150",2.02%,"597,124","394,047",,,
JJG-w-AJM-ISA,"42,868,070","39,757,337","3,110,733",7.82%,1.18%,"498,280",1.18%,"498,280",-,0,0,,,
JJG-w-KKO-ISA,"30,402,105","30,798,208","-396,103",-1.29%,2.60%,"771,620",2.60%,"771,620",-,0,"75,380",1년 예상 배당금,환율,
합계,"772,487,213","598,768,219","173,718,994",29.01%,1.86%,"14,402,027",1.99%,"6,271,170",1.78%,"8,130,857","26,191,846","10,087,616","1,464.0",
달러 합산,"457,519,369",59.22%,,,,,,,,,,,,
원화 합산,"315,052,400",40.78%,,,,,,,,,,,,`,

    holdings: `종목명,Ticker,화폐단위,총 수량,"총 매수금액\n(현지통화)","평균단가\n(현지통화)","현재가\n(현지통화)","수익률\n(%)","평가금액\n(원)",비중(%),"일간 변동율\n(%)","일간 변동액\n(현지통화)","일간 변동액\n(원)","총 매수금액\n(원)","수익액\n(원)",환율,1464.0,
하나금융지주,KRX:086790,KRW,1,"60,491",60491.25,"114,600.00",89.45,"114,600",0.01,0.44,500.00,500,"60,491","54,109",,,
RKLB,NASDAQ:RKLB,USD,96,"3,879",40.41,72.32,78.98,"10,168,863",1.32,9.05,6.00,"8,788","5,681,549","4,487,314",합산,"772,487,213",
TSLA,NASDAQ:TSLA,USD,29,"6,823",235.26,411.11,74.74,"17,454,087",2.26,3.50,13.90,"20,350","9,988,399","7,465,688",달러 합산,"457,519,369",59.22%
ABBV,NYSE:ABBV,USD,52,"6,807",130.91,223.43,70.68,"17,009,280",2.20,2.01,4.41,"6,456","9,965,581","7,043,700",원화 합산,"315,052,400",40.78%
VOO,NYSEARCA:VOO,USD,22,"8,767",398.49,635.24,59.41,"20,459,811",2.65,1.95,12.14,"17,773","12,834,707","7,625,104",,,
현대차2우B,KRX:005387,KRW,1,"156,578",156577.56,"249,500.00",59.35,"249,500",0.03,-2.92,"-7,500.00","-7,500","156,578","92,922",,,
JNJ,NYSE:JNJ,USD,61,"10,064",164.99,239.99,45.46,"21,432,068",2.77,0.93,2.20,"3,221","14,734,062","6,698,006",수익률,,
T_NASDAQ(ETF),KRX:133690,KRW,245,"28,990,860",118330.04,"159,425.00",34.73,"39,059,125",5.06,-1.67,"-2,700.00","-2,700","28,990,860","10,068,265",,,8
MO,NYSE:MO,USD,177,"8,594",48.55,65.40,34.70,"16,946,972",2.19,0.02,0.01,15,"12,581,660","4,365,312",,,
DGRO,NYSEARCA:DGRO,USD,265,"14,980",56.53,73.95,30.82,"28,689,644",3.71,1.78,1.29,"1,889","21,931,224","6,758,419",,,
AAPL,NASDAQ:AAPL,USD,55,"12,094",219.89,278.12,26.48,"22,394,224",2.90,0.80,2.21,"3,235","17,705,570","4,688,654",,,
T_S&P500(ETF),KRX:360750,KRW,2045,"41,117,680",20106.44,"24,750.00",23.09,"50,613,750",6.55,-1.20,-300.00,-300,"41,117,680","9,496,070",,,
SCHD,NYSEARCA:SCHD,USD,538,"13,892",25.82,31.47,21.87,"24,786,781",3.21,1.61,0.50,732,"20,338,345","4,448,436",,,
S_SCHD(ETF),KRX:446720,KRW,2906,"32,061,970",11033.02,"13,275.00",20.32,"38,577,150",4.99,0.30,40.00,40,"32,061,970","6,515,180",,,
NEE,NYSE:NEE,USD,86,"6,414",74.58,89.47,19.97,"11,264,631",1.46,0.29,0.26,381,"9,389,453","1,875,179",,,
O,NYSE:O,USD,370,"19,584",52.93,63.23,19.46,"34,250,428",4.43,-0.21,-0.13,-190,"28,670,307","5,580,121",,,
PLUS50(ETF),KRX:122090 ,KRW,594,"28,925,995",48696.96,"54,320.00",11.55,"32,266,080",4.18,-0.88,-480.00,-480,"28,925,995","3,340,085",,,
K_S&P500(ETF),KRX:379800,KRW,2452,"51,030,120",20811.63,"22,605.00",8.62,"55,427,460",7.18,-1.25,-285.00,-285,"51,030,120","4,397,340",,,
QQQM,NASDAQ:QQQM,USD,268,"63,085",235.39,251.01,6.63,"98,484,281",12.75,2.11,5.18,"7,584","92,357,026","6,127,255",,,
SPYM,NYSEARCA:SPYM,USD,863,"66,006",76.48,81.27,6.26,"102,679,124",13.29,1.96,1.56,"2,284","96,632,869","6,046,255",,,
K_NASDAQ(ETF),KRX:379810,KRW,2299,"52,723,430",22933.20,"23,885.00",4.15,"54,911,615",7.11,-1.63,-395.00,-395,"52,723,430","2,188,185",,,
NVIDIA,NASDAQ:NVDA,USD,31,"5,751",185.53,185.41,-0.07,"8,414,648",1.09,7.92,13.60,"19,910","8,420,169","-5,521",,,
K_AI테크(ETF),KRX:485540,KRW,2306,"32,236,920",13979.58,"13,910.00",-0.50,"32,076,460",4.15,-2.52,-360.00,-360,"32,236,920","-160,460",,,
GOOGLE,GOOGL,USD,34,"11,041",324.74,322.86,-0.58,"16,070,680",2.08,-2.53,-8.39,"-12,283","16,164,170","-93,490",,,
AMD,NASDAQ:AMD,USD,23,"5,098",221.64,208.44,-5.95,"7,018,592",0.91,8.28,15.94,"23,336","7,462,967","-444,375",,,
S_KDQ150(ETF),KRX:450910,KRW,261,"5,172,275",19817.15,"18,160.00",-8.36,"4,739,760",0.61,-3.38,-635.00,-635,"5,172,275","-432,515",,,`,

    history: `일자,총 평가금,총 투자금
25. 12. 10,"696,023,773","537,908,219"
25. 12. 11,"700,051,746","537,908,219"
25. 12. 12,"704,165,835","537,908,219"
25. 12. 13,"702,418,405","537,908,219"
25. 12. 15,"696,685,341","537,908,219"
25. 12. 16,"697,990,581","537,908,219"
25. 12. 17,"700,689,320","537,908,219"
25. 12. 18,"690,472,091","537,908,219"
25. 12. 19,"696,583,683","537,908,219"
25. 12. 20,"698,045,643","536,268,219"
25. 12. 21,"703,210,225","536,268,219"
25. 12. 22,"707,905,022","536,268,219"
25. 12. 23,"707,683,706","536,268,219"
25. 12. 24,"704,261,764","536,268,219"
25. 12. 25,"706,367,243","536,268,219"
25. 12. 26,"696,710,631","536,268,219"
25. 12. 27,"696,200,001","536,268,219"
25. 12. 29,"691,614,983","536,268,219"
25. 12. 30,"695,384,514","536,268,219"
25. 12. 31,"697,033,727","536,268,219"
26. 01. 02,"693,934,671","537,268,219"
26. 01. 03,"694,131,044","537,268,219"
26. 01. 04,"694,131,044","537,268,219"
26. 01. 06,"709,200,413","567,268,219"
26. 01. 07,"713,567,714","568,268,219"
26. 01. 08,"718,712,043","568,268,219"
26. 01. 10,"725,600,238","568,268,219"
26. 01. 12,"732,003,152","568,268,219"
26. 01. 13,"738,967,100","568,268,219"
26. 01. 14,"743,867,524","568,268,219"
26. 01. 15,"741,130,938","568,268,219"
26. 01. 16,"751,112,449","578,268,219"
26. 01. 17,"752,966,538","578,268,219"
26. 01. 19,"751,209,773","578,268,219"
26. 01. 20,"753,116,204","578,268,219"
26. 01. 21,"744,639,774","578,268,219"
26. 01. 22,"752,408,376","598,268,219"
26. 01. 23,"758,999,122","598,268,219"
26. 01. 24,"759,024,391","598,268,219"
26. 01. 25,"753,400,040","598,268,219"
26. 01. 26,"746,520,569","598,268,219"
26. 01. 27,"745,553,114","598,268,219"
26. 01. 29,"753,414,478","598,268,219"
26. 01. 30,"756,408,101","598,268,219"
26. 01. 31,"760,167,925","598,268,219"
26. 02. 02,"761,324,006","598,768,219"
26. 02. 03,"767,225,959","598,768,219"
26. 02. 04,"765,738,871","598,768,219"
26. 02. 05,"764,576,030","598,768,219"`
};

// 전역 변수
let globalHoldings = [];
let sortState = { column: 'weight', direction: 'desc' };
let summaryChart = null;
let historyChart = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

// 데이터 가져오기 (Waterfall 전략: 직접 -> 프록시1 -> 프록시2 -> 백업)
async function fetchData() {
    const summaryTable = document.querySelector('#summary-table tbody');
    const holdingsTable = document.querySelector('#holdings-table tbody');
    const lastUpdated = document.getElementById('last-updated');
    
    if (summaryTable) summaryTable.innerHTML = '<tr><td colspan="6" class="loading">데이터 불러오는 중... (연결 시도)</td></tr>';
    
    // 1. Summary
    await fetchWithFallback(CONFIG.summaryURL, 
        (data) => {
            renderSummary(data, summaryTable);
        }, 
        () => {
            const sumResults = Papa.parse(BACKUP_DATA.summary, { header: false });
            renderSummary(sumResults.data, summaryTable);
        }
    );

    // 2. Holdings
    await fetchWithFallback(CONFIG.holdingsURL, 
        (data) => {
            processHoldingsData(data);
            renderHoldingsTable();
        }, 
        () => {
            const holdResults = Papa.parse(BACKUP_DATA.holdings, { header: false });
            processHoldingsData(holdResults.data);
            renderHoldingsTable();
        }
    );

    // 3. History
    await fetchWithFallback(CONFIG.historyURL, 
        (data) => {
            renderHistoryChart(data);
        }, 
        () => {
            const histResults = Papa.parse(BACKUP_DATA.history, { header: false });
            renderHistoryChart(histResults.data);
        }
    );
}

// 재사용 가능한 Fetcher (Direct -> Proxies -> Fail)
// 성공하면 onSuccess(parsedData) 호출하고 true 반환
// 실패하면 onFail() 호출하고 false 반환
async function fetchWithFallback(targetUrl, onSuccess, onFail) {
    const urlsToTry = [
        targetUrl + '&t=' + Date.now(), // Direct
        PROXIES[0](targetUrl + '&t=' + Date.now()), // Proxy 1
        PROXIES[1](targetUrl + '&t=' + Date.now())  // Proxy 2
    ];

    for (let i = 0; i < urlsToTry.length; i++) {
        const url = urlsToTry[i];
        const method = i === 0 ? "Direct" : `Proxy ${i}`;
        
        try {
            console.log(`Trying ${method}: ${url}`);
            
            // Papa.parse의 비동기 래퍼
            const result = await new Promise((resolve, reject) => {
                Papa.parse(url, {
                    download: true,
                    header: false,
                    complete: (res) => resolve(res),
                    error: (err) => reject(err)
                });
            });

            if (result.errors.length === 0 && result.data && result.data.length > 0) {
                console.log(`Success via ${method}`);
                onSuccess(result.data);
                updateTimestamp(true, method);
                return true; // 성공하면 종료
            }
        } catch (e) {
            console.warn(`Failed via ${method}`, e);
        }
    }

    // 모든 시도 실패 시
    console.error("All fetch attempts failed. Using Backup.");
    onFail();
    updateTimestamp(false, "Backup");
    return false;
}

function updateTimestamp(isLive, method) {
    const lastUpdated = document.getElementById('last-updated');
    const now = new Date();
    
    // YYYY-MM-DD HH:MM:SS 포맷팅
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    // 상태 표시: 여러 요청이 동시에 업데이트하므로 "Live"가 하나라도 있으면 Live로 표시하도록 덮어쓰기 로직 필요
    // 여기서는 간단히 마지막 성공한 메서드를 표시
    if (isLive) {
        lastUpdated.innerHTML = `Last Update: ${formattedTime} (Live 🟢 via ${method})`;
        lastUpdated.style.color = "#2e7d32"; // 녹색
    } else {
        // 이미 Live 상태라면 Backup으로 덮어쓰지 않도록 방어 (부분 실패일 수 있음)
        if (!lastUpdated.innerHTML.includes("Live")) {
            lastUpdated.innerHTML = `Last Update: ${formattedTime} (Backup 🟠)`;
            lastUpdated.style.color = "#d84315"; // 주황색
        }
    }
}

// ... (나머지 렌더링 함수들 - formatNumber, getColorClass, renderSummary, processHoldingsData, sortHoldings, updateSortIcons, renderHoldingsTable, renderSummaryChart, renderHistoryChart ... 기존과 동일)

function formatNumber(str) {
    if (!str) return "0";
    return str; 
}

function getColorClass(value) {
    if (!value) return "";
    const cleanVal = value.toString().replace(/,/g, '').replace(/%/g, '');
    const num = parseFloat(cleanVal);
    
    if (isNaN(num)) return "";
    if (num > 0) return "value-up";
    if (num < 0) return "value-down";
    return "";
}

function renderSummary(data, tableElement) {
    if (!tableElement) return;
    tableElement.innerHTML = '';
    
    const chartLabels = [];
    const chartInvest = [];
    const chartEval = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || row[0].trim() === "") continue;

        const name = row[0];
        
        if (name.includes("달러 합산") || name.includes("원화 합산")) continue;

        const tr = document.createElement('tr');
        const isTotalRow = name.includes("합계");

        if (isTotalRow) {
            tr.classList.add("account-total");
        }

        const totalEval = row[1];
        const totalInvest = row[2];
        const totalIncome = row[3];
        const dailyChangeAmt = row[6] || "0";

        let calcReturnRateStr = "0.00%";
        const evalNum = parseFloat(totalEval.replace(/,/g, ''));
        const investNum = parseFloat(totalInvest.replace(/,/g, ''));

        if (investNum !== 0) {
            const rate = ((evalNum / investNum) - 1) * 100;
            calcReturnRateStr = rate.toFixed(2) + "%";
        }

        if (!isTotalRow) {
            chartLabels.push(name);
            chartInvest.push(investNum);
            chartEval.push(evalNum);
        }

        tr.innerHTML = `
            <td>${name}</td>
            <td>${totalEval}</td>
            <td>${totalInvest}</td>
            <td class="${getColorClass(totalIncome)}">${totalIncome}</td>
            <td class="${getColorClass(calcReturnRateStr)}">${calcReturnRateStr}</td>
            <td class="${getColorClass(dailyChangeAmt)}">${dailyChangeAmt}</td>
        `;
        tableElement.appendChild(tr);
    }

    renderSummaryChart(chartLabels, chartInvest, chartEval);
}

function processHoldingsData(data) {
    globalHoldings = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || row[0] === "종목명" || row[0] === "환율") continue;

        const name = row[0];
        const returnRateStr = row[7] || "0";
        const evalKRWStr = row[8] || "0";
        const weightStr = row[9] || "0";
        const dailyChangeStr = row[10] || "0";
        const profitKRWStr = row[14] || "0";

        const weight = parseFloat(weightStr) || 0;
        const returnRate = parseFloat(returnRateStr.replace(/%/g, '')) || 0;
        const evalKRW = parseFloat(evalKRWStr.replace(/,/g, '')) || 0;
        const profitKRW = parseFloat(profitKRWStr.replace(/,/g, '')) || 0;
        const dailyChange = parseFloat(dailyChangeStr.replace(/%/g, '')) || 0;

        if (weight === 0 && evalKRW === 0) continue;

        globalHoldings.push({
            name: name,
            weight: weight,
            returnRate: returnRate,
            eval: evalKRW,
            profit: profitKRW,
            dailyChange: dailyChange,
            display: {
                weight: weightStr,
                returnRate: returnRateStr,
                evalKRW: evalKRWStr,
                profitKRW: profitKRWStr,
                dailyChange: dailyChangeStr
            }
        });
    }
    sortHoldings(sortState.column, false);
}

function sortHoldings(column, toggle = true) {
    if (toggle) {
        if (sortState.column === column) {
            sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.column = column;
            sortState.direction = 'desc';
        }
    }

    globalHoldings.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        return sortState.direction === 'asc' ? valA - valB : valB - valA;
    });

    renderHoldingsTable();
    updateSortIcons();
}

function updateSortIcons() {
    const headers = document.querySelectorAll('#holdings-table th');
    headers.forEach(th => {
        if (th.textContent.includes('↕') || th.textContent.includes('↑') || th.textContent.includes('↓')) {
            let text = th.textContent.replace(' ↑', '').replace(' ↓', '').replace(' ↕', '');
            if (th.getAttribute('onclick') && th.getAttribute('onclick').includes(`'${sortState.column}'`)) {
                text += sortState.direction === 'asc' ? ' ↑' : ' ↓';
                th.style.color = "#333";
            } else {
                text += ' ↕';
                th.style.color = "#999";
            }
            th.textContent = text;
        }
    });
}

function renderHoldingsTable() {
    const tableElement = document.querySelector('#holdings-table tbody');
    if (!tableElement) return;
    tableElement.innerHTML = '';

    globalHoldings.forEach(item => {
        const tr = document.createElement('tr');
        let displayDailyChange = item.display.dailyChange;
        if (!displayDailyChange.includes('%')) {
            displayDailyChange += '%';
        }

        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.display.weight}%</td>
            <td class="${getColorClass(item.display.returnRate)}">${item.display.returnRate}%</td>
            <td class="${getColorClass(item.display.profitKRW)}">${item.display.profitKRW}</td>
            <td>${item.display.evalKRW}</td>
            <td class="${getColorClass(item.display.dailyChange)}">${displayDailyChange}</td>
        `;
        tableElement.appendChild(tr);
    });
}

function renderSummaryChart(labels, investData, evalData) {
    const ctx = document.getElementById('summaryChart').getContext('2d');
    if (summaryChart) summaryChart.destroy();

    summaryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '투자원금',
                    data: investData,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: '평가금액',
                    data: evalData,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => new Intl.NumberFormat('ko-KR', { notation: "compact" }).format(v) }
                }
            }
        }
    });
}

function renderHistoryChart(data) {
    const dates = [];
    const totalEval = [];
    const totalInvest = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const date = row[0];
        const tEval = parseFloat(row[1].replace(/,/g, ''));
        const tInvest = parseFloat(row[2].replace(/,/g, ''));

        dates.push(date);
        totalEval.push(tEval);
        totalInvest.push(tInvest);
    }

    const ctx = document.getElementById('historyChart').getContext('2d');
    if (historyChart) historyChart.destroy();

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '총 평가금',
                    data: totalEval,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: '총 투자금',
                    data: totalInvest,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { title: { display: true, text: '자산 변동 추이' } },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: { callback: v => new Intl.NumberFormat('ko-KR', { notation: "compact" }).format(v) }
                }
            }
        }
    });
}