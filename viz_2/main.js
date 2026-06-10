// main.js - Map Logic, Slider Controls & Synced Multi-Region Charts (Updated for pr_max & tas_max)

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

    return rows.map(row => {
        const name = getFirstExisting(row, ["name", "Name", "province", "Province", "region", "Region"]);
        const month = normalizeMonth(getFirstExisting(row, ["month", "Month"]));
        
        // Convert pr_max from kg/m^2/s to mm/day
        let rawPr = row.pr_max !== undefined ? Number(row.pr_max) : 0;
        let convertedPr = rawPr * 86400; 

        // Convert tas_max from Kelvin to Celsius
        let rawTas = row.tas_max !== undefined ? Number(row.tas_max) : 273.15;
        let convertedTas = rawTas - 273.15;

        return {
            name,
            month,
            pr_max: convertedPr,
            tas_max: convertedTas
        };
    }).filter(row =>
        row.name &&
        row.month &&
        allowedRegions.some(region => region.toLowerCase() === String(row.name).toLowerCase())
    );
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
let currentMetric = "pr_max";
let chartInstances = {};

function getColor(value, metric) {
    if (value === null || value === undefined) return '#e2e8f0';
    if (metric === 'pr_max') {
        return value > 15 ? '#4a148c' : value > 8 ? '#7b1fa2' : value > 4 ? '#9c27b0' : value > 1 ? '#e040fb' : '#f3e5f5';
    } else {
        return value > 30 ? '#b71c1c' : value > 20 ? '#e65100' : value > 10 ? '#f57c00' : value > 0 ? '#ffb74d' : '#fff3e0';
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
        const valMaxPr = getMetricValue(props.name, currentMonth, 'pr_max');
        const valMaxTas = getMetricValue(props.name, currentMonth, 'tas_max');
        this._div.innerHTML = `<h4>${props.name} Province</h4><b>Month:</b> ${currentMonth}<br/><br/>` +
            (valMaxPr !== null ? `Max Precipitation: <b>${valMaxPr.toFixed(2)}</b> mm<br/>Max Temperature: <b>${valMaxTas.toFixed(1)}</b> °C` : `<span class="no-data-msg">No data found</span>`);
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
    this._div.innerHTML = `<h4>Legend</h4>`;
    
    if (currentMetric === 'pr_max') {
        this._div.innerHTML += `<strong>Max Precip (mm/day)</strong><br>`;
        this._div.innerHTML += `<i style="background:${getColor(0.5, 'pr_max')}"></i> 0&ndash;1<br>`;
        this._div.innerHTML += `<i style="background:${getColor(2.0, 'pr_max')}"></i> 1&ndash;4<br>`;
        this._div.innerHTML += `<i style="background:${getColor(5.0, 'pr_max')}"></i> 4&ndash;8<br>`;
        this._div.innerHTML += `<i style="background:${getColor(10.0, 'pr_max')}"></i> 8&ndash;15<br>`;
        this._div.innerHTML += `<i style="background:${getColor(16.0, 'pr_max')}"></i> 15+`;
    } else {
        this._div.innerHTML += `<strong>Max Temp (°C)</strong><br>`;
        this._div.innerHTML += `<i style="background:${getColor(-5, 'tas_max')}"></i> &lt;0<br>`;
        this._div.innerHTML += `<i style="background:${getColor(5, 'tas_max')}"></i> 0&ndash;10<br>`;
        this._div.innerHTML += `<i style="background:${getColor(15, 'tas_max')}"></i> 10&ndash;20<br>`;
        this._div.innerHTML += `<i style="background:${getColor(25, 'tas_max')}"></i> 20&ndash;30<br>`;
        this._div.innerHTML += `<i style="background:${getColor(35, 'tas_max')}"></i> 30+`;
    }
};
mapLegend.addTo(map);

function updateMapLayer() {
    if (geojsonLayer) { map.removeLayer(geojsonLayer); }
    geojsonLayer = L.geoJson(chinaProvincesGeoJSON, { style: style, onEachFeature: onEachFeature }).addTo(map);
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
    if (monthlyAggregate === null) return [];

    let dailyPoints = [];
    if (metric === 'pr_max') {
        for (let day = 1; day <= numDays; day++) {
            let spikeFactor = Math.abs(Math.sin(day * 1.2));
            if (day % 7 === 0) spikeFactor = 1.0; 
            dailyPoints.push(monthlyAggregate * (0.1 + spikeFactor * 0.9));
        }
    } else {
        for (let day = 1; day <= numDays; day++) {
            let variance = Math.sin(day * 0.2) * 4; 
            dailyPoints.push(monthlyAggregate - Math.abs(variance));
        }
    }
    return dailyPoints;
}

function initLineCharts() {
    const colors = { "Anhui": "#4ade80", "Hubei": "#38bdf8", "Hunan": "#c084fc", "Jiangsu": "#f472b6" };
    const bgColors = { "Anhui": "rgba(74, 222, 128, 0.12)", "Hubei": "rgba(56, 189, 248, 0.12)", "Hunan": "rgba(192, 132, 252, 0.12)", "Jiangsu": "rgba(244, 114, 182, 0.12)" };

    const totalDays = getDaysInMonth(currentMonth);
    const dayLabels = Array.from({ length: totalDays }, (_, i) => (i + 1).toString());

    let allGeneratedData = {};
    let globalMax = -999;
    let globalMin = 999;

    regions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        
        let rMax = Math.max(...dataArr);
        let rMin = Math.min(...dataArr);
        if (rMax > globalMax) globalMax = rMax;
        if (rMin < globalMin) globalMin = rMin;
    });

    let finalYMin = currentMetric === 'pr_max' ? 0 : Math.floor(globalMin - 2);
    let finalYMax = Math.ceil(globalMax * 1.15);

    regions.forEach(region => {
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
                        min: finalYMin,
                        max: finalYMax,
                        display: true, 
                        ticks: { 
                            color: '#bfdbfe', 
                            font: { size: 9 },
                            callback: function(value) {
                                return Number(value).toFixed(1);
                            }
                        }, 
                        grid: { color: 'rgba(125, 211, 252, 0.08)' },
                        title: {
                            display: true,
                            text: currentMetric === 'pr_max' ? 'Precip (mm)' : 'Temp (°C)',
                            color: '#bfdbfe', 
                            font: { size: 9, weight: 'bold' }
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
    let globalMax = -999;
    let globalMin = 999;

    regions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        
        let rMax = Math.max(...dataArr);
        let rMin = Math.min(...dataArr);
        if (rMax > globalMax) globalMax = rMax;
        if (rMin < globalMin) globalMin = rMin;
    });

    let finalYMin = currentMetric === 'pr_max' ? 0 : Math.floor(globalMin - 2);
    let finalYMax = Math.ceil(globalMax * 1.15);

    regions.forEach(region => {
        const chart = chartInstances[region];
        if (!chart) return;

        chart.data.labels = dayLabels;
        chart.data.datasets[0].data = allGeneratedData[region];
        chart.data.datasets[0].label = currentMetric;
        chart.options.scales.y.min = finalYMin;
        chart.options.scales.y.max = finalYMax;
        if (chart.options.scales.y.title) {
            chart.options.scales.y.title.text = currentMetric === 'pr_max' ? 'Precip (mm)' : 'Temp (°C)';
        }
        chart.update('none'); 
    });
}

// ── CONTROL EVENT LISTENERS (UPDATED FOR BUTTON TOGGLES) ──
const slider = document.getElementById('month-slider');
const monthDisplay = document.getElementById('month-display');

slider.addEventListener('input', function(e) {
    currentMonth = months[e.target.value];
    monthDisplay.textContent = currentMonth;
    updateMapLayer();
    updateAllLineCharts(); 
});

// Watch for clicks across all metric group button trays instead of a dropdown box change event
document.querySelectorAll('.metric-toggle-btn').forEach(button => {
    button.addEventListener('click', function() {
        // Toggle active button style classes dynamically
        document.querySelectorAll('.metric-toggle-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Extract selected metric choice from data-attribute and push structural layout redraws
        currentMetric = this.getAttribute('data-metric');
        updateMapLayer();
        updateAllLineCharts();
    });
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

// Timed annotation control logic
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