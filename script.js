// 🐶 바둑이의 주식 데이터 처리 스크립트
// 업데이트: 2026-02-08 (History 그래프 추가)

const CONFIG = {
    summaryURL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAvQcej4ON8V6_bjKeqDwbYP9SQL7gGWf9JPREaA5xzoFK3xrwqb4u1IL6lJYjUz5e0IZ9hGRkCKn/pub?gid=0&single=true&output=csv",
    holdingsURL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAvQcej4ON8V6_bjKeqDwbYP9SQL7gGWf9JPREaA5xzoFK3xrwqb4u1IL6lJYjUz5e0IZ9hGRkCKn/pub?gid=58859590&single=true&output=csv",
    historyURL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAvQcej4ON8V6_bjKeqDwbYP9SQL7gGWf9JPREaA5xzoFK3xrwqb4u1IL6lJYjUz5e0IZ9hGRkCKn/pub?gid=1713255630&single=true&output=csv"
};

// ⚠️ 브라우저 보안(CORS) 대비 백업 데이터
const BACKUP_DATA = {
    summary: `,총 평가금,총 투자금,총 수입액,평가/원금,일 변화율,일 변화액,국내 1일 변화율,국내 1일 변화액,국외 1일 변화율,국외 1일 변화액,배당금,,,
AJM,"414,511,777","250,683,881","163,827,896",165.35%,0.62%,"2,573,238",-1.11%,"-1,635,890",1.59%,"4,209,128","24,781,805",,,
AJM jr,"11,388,075","9,600,000","1,788,075",118.63%,-1.42%,"-163,834",-1.54%,"-174,900",5.18%,"11,066","155,121",,,
JJG-w-AJM,"34,419,097","60,000,000","-25,580,903",57.37%,1.87%,"632,018",-0.88%,"-63,360",2.62%,"695,378","160,166",,,
JJG-w-KKO,"131,720,394","116,658,793","15,061,601",112.91%,2.03%,"2,619,499",-,0,2.03%,"2,619,499","625,326",,,
JJG-w-AJMjr,"102,257,678","91,270,000","10,987,678",112.04%,-0.44%,"-448,555",-1.43%,"-1,045,785",2.02%,"597,230","394,047",,,
JJG-w-AJM-ISA,"41,564,860","39,757,337","1,807,523",104.55%,-0.81%,"-340,965",-0.81%,"-340,965",-,0,0,,,
JJG-w-KKO-ISA,"29,630,485","30,798,208","-1,167,723",96.21%,-2.07%,"-626,310",-2.07%,"-626,310",-,0,"75,380",1년 예상 배당금,환율,
합계,"765,492,366","598,768,219","166,724,147",127.84%,0.55%,"4,245,092",-1.26%,"-3,887,210",1.78%,"8,132,302","26,191,846","10,086,718","1,463.8",
달러 합산,"457,456,866",59.76%,,,,,,,,,,,,`,

    holdings: `종목명,Ticker,화폐단위,총 수량,"총 매수금액\n(현지통화)","평균단가\n(현지통화)","현재가\n(현지통화)","수익률\n(%)","평가금액\n(원)",비중(%),"일간 변동율\n(%)","일간 변동액\n(현지통화)","일간 변동액\n(원)","총 매수금액\n(원)","수익액\n(원)",환율,1463.8,
하나금융지주,KRX:086790,KRW,1,"60,491",60491.25,"114,600.00",89.45,"114,600",0.01,0.44,500.00,500,"60,491","54,109",,,
RKLB,NASDAQ:RKLB,USD,96,"3,879",40.41,72.32,78.98,"10,162,754",1.33,9.05,6.00,"8,783","5,678,136","4,484,618",합산,"765,492,366",
TSLA,NASDAQ:TSLA,USD,29,"6,823",235.26,411.11,74.74,"17,451,702",2.28,3.50,13.90,"20,347","9,987,034","7,464,668",달러 합산,"457,456,866",59.76%
ABBV,NYSE:ABBV,USD,52,"6,807",130.91,223.43,70.68,"17,006,955",2.22,2.01,4.41,"6,455","9,964,219","7,042,737",원화 합산,"308,035,500",40.24%
VOO,NYSEARCA:VOO,USD,22,"8,767",398.49,635.24,59.41,"20,457,015",2.67,1.95,12.14,"17,771","12,832,953","7,624,062",,,
현대차2우B,KRX:005387,KRW,1,"156,578",156577.56,"249,500.00",59.35,"249,500",0.03,-2.92,"-7,500.00","-7,500","156,578","92,922",,,
JNJ,NYSE:JNJ,USD,61,"10,064",164.99,239.99,45.46,"21,429,139",2.80,0.93,2.20,"3,220","14,732,049","6,697,090",수익률,,
T_NASDAQ(ETF),KRX:133690,KRW,245,"28,990,860",118330.04,"159,425.00",34.73,"39,059,125",5.10,-1.67,"-2,700.00","-2,700","28,990,860","10,068,265",,,8
MO,NYSE:MO,USD,177,"8,594",48.55,65.40,34.70,"16,944,656",2.21,0.02,0.01,15,"12,579,941","4,364,715",,,
DGRO,NYSEARCA:DGRO,USD,265,"14,980",56.53,73.95,30.82,"28,685,723",3.75,1.78,1.29,"1,888","21,928,227","6,757,495",,,
AAPL,NASDAQ:AAPL,USD,55,"12,094",219.89,278.12,26.48,"22,391,163",2.93,0.80,2.21,"3,235","17,703,150","4,688,013",,,
T_S&P500(ETF),KRX:360750,KRW,2045,"41,117,680",20106.44,"24,750.00",23.09,"50,613,750",6.61,-1.20,-300.00,-300,"41,117,680","9,496,070",,,
SCHD,NYSEARCA:SCHD,USD,538,"13,892",25.82,31.47,21.87,"24,783,393",3.24,1.61,0.50,732,"20,335,565","4,447,828",,,
S_SCHD(ETF),KRX:446720,KRW,2906,"32,061,970",11033.02,"13,275.00",20.32,"38,577,150",5.04,0.30,40.00,40,"32,061,970","6,515,180",,,
NEE,NYSE:NEE,USD,86,"6,414",74.58,89.47,19.97,"11,263,092",1.47,0.29,0.26,381,"9,388,169","1,874,923",,,
O,NYSE:O,USD,370,"19,584",52.93,63.23,19.46,"34,245,747",4.47,-0.21,-0.13,-190,"28,666,389","5,579,358",,,
PLUS50(ETF),KRX:122090 ,KRW,594,"28,925,995",48696.96,"54,320.00",11.55,"32,266,080",4.22,-0.88,-480.00,-480,"28,925,995","3,340,085",,,
K_S&P500(ETF),KRX:379800,KRW,2452,"51,030,120",20811.63,"22,605.00",8.62,"55,427,460",7.24,-1.25,-285.00,-285,"51,030,120","4,397,340",,,
QQQM,NASDAQ:QQQM,USD,268,"63,085",235.39,251.01,6.63,"98,470,821",12.86,2.11,5.18,"7,582","92,344,403","6,126,418",,,
SPYM,NYSEARCA:SPYM,USD,863,"66,006",76.48,81.27,6.26,"102,665,091",13.41,1.96,1.56,"2,284","96,619,662","6,045,429",,,
K_NASDAQ(ETF),KRX:379810,KRW,2299,"52,723,430",22933.20,"23,885.00",4.15,"54,911,615",7.17,-1.63,-395.00,-395,"52,723,430","2,188,185",,,
NVIDIA,NASDAQ:NVDA,USD,31,"5,751",185.53,185.41,-0.07,"8,413,498",1.10,7.92,13.60,"19,908","8,419,018","-5,521",,,
K_AI테크(ETF),KRX:485540,KRW,2306,"32,236,920",13979.58,"13,910.00",-0.50,"32,076,460",4.19,-2.52,-360.00,-360,"32,236,920","-160,460",,,
GOOGLE,GOOGL,USD,34,"11,041",324.74,322.86,-0.58,"16,068,484",2.10,-2.53,-8.39,"-12,281","16,161,962","-93,478",,,
AMD,NASDAQ:AMD,USD,23,"5,098",221.64,208.44,-5.95,"7,017,633",0.92,8.28,15.94,"23,333","7,461,947","-444,314",,,
S_KDQ150(ETF),KRX:450910,KRW,261,"5,172,275",19817.15,"18,160.00",-8.36,"4,739,760",0.62,-3.38,-635.00,-635,"5,172,275","-432,515",,,`,

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

async function fetchData() {
    const summaryTable = document.querySelector('#summary-table tbody');
    const holdingsTable = document.querySelector('#holdings-table tbody');
    
    summaryTable.innerHTML = '<tr><td colspan="5" class="loading">데이터 불러오는 중...</td></tr>';
    
    try {
        // 1. Summary Fetch
        Papa.parse(CONFIG.summaryURL, {
            download: true,
            header: false,
            complete: function(results) {
                if (!results.data || results.data.length === 0) throw new Error("Empty data");
                renderSummary(results.data, summaryTable);
                loadHoldings(holdingsTable, false);
                loadHistory(false);
            },
            error: function() { useBackupData(summaryTable, holdingsTable); }
        });
    } catch (e) { useBackupData(summaryTable, holdingsTable); }
}

function loadHoldings(holdingsTable, useBackup) {
    if (useBackup) return;
    
    Papa.parse(CONFIG.holdingsURL, {
        download: true,
        header: false,
        complete: function(results) {
            processHoldingsData(results.data);
            renderHoldingsTable();
        },
        error: function() {
            processHoldingsData(Papa.parse(BACKUP_DATA.holdings, { header: false }).data);
            renderHoldingsTable();
        }
    });
}

function loadHistory(useBackup) {
    if (useBackup) return;

    Papa.parse(CONFIG.historyURL, {
        download: true,
        header: false,
        complete: function(results) {
            renderHistoryChart(results.data);
            updateTimestamp(true);
        },
        error: function() {
            renderHistoryChart(Papa.parse(BACKUP_DATA.history, { header: false }).data);
            updateTimestamp(false);
        }
    });
}

function useBackupData(summaryTable, holdingsTable) {
    renderSummary(Papa.parse(BACKUP_DATA.summary, { header: false }).data, summaryTable);
    processHoldingsData(Papa.parse(BACKUP_DATA.holdings, { header: false }).data);
    renderHoldingsTable();
    renderHistoryChart(Papa.parse(BACKUP_DATA.history, { header: false }).data);
    updateTimestamp(false);
}

function updateTimestamp(isLive) {
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
    
    if (isLive) {
        lastUpdated.innerHTML = `Last Update: ${formattedTime} (Live)`;
    } else {
        lastUpdated.innerHTML = `Last Update: ${formattedTime} (Backup)`;
    }
}

// ------------------- Summary Logic -------------------
function renderSummary(data, tableElement) {
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

        if (isTotalRow) tr.classList.add("account-total");

        const totalEval = row[1];
        const totalInvest = row[2];
        const totalIncome = row[3];
        // const returnRate = row[4]; // 기존 데이터(평가/원금 비율) 대신 계산

        // 수익률 직접 계산: (평가금 / 투자금) - 1
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
        `;
        tableElement.appendChild(tr);
    }

    renderSummaryChart(chartLabels, chartInvest, chartEval);
}

// ------------------- Holdings Logic -------------------
function processHoldingsData(data) {
    globalHoldings = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || row[0] === "종목명" || row[0] === "환율") continue;

        const name = row[0];
        const returnRateStr = row[7] || "0";
        const evalKRWStr = row[8] || "0";
        const weightStr = row[9] || "0";
        const profitKRWStr = row[14] || "0";

        const weight = parseFloat(weightStr) || 0;
        const returnRate = parseFloat(returnRateStr.replace(/%/g, '')) || 0;
        const evalKRW = parseFloat(evalKRWStr.replace(/,/g, '')) || 0;
        const profitKRW = parseFloat(profitKRWStr.replace(/,/g, '')) || 0;

        if (weight === 0 && evalKRW === 0) continue;

        globalHoldings.push({
            name: name,
            weight: weight,
            returnRate: returnRate,
            eval: evalKRW,
            profit: profitKRW,
            display: {
                weight: weightStr,
                returnRate: returnRateStr,
                evalKRW: evalKRWStr,
                profitKRW: profitKRWStr
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
    tableElement.innerHTML = '';
    globalHoldings.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.display.weight}%</td>
            <td class="${getColorClass(item.display.returnRate)}">${item.display.returnRate}%</td>
            <td class="${getColorClass(item.display.profitKRW)}">${item.display.profitKRW}</td>
            <td>${item.display.evalKRW}</td>
        `;
        tableElement.appendChild(tr);
    });
}

// ------------------- Charts Logic -------------------
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

    // Row 1부터 시작 (Header 건너뜀)
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
                    borderColor: 'rgba(255, 99, 132, 1)', // 빨강
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: '총 투자금',
                    data: totalInvest,
                    borderColor: 'rgba(54, 162, 235, 1)', // 파랑
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: { display: true, text: '자산 변동 추이' }
            },
            scales: {
                y: {
                    beginAtZero: false, // 금액 변화가 크지 않을 수 있으니 0부터 시작하지 않음
                    ticks: { callback: v => new Intl.NumberFormat('ko-KR', { notation: "compact" }).format(v) }
                }
            }
        }
    });
}

// ------------------- Utils -------------------
function getColorClass(value) {
    if (!value) return "";
    const cleanVal = value.toString().replace(/,/g, '').replace(/%/g, '');
    const num = parseFloat(cleanVal);
    if (isNaN(num)) return "";
    return num > 0 ? "value-up" : (num < 0 ? "value-down" : "");
}