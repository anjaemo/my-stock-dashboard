// 🐶 바둑이의 주식 데이터 처리 스크립트
// 업데이트: 2026-02-10 (최신 데이터 백업 반영)

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

// 종목별 한줄 전망 (AI Generated - 2026.02 기준)
const STOCK_OUTLOOKS = {
    "하나금융지주": "주주환원 확대 기대감 유효, 금리 인하 시기 순이자마진 방어가 관건.",
    "RKLB": "뉴트론 로켓 개발 순항 중, 우주 산업 성장성과 함께 장기적 주가 상승 기대.",
    "TSLA": "전기차 수요 둔화 우려와 로보택시/AI 모멘텀이 공존하는 구간, 변동성 주의.",
    "ABBV": "휴미라 특허 만료 방어 양호, 스카이리치 등 신약 포트폴리오 성장세 견조.",
    "VOO": "미국 시장 전체에 투자하는 가장 확실한 방법, 장기 우상향 믿음 여전.",
    "현대차2우B": "실적 호조 지속 및 높은 배당 수익률 매력, 피크아웃 우려는 상존.",
    "JNJ": "소비자 헬스 분사 후 제약/의료기기 집중, 소송 리스크 완화되며 안정세.",
    "T_NASDAQ(ETF)": "금리 인하 사이클 진입 시 기술주 중심의 나스닥 강세 지속 전망.",
    "MO": "높은 배당 수익률은 매력적이나, 흡연율 감소라는 구조적 리스크는 부담.",
    "DGRO": "배당 성장주 위주 포트폴리오로 하락장에서의 방어력과 장기 성장성 겸비.",
    "AAPL": "서비스 부문 성장과 온디바이스 AI 기대감으로 아이폰 판매 정체 상쇄.",
    "T_S&P500(ETF)": "워렌 버핏이 추천하는 최고의 장기 투자처, 적립식 투자에 최적.",
    "SCHD": "현금 흐름 중시 투자자에게 최고의 선택, 배당 성장 ETF의 대장주.",
    "S_SCHD(ETF)": "한국판 SCHD, 연금 계좌 활용 시 절세 효과와 함께 안정적 배당 기대.",
    "NEE": "신재생 에너지 대장주, 고금리 기조 완화 시 주가 반등 탄력 기대.",
    "O": "월배당 리츠 대장주, 금리 인하 시기 대표적인 수혜주로 꼽힘.",
    "PLUS50(ETF)": "코스피 대표 우량주 분산 투자, 한국 시장의 베타 수익 추구.",
    "K_S&P500(ETF)": "환노출형 S&P500 ETF, 달러 강세 시 환차익까지 기대 가능.",
    "QQQM": "QQQ와 동일한 지수 추종하나 수수료가 저렴해 장기 보유에 더 유리.",
    "SPYM": "S&P 500 추종으로 안정적인 시장 수익률 달성 목표.",
    "K_NASDAQ(ETF)": "나스닥 100 지수 추종, 미국 기술주 성장에 올라타는 효율적 수단.",
    "NVIDIA": "AI 칩 시장 독점적 지위 지속, 실적 서프라이즈 기대감 여전히 유효.",
    "K_AI테크(ETF)": "국내 AI 반도체 및 소프트웨어 생태계 성장에 집중 투자.",
    "GOOGLE": "검색 광고 매출 견조, 제미나이 등 AI 경쟁력 입증 여부가 주가 향방 결정.",
    "AMD": "엔비디아 추격하는 AI 칩 2인자, 데이터센터 점유율 확대 노력 지속.",
    "S_KDQ150(ETF)": "코스닥 대표 150종목 투자, 변동성은 크지만 높은 성장 잠재력 보유."
};

