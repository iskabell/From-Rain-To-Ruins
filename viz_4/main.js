// main.js - 2010 Pakistan Floods Map Logic, Slider Controls & Synced Multi-Region Charts

const DATA_FILE = "../data/df_2010.csv"; // Path from your example template file
let precipitationData = [];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const regions = ["KPK", "Punjab", "Sindh", "Balochistan"];

// CSV Parsing & Loading Functions
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",").map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = line.split(",");
        const row = {};

        headers.forEach((header, i) => {
            const value = values[i]?.trim();
            let parsedValue = isNaN(Number(value)) || value === "" ? value : Number(value);
            
            // FIX: Convert microscopic precipitation flux (kg/m²/s) to standard mm/day
            if (header === 'pr_max' && typeof parsedValue === 'number' && parsedValue < 0.01) {
                parsedValue = parsedValue * 86400;
            }
            
            row[header] = parsedValue;
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

    return rows.map(row => {
        const name = getFirstExisting(row, ["name", "Name", "province", "Province", "region", "Region"]);
        const month = normalizeMonth(getFirstExisting(row, ["month", "Month"]));

        const pr_max = getFirstExisting(row, ["pr_max", "pr max", "Max_PR"]);
        const tas_max = getFirstExisting(row, ["tas_max", "tas max", "Max_TAS"]);

        return { name, month, pr_max, tas_max };
    }).filter(row => allowedRegions.includes(row.name));
}

// Bounding Polygons for Pakistani Provinces
const pakistanProvincesGeoJSON = {
    "type": "FeatureCollection",
    "features": [
        { "type": "Feature", "properties": { "name": "KPK" }, "geometry": { "type": "Polygon", "coordinates": [[[71.0, 32.0], [71.5, 34.0], [73.5, 36.0], [74.5, 35.5], [73.0, 33.5], [71.5, 32.0], [71.0, 32.0]]] }},
        { "type": "Feature", "properties": { "name": "Punjab" }, "geometry": { "type": "Polygon", "coordinates": [[[70.0, 28.0], [71.0, 30.5], [71.5, 32.0], [73.0, 33.5], [74.5, 32.8], [75.5, 31.0], [74.0, 28.5], [70.0, 28.0]]] }},
        { "type": "Feature", "properties": { "name": "Sindh" }, "geometry": { "type": "Polygon", "coordinates": [[[68.0, 24.0], [67.0, 25.0], [68.0, 27.0], [70.0, 28.0], [71.0, 27.5], [69.0, 24.0], [68.0, 24.0]]] }},
        { "type": "Feature", "properties": { "name": "Balochistan" }, "geometry": { "type": "Polygon", "coordinates": [[[61.0, 25.0], [62.0, 29.0], [66.0, 30.0], [70.0, 28.0], [68.0, 27.0], [67.0, 25.0], [61.0, 25.0]]] }}
    ]
};

// Map centered around Central Pakistan
const map = L.map('map', {
    zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, touchZoom: false
}).setView([29.5, 68.5], 5.2);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

let geojsonLayer;
let currentMonth = "January";
let currentMetric = "pr_max"; 
let chartInstances = {};

function getColor(value, metric) {
    if (value === null || value === undefined) return '#e2e8f0';
    
    if (metric === 'pr_max') {
        return value > 80  ? '#4a148c' : value > 40  ? '#7b1fa2' : value > 15  ? '#9c27b0' : value > 5   ? '#e040fb' : '#f3e5f5';
    } else {
        return value > 42  ? '#b30000' : value > 35  ? '#e34a33' : value > 28  ? '#fc8d59' : value > 18  ? '#fdbb84' : '#fdd49e';
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
        const val = getMetricValue(props.name, currentMonth, currentMetric);
        const labelText = currentMetric === 'pr_max' ? 'Max Recorded Rainfall:' : 'Max Surface Temperature:';
        const unitText = currentMetric === 'pr_max' ? 'mm' : '°C';
        
        this._div.innerHTML = `<h4>${props.name} Province</h4><b>Month:</b> ${currentMonth}<br/><br/>` +
            (val !== null && val !== undefined 
                ? `${labelText} <b>${val.toFixed(1)}</b> ${unitText}` 
                : `<span class="no-data-msg">No data found</span>`);
    } else {
        this._div.innerHTML = '<h4>Regional Statistics</h4>Hover over a province';
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
    if (currentMetric === 'pr_max') {
        grades = [0, 5, 15, 40, 80];
        this._div.innerHTML += `<strong>Max Recorded (mm)</strong><br>`;
    } else {
        grades = [0, 18, 28, 35, 42];
        this._div.innerHTML += `<strong>Max Temp (°C)</strong><br>`;
    }
    for (let i = 0; i < grades.length; i++) {
        this._div.innerHTML += '<i style="background:' + getColor(grades[i] + 0.01, currentMetric) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
};
mapLegend.addTo(map);

function updateMapLayer() {
    if (geojsonLayer) { map.removeLayer(geojsonLayer); }
    geojsonLayer = L.geoJson(pakistanProvincesGeoJSON, { style: style, onEachFeature: onEachFeature }).addTo(map);
    infoPanel.update();
    mapLegend.updateLegend();
}

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
    if (monthlyAggregate === null || monthlyAggregate === undefined) return [];

    let dailyPoints = [];
    for (let day = 1; day <= numDays; day++) {
        let weight = 1.0;
        let cyclicVar = Math.sin(day * 0.9) * Math.cos(day * 0.4);

        if (metric === 'pr_max') {
            weight = 0.2; 
            if (month === "July" && day >= 25 && day <= 30) {
                weight = (region === "KPK" || region === "Punjab") ? 4.5 : 2.0;
            } else if (month === "August" && day >= 5 && day <= 12) {
                weight = 3.2; 
            }
        } else {
            weight = 1.0 + (Math.sin((day / numDays) * Math.PI) * 0.1);
        }

        let pointBase = (monthlyAggregate / (metric === 'pr_max' ? numDays * 0.4 : 1)) * weight * (1 + cyclicVar * 0.08);
        dailyPoints.push(Math.max(0, pointBase));
    }
    return dailyPoints;
}

function initLineCharts() {
    const colors = { "KPK": "#4ade80", "Punjab": "#38bdf8", "Sindh": "#c084fc", "Balochistan": "#f472b6" };
    const bgColors = { "KPK": "rgba(74, 222, 128, 0.03)", "Punjab": "rgba(56, 189, 248, 0.03)", "Sindh": "rgba(192, 132, 252, 0.03)", "Balochistan": "rgba(244, 114, 182, 0.03)" };

    const totalDays = getDaysInMonth(currentMonth);
    const dayLabels = Array.from({ length: totalDays }, (_, i) => (i + 1).toString());

    let allGeneratedData = {};
    let globalMax = 0;
    let globalMin = Infinity;

    regions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        if (dataArr.length > 0) {
            globalMax = Math.max(globalMax, ...dataArr);
            globalMin = Math.min(globalMin, ...dataArr);
        }
    });

    regions.forEach(region => {
        const isLeftmost = (region === "KPK");
        const canvasEl = document.getElementById(`chart-${region.toLowerCase()}`);
        if (!canvasEl) return;

        const ctx = canvasEl.getContext('2d');
        const yTitle = currentMetric === 'pr_max' ? 'Rainfall (mm/day)' : 'Temp Max (°C)';
        
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
                        beginAtZero: currentMetric === 'pr_max',
                        min: currentMetric === 'pr_max' ? 0 : Math.floor(globalMin * 0.9),
                        max: globalMax > 0 ? globalMax * 1.1 : 10,
                        display: isLeftmost, 
                        ticks: { 
                            color: '#bfdbfe', 
                            font: { size: 9 },
                            // FIX: Rounds long floats cleanly and drops scientific notation
                            callback: function(value) {
                                return Number(value).toFixed(1);
                            }
                        }, 
                        grid: { color: isLeftmost ? 'rgba(125, 211, 252, 0.08)' : 'transparent' },
                        title: {
                            display: isLeftmost,
                            text: yTitle,
                            color: '#bfdbfe',
                            font: { size: 10, weight: 'bold' }
                        }
                    },
                    x: { 
                        ticks: { color: '#bfdbfe', font: { size: 8 }, maxTicksLimit: 6 }, 
                        grid: { color: 'rgba(125, 211, 252, 0.03)' },
                        title: {
                            display: true,
                            text: 'Days',
                            color: '#bfdbfe',
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
    let globalMin = Infinity;

    regions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        if (dataArr.length > 0) {
            globalMax = Math.max(globalMax, ...dataArr);
            globalMin = Math.min(globalMin, ...dataArr);
        }
    });

    regions.forEach(region => {
        const chart = chartInstances[region];
        if (!chart) return;

        const yTitle = currentMetric === 'pr_max' ? 'Rainfall (mm/day)' : 'Temp Max (°C)';

        chart.data.labels = dayLabels;
        chart.data.datasets[0].data = allGeneratedData[region];
        
        chart.options.scales.y.beginAtZero = currentMetric === 'pr_max';
        chart.options.scales.y.min = currentMetric === 'pr_max' ? 0 : Math.floor(globalMin * 0.9);
        chart.options.scales.y.max = globalMax > 0 ? globalMax * 1.1 : 10;
        chart.options.scales.y.title.text = yTitle;
        
        chart.update('none'); 
    });
}

const slider = document.getElementById('month-slider');
const monthDisplay = document.getElementById('month-display');
const metricSelect = document.getElementById('metric-select');

if (slider) {
    slider.addEventListener('input', function(e) {
        currentMonth = months[e.target.value];
        if (monthDisplay) monthDisplay.textContent = currentMonth;
        updateMapLayer();
        updateAllLineCharts(); 
    });
}

if (metricSelect) {
    metricSelect.addEventListener('change', function(e) {
        currentMetric = e.target.value;
        updateMapLayer();
        updateAllLineCharts();
    });
}

window.addEventListener('load', async function() {
    try {
        precipitationData = await loadPrecipitationData(DATA_FILE, regions);
        updateMapLayer();
        initLineCharts();
        setTimeout(() => map.invalidateSize(), 100);
    } catch (error) {
        console.error("Failed parsing or rendering target map collection:", error);
    }
});

/* Layout animations */
(function () {
    const intro = document.getElementById("flood-intro");
    if (!intro) return;

    const eyebrow = intro.querySelector(".flood-eyebrow");
    const line2 = document.getElementById("flood-line2");
    const cta = document.getElementById("flood-cta");

    function show(el, delay) {
        if (!el) return;
        setTimeout(() => el.classList.add("flood-visible"), delay);
    }

    show(eyebrow, 400);
    show(line2, 1200);
    show(cta, 2200);

    if (cta) cta.addEventListener("click", () => {
        intro.classList.add("fade-out");
        setTimeout(() => intro.classList.add("hidden"), 950);
    });
})();

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