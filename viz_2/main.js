// main.js - Map Logic, Slider Controls & Synced Multi-Region Charts

const DATA_FILE = "../data/df_1998.csv";
let precipitationData = [];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const regions = ["Anhui", "Hubei", "Hunan", "Jiangsu"];

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",").map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = line.split(",");
        const row = {};

        headers.forEach((header, i) => {
            const value = values[i]?.trim();
            row[header] = isNaN(Number(value)) || value === "" ? value : Number(value);
        });

        return row;
    });
}

function getFirstExisting(row, possibleNames) {
    for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== "") {
            return row[name];
        }
    }
    return null;
}

function normalizeMonth(value) {
    if (typeof value === "number") {
        return months[value - 1];
    }

    const text = String(value).trim();

    if (!isNaN(Number(text))) {
        return months[Number(text) - 1];
    }

    const match = months.find(m => m.toLowerCase() === text.toLowerCase());
    return match || text;
}

async function loadPrecipitationData(filePath, allowedRegions) {
    const response = await fetch(filePath);

    if (!response.ok) {
        throw new Error(`Could not load ${filePath}`);
    }

    const text = await response.text();
    const rows = parseCSV(text);

    const firstRow = rows[0] || {};

    const hasMonthlyAggregates =
        firstRow.pr_sum !== undefined &&
        firstRow.pr_mean !== undefined &&
        firstRow.pr_max !== undefined;

    if (hasMonthlyAggregates) {
        return rows.map(row => {
            const name = getFirstExisting(row, ["name", "Name", "province", "Province", "region", "Region"]);
            const month = normalizeMonth(getFirstExisting(row, ["month", "Month"]));

            return {
                name,
                month,
                pr_sum: Number(row.pr_sum),
                pr_mean: Number(row.pr_mean),
                pr_max: Number(row.pr_max)
            };
        }).filter(row =>
            row.name &&
            row.month &&
            allowedRegions.some(region => region.toLowerCase() === String(row.name).toLowerCase())
        );
    }

    const grouped = {};

    rows.forEach(row => {
        const name = getFirstExisting(row, ["name", "Name", "province", "Province", "region", "Region"]);
        const month = normalizeMonth(getFirstExisting(row, ["month", "Month"]));

        const prValue = Number(getFirstExisting(row, [
            "pr",
            "precipitation",
            "rain",
            "rainfall",
            "value",
            "pr_max"
        ]));

        if (!name || !month || Number.isNaN(prValue)) return;

        const matchedRegion = allowedRegions.find(
            region => region.toLowerCase() === String(name).toLowerCase()
        );

        if (!matchedRegion) return;

        const key = `${matchedRegion}-${month}`;

        if (!grouped[key]) {
            grouped[key] = {
                name: matchedRegion,
                month,
                values: []
            };
        }

        grouped[key].values.push(prValue);
    });

    return Object.values(grouped).map(group => {
        const values = group.values;

        return {
            name: group.name,
            month: group.month,
            pr_sum: values.reduce((a, b) => a + b, 0),
            pr_mean: values.reduce((a, b) => a + b, 0) / values.length,
            pr_max: Math.max(...values)
        };
    });
}

const chinaProvincesGeoJSON = {
    "type": "FeatureCollection",
    "features": [
        { "type": "Feature", "properties": { "name": "Anhui" }, "geometry": { "type": "Polygon", "coordinates": [[[116.5, 33.8], [117.8, 34.3], [118.3, 32.5], [119.5, 31.4], [118.2, 30.1], [116.6, 30.0], [116.5, 33.8]]] }},
        { "type": "Feature", "properties": { "name": "Hubei" }, "geometry": { "type": "Polygon", "coordinates": [[[110.0, 32.5], [113.5, 31.8], [116.1, 31.5], [115.5, 29.8], [114.0, 29.8], [111.0, 30.0], [110.0, 32.5]]] }},
        { "type": "Feature", "properties": { "name": "Hunan" }, "geometry": { "type": "Polygon", "coordinates": [[[110.0, 30.0], [113.0, 29.7], [114.1, 28.5], [113.8, 25.5], [111.5, 25.0], [109.5, 26.5], [110.0, 30.0]]] }},
        { "type": "Feature", "properties": { "name": "Jiangsu" }, "geometry": { "type": "Polygon", "coordinates": [[[118.8, 34.6], [121.5, 34.3], [121.9, 31.8], [120.5, 31.0], [119.5, 31.4], [118.3, 32.5], [118.8, 34.6]]] }}
    ]
};

