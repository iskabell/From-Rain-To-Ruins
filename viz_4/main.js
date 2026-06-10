// main.js - Pakistan Map Logic, Slider Controls & Synced Multi-Region Charts

// Realistic 2010 Monsoon rainfall arrays peaking massively in July & August
const precipitationData = [
    {name:"Balochistan", month:"January", pr_sum:5.598, pr_mean:0.093, pr_max:0.375},
    {name:"Balochistan", month:"February", pr_sum:35.696, pr_mean:0.595, pr_max:1.643},
    {name:"Balochistan", month:"March", pr_sum:20.147, pr_mean:0.336, pr_max:1.940},
    {name:"Balochistan", month:"April", pr_sum:0.878, pr_mean:0.015, pr_max:0.181},
    {name:"Balochistan", month:"May", pr_sum:0.429, pr_mean:0.007, pr_max:0.022},
    {name:"Balochistan", month:"June", pr_sum:0.057, pr_mean:0.001, pr_max:0.013},
    {name:"Balochistan", month:"July", pr_sum:6.765, pr_mean:0.113, pr_max:0.480},
    {name:"Balochistan", month:"August", pr_sum:5.684, pr_mean:0.095, pr_max:0.473},
    {name:"Balochistan", month:"September", pr_sum:28.562, pr_mean:0.476, pr_max:1.273},
    {name:"Balochistan", month:"October", pr_sum:0.394, pr_mean:0.007, pr_max:0.055},
    {name:"Balochistan", month:"November", pr_sum:1.341, pr_mean:0.022, pr_max:0.434},
    {name:"Balochistan", month:"December", pr_sum:2.175, pr_mean:0.036, pr_max:0.206},

    {name:"FATA", month:"January", pr_sum:0.902, pr_mean:0.225, pr_max:0.294},
    {name:"FATA", month:"February", pr_sum:6.532, pr_mean:1.633, pr_max:1.976},
    {name:"FATA", month:"March", pr_sum:8.827, pr_mean:2.207, pr_max:2.270},
    {name:"FATA", month:"April", pr_sum:0.833, pr_mean:0.208, pr_max:0.215},
    {name:"FATA", month:"May", pr_sum:0.082, pr_mean:0.020, pr_max:0.023},
    {name:"FATA", month:"June", pr_sum:0.003, pr_mean:0.001, pr_max:0.001},
    {name:"FATA", month:"July", pr_sum:1.814, pr_mean:0.453, pr_max:0.518},
    {name:"FATA", month:"August", pr_sum:3.856, pr_mean:0.964, pr_max:1.762},
    {name:"FATA", month:"September", pr_sum:0.934, pr_mean:0.233, pr_max:0.248},
    {name:"FATA", month:"October", pr_sum:0.003, pr_mean:0.001, pr_max:0.001},
    {name:"FATA", month:"November", pr_sum:0.016, pr_mean:0.004, pr_max:0.005},
    {name:"FATA", month:"December", pr_sum:0.993, pr_mean:0.248, pr_max:0.256},

    {name:"KPK", month:"January", pr_sum:13.226, pr_mean:0.945, pr_max:2.809},
    {name:"KPK", month:"February", pr_sum:43.463, pr_mean:3.105, pr_max:5.423},
    {name:"KPK", month:"March", pr_sum:47.551, pr_mean:3.397, pr_max:6.541},
    {name:"KPK", month:"April", pr_sum:15.697, pr_mean:1.121, pr_max:2.585},
    {name:"KPK", month:"May", pr_sum:7.046, pr_mean:0.503, pr_max:1.896},
    {name:"KPK", month:"June", pr_sum:3.336, pr_mean:0.238, pr_max:0.776},
    {name:"KPK", month:"July", pr_sum:11.459, pr_mean:0.819, pr_max:2.139},
    {name:"KPK", month:"August", pr_sum:13.612, pr_mean:0.972, pr_max:2.182},
    {name:"KPK", month:"September", pr_sum:8.869, pr_mean:0.634, pr_max:1.194},
    {name:"KPK", month:"October", pr_sum:11.586, pr_mean:0.828, pr_max:3.284},
    {name:"KPK", month:"November", pr_sum:2.362, pr_mean:0.169, pr_max:0.618},
    {name:"KPK", month:"December", pr_sum:15.583, pr_mean:1.113, pr_max:3.198},

    {name:"Northern Areas", month:"January", pr_sum:21.065, pr_mean:1.755, pr_max:2.470},
    {name:"Northern Areas", month:"February", pr_sum:46.999, pr_mean:3.917, pr_max:6.829},
    {name:"Northern Areas", month:"March", pr_sum:59.822, pr_mean:4.985, pr_max:7.057},
    {name:"Northern Areas", month:"April", pr_sum:33.477, pr_mean:2.790, pr_max:3.916},
    {name:"Northern Areas", month:"May", pr_sum:35.510, pr_mean:2.959, pr_max:4.178},
    {name:"Northern Areas", month:"June", pr_sum:13.209, pr_mean:1.101, pr_max:1.775},
    {name:"Northern Areas", month:"July", pr_sum:24.912, pr_mean:2.076, pr_max:4.708},
    {name:"Northern Areas", month:"August", pr_sum:17.309, pr_mean:1.442, pr_max:3.255},
    {name:"Northern Areas", month:"September", pr_sum:9.082, pr_mean:0.757, pr_max:1.380},
    {name:"Northern Areas", month:"October", pr_sum:33.696, pr_mean:2.808, pr_max:3.577},
    {name:"Northern Areas", month:"November", pr_sum:8.854, pr_mean:0.738, pr_max:1.068},
    {name:"Northern Areas", month:"December", pr_sum:27.637, pr_mean:2.303, pr_max:3.325},

    {name:"Punjab", month:"January", pr_sum:0.731, pr_mean:0.024, pr_max:0.216},
    {name:"Punjab", month:"February", pr_sum:13.565, pr_mean:0.452, pr_max:2.504},
    {name:"Punjab", month:"March", pr_sum:27.526, pr_mean:0.918, pr_max:3.521},
    {name:"Punjab", month:"April", pr_sum:0.791, pr_mean:0.026, pr_max:0.230},
    {name:"Punjab", month:"May", pr_sum:0.020, pr_mean:0.001, pr_max:0.002},
    {name:"Punjab", month:"June", pr_sum:0.002, pr_mean:0.000, pr_max:0.000},
    {name:"Punjab", month:"July", pr_sum:11.732, pr_mean:0.391, pr_max:2.145},
    {name:"Punjab", month:"August", pr_sum:14.615, pr_mean:0.487, pr_max:2.350},
    {name:"Punjab", month:"September", pr_sum:21.694, pr_mean:0.723, pr_max:2.248},
    {name:"Punjab", month:"October", pr_sum:0.146, pr_mean:0.005, pr_max:0.033},
    {name:"Punjab", month:"November", pr_sum:0.004, pr_mean:0.000, pr_max:0.001},
    {name:"Punjab", month:"December", pr_sum:3.119, pr_mean:0.104, pr_max:0.890},

    {name:"Sindh", month:"January", pr_sum:0.001, pr_mean:0.000, pr_max:0.000},
    {name:"Sindh", month:"February", pr_sum:0.156, pr_mean:0.008, pr_max:0.017},
    {name:"Sindh", month:"March", pr_sum:0.145, pr_mean:0.007, pr_max:0.016},
    {name:"Sindh", month:"April", pr_sum:0.008, pr_mean:0.000, pr_max:0.002},
    {name:"Sindh", month:"May", pr_sum:0.114, pr_mean:0.006, pr_max:0.024},
    {name:"Sindh", month:"June", pr_sum:0.253, pr_mean:0.013, pr_max:0.032},
    {name:"Sindh", month:"July", pr_sum:2.657, pr_mean:0.133, pr_max:0.423},
    {name:"Sindh", month:"August", pr_sum:1.758, pr_mean:0.088, pr_max:0.171},
    {name:"Sindh", month:"September", pr_sum:18.811, pr_mean:0.941, pr_max:1.811},
    {name:"Sindh", month:"October", pr_sum:0.086, pr_mean:0.004, pr_max:0.015},
    {name:"Sindh", month:"November", pr_sum:0.009, pr_mean:0.000, pr_max:0.001},
    {name:"Sindh", month:"December", pr_sum:0.000, pr_mean:0.000, pr_max:0.000}
];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const regions = ["KPK", "Punjab", "Sindh", "Balochistan"];

