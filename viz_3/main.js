// main.js - Vargas Tragedy Map Logic, Slider Controls & Synced Multi-Region Charts

const precipitationData = [
    {name:"La Guaira", month:"January", pr_sum:38, pr_mean:1.23, pr_max:8},
    {name:"La Guaira", month:"February", pr_sum:22, pr_mean:0.79, pr_max:5},
    {name:"La Guaira", month:"March", pr_sum:18, pr_mean:0.58, pr_max:4},
    {name:"La Guaira", month:"April", pr_sum:42, pr_mean:1.40, pr_max:9},
    {name:"La Guaira", month:"May", pr_sum:66, pr_mean:2.13, pr_max:14},
    {name:"La Guaira", month:"June", pr_sum:82, pr_mean:2.73, pr_max:18},
    {name:"La Guaira", month:"July", pr_sum:96, pr_mean:3.10, pr_max:21},
    {name:"La Guaira", month:"August", pr_sum:104, pr_mean:3.35, pr_max:24},
    {name:"La Guaira", month:"September", pr_sum:126, pr_mean:4.20, pr_max:29},
    {name:"La Guaira", month:"October", pr_sum:172, pr_mean:5.55, pr_max:42},
    {name:"La Guaira", month:"November", pr_sum:214, pr_mean:7.13, pr_max:55},
    {name:"La Guaira", month:"December", pr_sum:920, pr_mean:29.68, pr_max:120},

    {name:"Distrito Capital", month:"January", pr_sum:31, pr_mean:1.00, pr_max:7},
    {name:"Distrito Capital", month:"February", pr_sum:20, pr_mean:0.71, pr_max:4},
    {name:"Distrito Capital", month:"March", pr_sum:15, pr_mean:0.48, pr_max:4},
    {name:"Distrito Capital", month:"April", pr_sum:36, pr_mean:1.20, pr_max:8},
    {name:"Distrito Capital", month:"May", pr_sum:58, pr_mean:1.87, pr_max:12},
    {name:"Distrito Capital", month:"June", pr_sum:75, pr_mean:2.50, pr_max:16},
    {name:"Distrito Capital", month:"July", pr_sum:86, pr_mean:2.77, pr_max:19},
    {name:"Distrito Capital", month:"August", pr_sum:92, pr_mean:2.97, pr_max:20},
    {name:"Distrito Capital", month:"September", pr_sum:110, pr_mean:3.67, pr_max:25},
    {name:"Distrito Capital", month:"October", pr_sum:145, pr_mean:4.68, pr_max:35},
    {name:"Distrito Capital", month:"November", pr_sum:188, pr_mean:6.27, pr_max:48},
    {name:"Distrito Capital", month:"December", pr_sum:680, pr_mean:21.94, pr_max:92},

    {name:"Miranda", month:"January", pr_sum:44, pr_mean:1.42, pr_max:9},
    {name:"Miranda", month:"February", pr_sum:25, pr_mean:0.89, pr_max:5},
    {name:"Miranda", month:"March", pr_sum:21, pr_mean:0.68, pr_max:5},
    {name:"Miranda", month:"April", pr_sum:48, pr_mean:1.60, pr_max:10},
    {name:"Miranda", month:"May", pr_sum:72, pr_mean:2.32, pr_max:16},
    {name:"Miranda", month:"June", pr_sum:90, pr_mean:3.00, pr_max:20},
    {name:"Miranda", month:"July", pr_sum:108, pr_mean:3.48, pr_max:24},
    {name:"Miranda", month:"August", pr_sum:116, pr_mean:3.74, pr_max:27},
    {name:"Miranda", month:"September", pr_sum:138, pr_mean:4.60, pr_max:32},
    {name:"Miranda", month:"October", pr_sum:182, pr_mean:5.87, pr_max:43},
    {name:"Miranda", month:"November", pr_sum:226, pr_mean:7.53, pr_max:58},
    {name:"Miranda", month:"December", pr_sum:760, pr_mean:24.52, pr_max:105}
];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const regions = ["La Guaira", "Distrito Capital", "Miranda"];

const regionSlug = {
    "La Guaira": "la-guaira",
    "Distrito Capital": "distrito-capital",
    "Miranda": "miranda"
};

const venezuelaGeoJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": { "name": "La Guaira" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-67.40, 10.50], [-66.70, 10.62], [-66.35, 10.58], [-66.45, 10.42],
                    [-66.95, 10.38], [-67.35, 10.42], [-67.40, 10.50]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Distrito Capital" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-67.25, 10.42], [-66.95, 10.48], [-66.65, 10.45], [-66.58, 10.25],
                    [-66.85, 10.17], [-67.18, 10.22], [-67.25, 10.42]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Miranda" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-66.70, 10.55], [-65.55, 10.60], [-65.20, 10.20], [-65.55, 9.75],
                    [-66.30, 9.78], [-66.75, 10.12], [-66.70, 10.55]
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
}).setView([10.32, -66.45], 8.4);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

let geojsonLayer;
let currentMonth = "December";
let currentMetric = "pr_sum";
let chartInstances = {};

function getColor(value, metric) {
    if (value === null || value === undefined) return '#e2e8f0';

    if (metric === 'pr_sum') {
        return value > 800 ? '#08306b' : value > 500 ? '#08519c' : value > 250 ? '#2171b5' : value > 100 ? '#6baed6' : '#deebf7';
    }

    if (metric === 'pr_mean') {
        return value > 25 ? '#00441b' : value > 15 ? '#006d2c' : value > 8 ? '#31a354' : value > 3 ? '#a1d99b' : '#edf8e9';
    }

    return value > 100 ? '#4a1486' : value > 70 ? '#6a51a3' : value > 40 ? '#9e9ac8' : value > 15 ? '#cbc9e2' : '#f2f0f7';
}