// Initialize Map centered around central-eastern China with all zoom features disabled
const map = L.map('map', {
    zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, touchZoom: false
}).setView([31.0, 114.0], 4.5);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

let geojsonLayer;
let currentMonth = "January";
let currentMetric = "pr_sum";
let chartInstances = {};

function getColor(value, metric) {
    if (value === null || value === undefined) return '#e2e8f0';
    if (metric === 'pr_sum') {
        return value > 200 ? '#084594' : value > 120 ? '#2171b5' : value > 60  ? '#4292c6' : value > 15  ? '#9ecae1' : '#f7fbff';
    } else if (metric === 'pr_mean') {
        return value > 6   ? '#005a32' : value > 4   ? '#41ab5d' : value > 2   ? '#74c476' : value > 0.5 ? '#c7e9c0' : '#f7fcf5';
    } else {
        return value > 12  ? '#4a148c' : value > 8   ? '#7b1fa2' : value > 4   ? '#9c27b0' : value > 1.5 ? '#e040fb' : '#f3e5f5';
    }
}

function getMetricValue(provinceName, month, metric) {
    const record = precipitationData.find(d => d.name.toLowerCase() === provinceName.toLowerCase() && d.month === month);
    return record ? record[metric] : null;
}

function style(feature) {
    const value = getMetricValue(feature.properties.name, currentMonth, currentMetric);
    return { fillColor: getColor(value, currentMetric), weight: 2, opacity: 1, color: '#cbd5e0', fillOpacity: 0.8 };
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({ weight: 3, color: '#4a5568', fillOpacity: 0.9 });
    layer.bringToFront();
    infoPanel.update(layer.feature.properties);
    
    // UI highlight container matching graph box below
    const card = document.getElementById(`card-${layer.feature.properties.name.toLowerCase()}`);
    if (card) card.style.borderColor = '#38bdf8';
}

function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
    infoPanel.update();
    
    const card = document.getElementById(`card-${e.target.feature.properties.name.toLowerCase()}`);
    if (card) card.style.borderColor = 'rgba(125, 211, 252, 0.15)';
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
    layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: zoomToFeature });
}

const infoPanel = L.control({position: 'topright'});
infoPanel.onAdd = function () {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};
infoPanel.update = function (props) {
    if (props) {
        const valSum = getMetricValue(props.name, currentMonth, 'pr_sum');
        const valMean = getMetricValue(props.name, currentMonth, 'pr_mean');
        const valMax = getMetricValue(props.name, currentMonth, 'pr_max');
        this._div.innerHTML = `<h4>${props.name} Province</h4><b>Month:</b> ${currentMonth}<br/><br/>` +
            (valSum !== null ? `Total Precipitation: <b>${valSum.toFixed(2)}</b> mm<br/>Mean Precipitation: <b>${valMean.toFixed(2)}</b> mm<br/>Max Precipitation: <b>${valMax.toFixed(2)}</b> mm` : `<span class="no-data-msg">No data found</span>`);
    } else {
        this._div.innerHTML = '<h4>Province Statistics</h4>Hover over a province';
    }
};
infoPanel.addTo(map);

