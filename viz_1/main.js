// main.js - Map Logic, Shared Limits, & Horizontal Synced Controls

const DATA_FILE = "../data/df_1887.csv";
let precipitationData = [];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const targetRegions = ["Hebei", "Henan", "Shandong"];
let chartInstances = {};

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
        {
            "type": "Feature",
            "properties": { "name": "Hebei" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [114.5, 36.0], [113.5, 36.3], [113.4, 38.0], [114.2, 40.0], [115.0, 40.5], 
                    [117.3, 40.6], [119.0, 40.0], [119.3, 40.4], [119.8, 40.0], [119.2, 39.5],
                    [118.0, 39.2], [117.6, 38.5], [116.3, 38.0], [115.4, 36.1], [114.5, 36.0]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Henan" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [110.4, 34.6], [111.0, 35.3], [112.4, 35.2], [114.3, 36.1], [115.4, 36.1],
                    [116.2, 34.6], [116.4, 33.9], [115.1, 32.2], [114.1, 31.4], [112.3, 32.3],
                    [111.0, 32.2], [110.4, 33.2], [111.2, 34.0], [110.4, 34.6]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Shandong" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [115.4, 36.1], [116.3, 38.0], [117.6, 38.5], [118.1, 37.9], [119.2, 37.2],
                    [121.0, 37.7], [122.5, 37.5], [122.6, 36.9], [121.0, 36.1], [119.5, 35.4],
                    [119.3, 34.8], [117.2, 34.6], [116.2, 34.6], [115.4, 36.1]
                ]]
            }
        }
    ]
};

const map = L.map('map', {
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    touchZoom: false
}).setView([36.5, 116.0], 5);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

let geojsonLayer;
let currentMonth = "January";
let currentMetric = "pr_max";

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
    return {
        fillColor: getColor(value, currentMetric),
        weight: 2,
        opacity: 1,
        color: '#cbd5e0',
        dashArray: '',
        fillOpacity: 0.8
    };
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({ weight: 3, color: '#4a5568', dashArray: '', fillOpacity: 0.9 });
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
infoPanel.onAdd = function (map) {
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
mapLegend.onAdd = function (map) {
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
    if (monthlyAggregate === null) return new Array(numDays).fill(0);

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
    const colors = { "Hebei": "#4ade80", "Henan": "#38bdf8", "Shandong": "#c084fc" };
    const bgColors = { "Hebei": "rgba(74, 222, 128, 0.12)", "Henan": "rgba(56, 189, 248, 0.12)", "Shandong": "rgba(192, 132, 252, 0.12)" };

    const totalDays = getDaysInMonth(currentMonth);
    const dayLabels = Array.from({ length: totalDays }, (_, i) => (i + 1).toString());

    let allGeneratedData = {};
    let globalMax = -999;
    let globalMin = 999;

    targetRegions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        
        let rMax = Math.max(...dataArr);
        let rMin = Math.min(...dataArr);
        if (rMax > globalMax) globalMax = rMax;
        if (rMin < globalMin) globalMin = rMin;
    });

    let finalYMin = currentMetric === 'pr_max' ? 0 : Math.floor(globalMin - 2);
    let finalYMax = Math.ceil(globalMax * 1.15);

    targetRegions.forEach(region => {
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

    targetRegions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        
        let rMax = Math.max(...dataArr);
        let rMin = Math.min(...dataArr);
        if (rMax > globalMax) globalMax = rMax;
        if (rMin < globalMin) globalMin = rMin;
    });

    let finalYMin = currentMetric === 'pr_max' ? 0 : Math.floor(globalMin - 2);
    let finalYMax = Math.ceil(globalMax * 1.15);

    targetRegions.forEach(region => {
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

// ── CONTROL EVENT LISTENERS (UPDATED TO WATCH BUTTON GROUP CLICK TRAGETS) ──
const slider = document.getElementById('month-slider');
const monthDisplay = document.getElementById('month-display');

slider.addEventListener('input', function(e) {
    currentMonth = months[e.target.value];
    monthDisplay.textContent = currentMonth;
    updateMapLayer();
    updateAllLineCharts();
});

// Refactored to listen for toggle button adjustments natively without causing variable dropouts
document.querySelectorAll('.metric-toggle-btn').forEach(button => {
    button.addEventListener('click', function() {
        // Dynamic styling toggle synchronization
        document.querySelectorAll('.metric-toggle-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // State update & dashboard repaint workflow triggers
        currentMetric = this.getAttribute('data-metric');
        updateMapLayer();
        updateAllLineCharts();
    });
});

window.addEventListener('load', async function() {
    precipitationData = await loadPrecipitationData(DATA_FILE, targetRegions);

    updateMapLayer();
    initLineCharts();
    setTimeout(() => map.invalidateSize(), 100);
});

// Intro Animation
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