// ⚠️ 브라우저 보안(CORS) 대비 백업 데이터 (2026-02-10 최신화)
const BACKUP_DATA = {
    summary: `,총 평가금,총 투자금,총 수입액,수익률,일 변화율,일 변화액,국내 1일 변화율,국내 1일 변화액,국외 1일 변화율,국외 1일 변화액,배당금,,,
AJM,"417,509,479","250,683,881","166,825,598",66.55%,1.77%,"7,253,710",2.08%,"3,045,330",1.59%,"4,208,380","24,781,805",,,
AJM jr,"11,627,085","9,600,000","2,027,085",21.12%,2.20%,"250,114",2.14%,"239,050",5.18%,"11,064","155,121",,,
JJG-w-AJM,"34,715,217","60,000,000","-25,284,783",-42.14%,2.95%,"996,215",4.20%,"300,960",2.62%,"695,255","160,166",,,
JJG-w-KKO,"131,696,998","116,658,793","15,038,205",12.89%,2.03%,"2,619,034",-,0,2.03%,"2,619,034","625,326",,,
JJG-w-AJMjr,"103,679,479","91,270,000","12,409,479",13.60%,1.99%,"2,024,274",1.98%,"1,427,150",2.02%,"597,124","394,047",,,
JJG-w-AJM-ISA,"42,868,070","39,757,337","3,110,733",7.82%,1.18%,"498,280",1.18%,"498,280",-,0,0,,,
JJG-w-KKO-ISA,"30,402,105","30,798,208","-396,103",-1.29%,2.60%,"771,620",2.60%,"771,620",-,0,"75,380",1년 예상 배당금,환율,
합계,"772,498,433","598,768,219","173,730,214",29.01%,1.87%,"14,413,247",1.99%,"6,282,390",1.78%,"8,130,857","26,191,846","10,087,302","1,463.9",
달러 합산,"457,497,493",59.21%,,,,,,,,,,,,
원화 합산,"315,212,030",40.79%,,,,,,,,,,,,`,

    holdings: `종목명,Ticker,화폐단위,총 수량,"총 매수금액\n(현지통화)","평균단가\n(현지통화)","현재가\n(현지통화)","수익률\n(%)","평가금액\n(원)",비중(%),"일간 변동율\n(%)","일간 변동액\n(현지통화)","일간 변동액\n(원)","총 매수금액\n(원)","수익액\n(원)",환율,1463.9,
RKLB,NASDAQ:RKLB,USD,96,"3,879",40.41,72.32,78.98,"10,163,656",1.32,9.05,6.00,"8,784","5,678,640","4,485,016",,,
AMD,NASDAQ:AMD,USD,23,"5,098",221.64,208.44,-5.95,"7,018,256",0.91,8.28,15.94,"23,335","7,462,610","-444,354",합산,"772,709,523",
NVIDIA,NASDAQ:NVDA,USD,31,"5,751",185.53,185.41,-0.07,"8,414,245",1.09,7.92,13.60,"19,909","8,419,766","-5,521",달러 합산,"457,497,493",59.21%
하나금융지주,KRX:086790,KRW,1,"60,491",60491.25,"120,500.00",99.20,"120,500",0.02,5.15,"5,900.00","5,900","60,491","60,009",원화 합산,"315,212,030",40.79%
PLUS50(ETF),KRX:122090 ,KRW,594,"28,925,995",48696.96,"56,630.00",16.29,"33,638,220",4.35,4.25,"2,310.00","2,310","28,925,995","4,712,225",,,
S_KDQ150(ETF),KRX:450910,KRW,261,"5,172,275",19817.15,"18,805.00",-5.11,"4,908,105",0.64,3.55,645.00,645,"5,172,275","-264,170",,,
TSLA,NASDAQ:TSLA,USD,29,"6,823",235.26,411.11,74.74,"17,453,252",2.26,3.50,13.90,"20,349","9,987,921","7,465,331",변화율,,
K_AI테크(ETF),KRX:485540,KRW,2306,"32,236,920",13979.58,"14,365.00",2.76,"33,125,690",4.29,3.27,455.00,455,"32,236,920","888,770",,,11
K_NASDAQ(ETF),KRX:379810,KRW,2299,"52,723,430",22933.20,"24,420.00",6.48,"56,141,580",7.27,2.24,535.00,535,"52,723,430","3,418,150",,,
T_NASDAQ(ETF),KRX:133690,KRW,245,"28,990,860",118330.04,"162,980.00",37.73,"39,930,100",5.17,2.23,"3,555.00","3,555","28,990,860","10,939,240",,,
QQQM,NASDAQ:QQQM,USD,268,"63,085",235.39,251.01,6.63,"98,479,567",12.74,2.11,5.18,"7,583","92,352,604","6,126,962",,,
ABBV,NYSE:ABBV,USD,52,"6,807",130.91,223.43,70.68,"17,008,466",2.20,2.01,4.41,"6,456","9,965,104","7,043,362",,,
SPYM,NYSEARCA:SPYM,USD,863,"66,006",76.48,81.27,6.26,"102,674,209",13.29,1.96,1.56,"2,284","96,628,243","6,045,966",,,
VOO,NYSEARCA:VOO,USD,22,"8,767",398.49,635.24,59.41,"20,458,832",2.65,1.95,12.14,"17,772","12,834,093","7,624,739",,,
K_S&P500(ETF),KRX:379800,KRW,2452,"51,030,120",20811.63,"23,025.00",10.64,"56,457,300",7.31,1.86,420.00,420,"51,030,120","5,427,180",,,
T_S&P500(ETF),KRX:360750,KRW,2045,"41,117,680",20106.44,"25,195.00",25.31,"51,523,775",6.67,1.80,445.00,445,"41,117,680","10,406,095",,,
DGRO,NYSEARCA:DGRO,USD,265,"14,980",56.53,73.95,30.82,"28,688,270",3.71,1.78,1.29,"1,888","21,930,175","6,758,096",,,
SCHD,NYSEARCA:SCHD,USD,538,"13,892",25.82,31.47,21.87,"24,785,594",3.21,1.61,0.50,732,"20,337,371","4,448,223",,,
S_SCHD(ETF),KRX:446720,KRW,2906,"32,061,970",11033.02,"13,460.00",22.00,"39,114,760",5.06,1.39,185.00,185,"32,061,970","7,052,790",,,
현대차2우B,KRX:005387,KRW,1,"156,578",156577.56,"252,000.00",60.94,"252,000",0.03,1.00,"2,500.00","2,500","156,578","95,422",,,
JNJ,NYSE:JNJ,USD,61,"10,064",164.99,239.99,45.46,"21,431,042",2.77,0.93,2.20,"3,221","14,733,358","6,697,685",,,
AAPL,NASDAQ:AAPL,USD,55,"12,094",219.89,278.12,26.48,"22,393,152",2.90,0.80,2.21,"3,235","17,704,722","4,688,429",,,
NEE,NYSE:NEE,USD,86,"6,414",74.58,89.47,19.97,"11,264,092",1.46,0.29,0.26,381,"9,389,003","1,875,089",,,
MO,NYSE:MO,USD,177,"8,594",48.55,65.40,34.70,"16,946,161",2.19,0.02,0.01,15,"12,581,058","4,365,103",,,
O,NYSE:O,USD,370,"19,584",52.93,63.23,19.46,"34,248,789",4.43,-0.21,-0.13,-190,"28,668,935","5,579,854",,,
GOOGLE,GOOGL,USD,34,"11,041",324.74,322.86,-0.58,"16,069,911",2.08,-2.53,-8.39,"-12,282","16,163,398","-93,487",,,
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
    
    if (summaryTable) summaryTable.innerHTML = '<tr><td colspan="7" class="loading">데이터 불러오는 중... (연결 시도)</td></tr>';
    
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
                return true; 
            }
        } catch (e) {
            console.warn(`Failed via ${method}`, e);
        }
    }

    console.error("All fetch attempts failed. Using Backup.");
    onFail();
    updateTimestamp(false, "Backup");
    return false;
}

function updateTimestamp(isLive, method) {
    const lastUpdated = document.getElementById('last-updated');
    const now = new Date();
    const formattedTime = now.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    if (isLive) {
        lastUpdated.innerHTML = `Last Update: ${formattedTime} (Live 🟢 via ${method})`;
        lastUpdated.style.color = "#2e7d32"; 
    } else {
        if (!lastUpdated.innerHTML.includes("Live")) {
            lastUpdated.innerHTML = `Last Update: ${formattedTime} (Backup 🟠)`;
            lastUpdated.style.color = "#d84315"; 
        }
    }
}

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

// ------------------- Summary Logic -------------------
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
        const dailyChangeStr = row[10] || "0"; 
        const profitKRWStr = row[14] || "0";

        // AI 전망 Lookup
        const outlook = STOCK_OUTLOOKS[name] || "-";

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
            outlook: outlook,
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
            let text = th.textContent.replace(' ↑', '').replace(' ↓', '').replace(' ↓', '');
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
            <td style="font-size: 0.85em; color: #555; text-align: left;">${item.outlook}</td>
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