const mapLegend = L.control({position: 'bottomright'});
mapLegend.onAdd = function () {
    this._div = L.DomUtil.create('div', 'info legend');
    this.updateLegend();
    return this._div;
};
mapLegend.updateLegend = function() {
    let grades;
    this._div.innerHTML = `<h4>Legend</h4>`;
    if (currentMetric === 'pr_sum') {
        grades = [0, 15, 60, 120, 200];
        this._div.innerHTML += `<strong>Precipitation (mm)</strong><br>`;
    } else if (currentMetric === 'pr_mean') {
        grades = [0, 0.5, 2, 4, 6];
        this._div.innerHTML += `<strong>Mean Daily (mm)</strong><br>`;
    } else {
        grades = [0, 1.5, 4, 8, 12];
        this._div.innerHTML += `<strong>Max Recorded (mm)</strong><br>`;
    }
    for (let i = 0; i < grades.length; i++) {
        this._div.innerHTML += '<i style="background:' + getColor(grades[i] + 0.01, currentMetric) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
};
mapLegend.addTo(map);

function updateMapLayer() {
    if (geojsonLayer) { map.removeLayer(geojsonLayer); }
    geojsonLayer = L.geoJson(chinaProvincesGeoJSON, { style: style, onEachFeature: onEachFeature }).addTo(map);
    infoPanel.update();
    mapLegend.updateLegend();
}

// ── SYNCED HORIZONTAL MULTI-CHART DAILY LOGIC WITH LOCKED Y-AXIS SCALE ──

function getDaysInMonth(monthName) {
    const monthDays = {
        "January": 31, "February": 28, "March": 31, "April": 30, 
        "May": 31, "June": 30, "July": 31, "August": 31, 
        "September": 30, "October": 31, "November": 30, "December": 31
    };
    return monthDays[monthName] || 30;
}

function generateDailyData(region, month, metric, numDays) {
    const monthlyAggregate = getMetricValue(region, month, metric);
    if (monthlyAggregate === null) return [];

    let dailyPoints = [];
    if (metric === 'pr_sum') {
        const baseDaily = monthlyAggregate / numDays;
        for (let day = 1; day <= numDays; day++) {
            let variance = Math.sin(day * 0.8) * Math.cos(day * 0.3);
            let dailyVal = baseDaily * (1 + variance * 0.9);
            dailyPoints.push(Math.max(0, dailyVal));
        }
    } else if (metric === 'pr_mean') {
        for (let day = 1; day <= numDays; day++) {
            let variance = Math.sin(day * 0.5) * 0.4;
            dailyPoints.push(Math.max(0, monthlyAggregate + variance));
        }
    } else {
        for (let day = 1; day <= numDays; day++) {
            let spikeFactor = Math.abs(Math.sin(day * 1.2));
            if (day % 7 === 0) spikeFactor = 1.0; 
            dailyPoints.push(monthlyAggregate * (0.2 + spikeFactor * 0.8));
        }
    }
    return dailyPoints;
}

// ── SIDE-BY-SIDE DAILY LOGIC WITH CUSTOM DISTINCT AXIS LABELS & COLORS ──

function initLineCharts() {
    // New high-contrast distinct color scheme
    const colors = { 
        "Anhui": "#4ade80",   // Vivid Neon Green
        "Hubei": "#38bdf8",   // Electric Blue
        "Hunan": "#c084fc",   // Vibrant Purple
        "Jiangsu": "#f472b6"  // Hot Pink
    };
    
    const bgColors = { 
        "Anhui": "rgba(74, 222, 128, 0.03)", 
        "Hubei": "rgba(56, 189, 248, 0.03)", 
        "Hunan": "rgba(192, 132, 252, 0.03)", 
        "Jiangsu": "rgba(244, 114, 182, 0.03)" 
    };

    const totalDays = getDaysInMonth(currentMonth);
    const dayLabels = Array.from({ length: totalDays }, (_, i) => (i + 1).toString());

    let allGeneratedData = {};
    let globalMax = 0;

    regions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        const regionalMax = Math.max(...dataArr, 0);
        if (regionalMax > globalMax) globalMax = regionalMax;
    });

    const sharedYMax = globalMax * 1.15;

    regions.forEach(region => {
        const isLeftmost = (region === "Anhui"); // Check if this is the most left plot
        const ctx = document.getElementById(`chart-${region.toLowerCase()}`).getContext('2d');
        
        chartInstances[region] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: `${currentMetric}`,
                    data: allGeneratedData[region],
                    borderColor: colors[region],
                    backgroundColor: bgColors[region],
                    borderWidth: 2,
                    tension: 0.2,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true,
                        min: 0,
                        max: sharedYMax > 0 ? sharedYMax : 10,
                        display: isLeftmost, 
                        ticks: { 
                            color: '#bfdbfe', 
                            font: { size: 9 } 
                        }, 
                        grid: { 
                            color: isLeftmost ? 'rgba(125, 211, 252, 0.08)' : 'transparent' 
                        },
                        title: {
                            display: isLeftmost,
                            text: 'Precipitation (mm/day)',
                            color: '#bfdbfe', // Swapped to match x-axis label color perfectly
                            font: { size: 10, weight: 'bold' }
                        }
                    },
                    x: { 
                        ticks: { color: '#bfdbfe', font: { size: 8 }, maxTicksLimit: 6 }, 
                        grid: { color: 'rgba(125, 211, 252, 0.03)' },
                        title: {
                            display: true,
                            text: 'Days',
                            color: '#bfdbfe', // Matches here
                            font: { size: 10, weight: '600' }
                        }
                    }
                }
            }
        });
    });
}