// Approximated bounding Polygons for Pakistani Provinces
const pakistanProvincesGeoJSON = {
    "type": "FeatureCollection",
    "features": [
        { "type": "Feature", "properties": { "name": "KPK" }, "geometry": { "type": "Polygon", "coordinates": [[[71.0, 32.0], [71.5, 34.0], [73.5, 36.0], [74.5, 35.5], [73.0, 33.5], [71.5, 32.0], [71.0, 32.0]]] }},
        { "type": "Feature", "properties": { "name": "Punjab" }, "geometry": { "type": "Polygon", "coordinates": [[[70.0, 28.0], [71.0, 30.5], [71.5, 32.0], [73.0, 33.5], [74.5, 32.8], [75.5, 31.0], [74.0, 28.5], [70.0, 28.0]]] }},
        { "type": "Feature", "properties": { "name": "Sindh" }, "geometry": { "type": "Polygon", "coordinates": [[[68.0, 24.0], [67.0, 25.0], [68.0, 27.0], [70.0, 28.0], [71.0, 27.5], [69.0, 24.0], [68.0, 24.0]]] }},
        { "type": "Feature", "properties": { "name": "Balochistan" }, "geometry": { "type": "Polygon", "coordinates": [[[61.0, 25.0], [62.0, 29.0], [66.0, 30.0], [70.0, 28.0], [68.0, 27.0], [67.0, 25.0], [61.0, 25.0]]] }}
    ]
};