function getMetricValue(regionName, month, metric) {
    const record = precipitationData.find(d => d.name.toLowerCase() === regionName.toLowerCase() && d.month === month);
    return record ? record[metric] : null;
}

function style(feature) {
    const value = getMetricValue(feature.properties.name, currentMonth, currentMetric);

    return {
        fillColor: getColor(value, currentMetric),
        weight: 2,
        opacity: 1,
        color: '#cbd5e0',
        fillOpacity: 0.82
    };
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({ weight: 3, color: '#4a5568', fillOpacity: 0.92 });
    layer.bringToFront();
    infoPanel.update(layer.feature.properties);

    const card = document.getElementById(`card-${regionSlug[layer.feature.properties.name]}`);
    if (card) card.style.borderColor = '#38bdf8';
}

function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
    infoPanel.update();

    const card = document.getElementById(`card-${regionSlug[e.target.feature.properties.name]}`);
    if (card) card.style.borderColor = 'rgba(125, 211, 252, 0.15)';
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
    layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: zoomToFeature });
}

const infoPanel = L.control({ position: 'topright' });
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

        this._div.innerHTML = `<h4>${props.name}</h4><b>Month:</b> ${currentMonth}<br/><br/>` +
            (valSum !== null
                ? `Total Precipitation: <b>${valSum.toFixed(1)}</b> mm<br/>Mean Daily: <b>${valMean.toFixed(2)}</b> mm<br/>Max Day: <b>${valMax.toFixed(1)}</b> mm`
                : `<span class="no-data-msg">No data found</span>`);
    } else {
        this._div.innerHTML = '<h4>Regional Statistics</h4>Hover over a region';
    }
};

infoPanel.addTo(map);

const mapLegend = L.control({ position: 'bottomright' });
mapLegend.onAdd = function () {
    this._div = L.DomUtil.create('div', 'info legend');
    this.updateLegend();
    return this._div;
};

mapLegend.updateLegend = function () {
    let grades;
    this._div.innerHTML = `<h4>Legend</h4>`;

    if (currentMetric === 'pr_sum') {
        grades = [0, 100, 250, 500, 800];
        this._div.innerHTML += `<strong>Precipitation (mm)</strong><br>`;
    } else if (currentMetric === 'pr_mean') {
        grades = [0, 3, 8, 15, 25];
        this._div.innerHTML += `<strong>Mean Daily (mm)</strong><br>`;
    } else {
        grades = [0, 15, 40, 70, 100];
        this._div.innerHTML += `<strong>Max Day (mm)</strong><br>`;
    }

    for (let i = 0; i < grades.length; i++) {
        this._div.innerHTML += '<i style="background:' + getColor(grades[i] + 0.01, currentMetric) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
};

mapLegend.addTo(map);

function updateMapLayer() {
    if (geojsonLayer) map.removeLayer(geojsonLayer);
    geojsonLayer = L.geoJson(venezuelaGeoJSON, { style, onEachFeature }).addTo(map);
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

    const dailyPoints = [];

    for (let day = 1; day <= numDays; day++) {
        let weight = 0.75 + Math.sin(day * 0.7) * 0.18 + Math.cos(day * 0.33) * 0.12;

        if (month === "December" && day >= 14 && day <= 17) {
            weight *= region === "La Guaira" ? 5.8 : region === "Miranda" ? 4.6 : 4.1;
        } else if (month === "December" && day >= 8 && day <= 13) {
            weight *= 2.3;
        } else if (month === "November" && day >= 20 && day <= 24) {
            weight *= 1.8;
        }

        const pointBase = (monthlyAggregate / numDays) * weight;
        dailyPoints.push(Math.max(0, pointBase));
    }

    return dailyPoints;
}

function initLineCharts() {
    const totalDays = getDaysInMonth(currentMonth);
    const dayLabels = Array.from({ length: totalDays }, (_, i) => (i + 1).toString());

    const allGeneratedData = {};
    let globalMax = 0;

    regions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        globalMax = Math.max(globalMax, ...dataArr, 0);
    });

    const sharedYMax = globalMax * 1.15;

    regions.forEach(region => {
        const slug = regionSlug[region];
        const isLeftmost = region === "La Guaira";
        const ctx = document.getElementById(`chart-${slug}`).getContext('2d');

        chartInstances[region] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: `${currentMetric}`,
                    data: allGeneratedData[region],
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
                            text: 'Precipitation (mm/day)',
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

    const allGeneratedData = {};
    let globalMax = 0;

    regions.forEach(region => {
        const dataArr = generateDailyData(region, currentMonth, currentMetric, totalDays);
        allGeneratedData[region] = dataArr;
        globalMax = Math.max(globalMax, ...dataArr, 0);
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

slider.addEventListener('input', function (e) {
    currentMonth = months[e.target.value];
    monthDisplay.textContent = currentMonth;
    updateMapLayer();
    updateAllLineCharts();
});

metricSelect.addEventListener('change', function (e) {
    currentMetric = e.target.value;
    updateMapLayer();
    updateAllLineCharts();
});

window.addEventListener('load', function () {
    updateMapLayer();
    initLineCharts();
    setTimeout(() => map.invalidateSize(), 100);
});

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

(function () {
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
})();