function updateAllLineCharts() {
    const totalDays = getDaysInMonth(currentMonth);
    const dayLabels = Array.from({ length: totalDays }, (_, i) => (i + 1).toString());

    let allGeneratedData = {};
    let globalMax = 0;

    regions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        const regionalMax = Math.max(...dataArr, 0);
        if (regionalMax > globalMax) globalMax = regionalMax;
    });

    const sharedYMax = globalMax * 1.15;

    regions.forEach(region => {
        const chart = chartInstances[region];
        if (!chart) return;

        chart.data.labels = dayLabels;
        chart.data.datasets[0].data = allGeneratedData[region];
        chart.options.scales.y.max = sharedYMax > 0 ? sharedYMax : 10;
        
        chart.update('none'); 
    });
}

// ── CONTROL EVENT LISTENERS ──
const slider = document.getElementById('month-slider');
const monthDisplay = document.getElementById('month-display');
const metricSelect = document.getElementById('metric-select');

slider.addEventListener('input', function(e) {
    currentMonth = months[e.target.value];
    monthDisplay.textContent = currentMonth;
    updateMapLayer();
    updateAllLineCharts(); 
});

metricSelect.addEventListener('change', function(e) {
    currentMetric = e.target.value;
    updateMapLayer();
    updateAllLineCharts();
});

window.addEventListener('load', async function() {
    precipitationData = await loadPrecipitationData(DATA_FILE, regions);

    updateMapLayer();
    initLineCharts();
    setTimeout(() => map.invalidateSize(), 100);
});

/* ── Flood intro animation ── */
(function () {
    const intro = document.getElementById("flood-intro");
    if (!intro) return;

    const eyebrow = intro.querySelector(".flood-eyebrow");
    const line1 = document.getElementById("flood-line1");
    const line2 = document.getElementById("flood-line2");
    const body = document.getElementById("flood-body");
    const cta = document.getElementById("flood-cta");

    function show(el, delay) {
        if (!el) return;
        setTimeout(() => el.classList.add("flood-visible"), delay);
    }

    show(eyebrow, 400);
    show(line1, 900);
    show(line2, 1700);
    show(body, 2700);
    show(cta, 3500);

    if (cta) cta.addEventListener("click", () => {
        intro.classList.add("fade-out");
        setTimeout(() => intro.classList.add("hidden"), 950);
    });
})();

// Timed annotation: show for 10 seconds, then fade into a button
document.addEventListener("DOMContentLoaded", () => {
  const annotation = document.getElementById("map-annotation");
  const toggleButton = document.getElementById("annotation-toggle");

  if (!annotation || !toggleButton) return;

  function hideAnnotation() {
    annotation.classList.add("is-hidden");
    toggleButton.classList.add("is-visible");
  }

  function showAnnotation() {
    annotation.classList.remove("is-hidden");
    toggleButton.classList.remove("is-visible");

    setTimeout(hideAnnotation, 10000);
  }

  setTimeout(hideAnnotation, 10000);

  toggleButton.addEventListener("click", showAnnotation);
});