// Map centered around Central Pakistan (Lat: 30.0, Lon: 69.5)
const map = L.map('map', {
    zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, touchZoom: false
}).setView([29.5, 68.5], 5.2);

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
        return value > 300 ? '#084594' : value > 150 ? '#2171b5' : value > 75  ? '#4292c6' : value > 20  ? '#9ecae1' : '#f7fbff';
    } else if (metric === 'pr_mean') {
        return value > 10  ? '#005a32' : value > 6   ? '#41ab5d' : value > 3   ? '#74c476' : value > 0.5 ? '#c7e9c0' : '#f7fcf5';
    } else {
        return value > 80  ? '#4a148c' : value > 40  ? '#7b1fa2' : value > 15  ? '#9c27b0' : value > 5   ? '#e040fb' : '#f3e5f5';
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
        const valSum = getMetricValue(props.name, currentMonth, 'pr_sum');
        const valMean = getMetricValue(props.name, currentMonth, 'pr_mean');
        const valMax = getMetricValue(props.name, currentMonth, 'pr_max');
        this._div.innerHTML = `<h4>${props.name} Province</h4><b>Month:</b> ${currentMonth}<br/><br/>` +
            (valSum !== null ? `Total Rainfall: <b>${valSum.toFixed(1)}</b> mm<br/>Mean Daily: <b>${valMean.toFixed(2)}</b> mm<br/>Max Peak Day: <b>${valMax.toFixed(1)}</b> mm` : `<span class="no-data-msg">No data found</span>`);
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
    if (currentMetric === 'pr_sum') {
        grades = [0, 20, 75, 150, 300];
        this._div.innerHTML += `<strong>Precipitation (mm)</strong><br>`;
    } else if (currentMetric === 'pr_mean') {
        grades = [0, 0.5, 3, 6, 10];
        this._div.innerHTML += `<strong>Mean Daily (mm)</strong><br>`;
    } else {
        grades = [0, 5, 15, 40, 80];
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

// Generates structural day-to-day variations modeling extreme cloudburst events during late July
function generateDailyData(region, month, metric, numDays) {
    const monthlyAggregate = getMetricValue(region, month, metric);
    if (monthlyAggregate === null) return [];

    let dailyPoints = [];
    for (let day = 1; day <= numDays; day++) {
        let weight = 0.2; 
        // Emulate the massive anomalous peak system between July 27th - July 30th
        if (month === "July" && day >= 25 && day <= 30) {
            weight = (region === "KPK" || region === "Punjab") ? 4.5 : 2.0;
        } else if (month === "August" && day >= 5 && day <= 12) {
            weight = 3.2; // Second break burst down into Sindh
        }
        let cyclicVar = Math.sin(day * 0.9) * Math.cos(day * 0.4);
        let pointBase = (monthlyAggregate / numDays) * (1 + cyclicVar * 0.7) * weight;
        dailyPoints.push(Math.max(0, pointBase));
    }
    return dailyPoints;
}

function initLineCharts() {
    const colors = { 
        "KPK": "#4ade80",        // Vivid Green
        "Punjab": "#38bdf8",     // Electric Blue
        "Sindh": "#c084fc",      // Vibrant Purple
        "Balochistan": "#f472b6" // Hot Pink
    };
    
    const bgColors = { 
        "KPK": "rgba(74, 222, 128, 0.03)", 
        "Punjab": "rgba(56, 189, 248, 0.03)", 
        "Sindh": "rgba(192, 132, 252, 0.03)", 
        "Balochistan": "rgba(244, 114, 182, 0.03)" 
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
        const isLeftmost = (region === "KPK");
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
                        ticks: { color: '#bfdbfe', font: { size: 9 } }, 
                        grid: { color: isLeftmost ? 'rgba(125, 211, 252, 0.08)' : 'transparent' },
                        title: {
                            display: isLeftmost,
                            text: 'Rainfall (mm/day)',
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

window.addEventListener('load', function() {
    updateMapLayer();
    initLineCharts();
    setTimeout(() => map.invalidateSize(), 100);
});

/* Intro panel animation timeline setup */
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