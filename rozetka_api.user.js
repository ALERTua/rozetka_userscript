// ==UserScript==
// @name Rozetka API
// @icon http://rozetka.com.ua/favicon.ico
// @description Rozetka API
// @version 1
// @match https://rozetka.com.ua/*
// @match https://*.rozetka.com.ua/*
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.min.js
// @resource CHART_JS_CSS https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.min.css
// @grant GM_xmlhttpRequest
// @grant GM_addStyle
// @grant GM_getResourceText
// @connect rozetka.alertua.duckdns.org
// ==/UserScript==

/* global Chart */
/* eslint-disable no-multi-spaces, no-return-assign */
'use strict';

const urlBase = "https://rozetka.alertua.duckdns.org";

const createElement = (tagName, config = {}) => {
    const el = document.createElement(tagName);
    if (config.attrs) Object.entries(config.attrs).forEach(([attr, val]) => el.setAttribute(attr, val));
    if (config.props) Object.entries(config.props).forEach(([prop, val]) => el[prop] = val);
    if (config.css) Object.entries(config.css).forEach(([prop, val]) => el.style[prop] = val);
    if (config.children) config.children.forEach(child => el.append(child));
    return el;
};

const createChartDiv = (chartName) => {
    return createElement(
        'div',
        {
            props: {
                className: chartName,
                style: "width: 100%; height: 200px",
            },
            children: [
                createElement('div', {
                    props: {
                        className: chartName.concat('-chart-container'),
                        style: "position: relative; height: 200px;"
                    },
                    children: [
                        createElement('canvas', {
                            attrs: {
                                id: chartName.concat('-canvas')
                            },
                            props: {
                                style: "width: 100%; height: 200px"
                            }

                        })
                    ]
                })
            ]
        }
    );
};

const createChart = (canvas, settings) => new Chart((typeof canvas === 'string' ? document.querySelector(canvas) : canvas).getContext('2d'), settings);

const createSimpleBarChart = (selector, chartData) => {
    let datasets = [];
    let all_values = [];
    let all_timedates = [];

    chartData.forEach(function (input, index) {
        const color = input.color;
        const points = input.points;
        //console.log("points: " + JSON.stringify(points));
        all_timedates.push(...Object.keys(points));
        all_values.push(...Object.values(points));

        let dataset = {
            label: input.field,
            borderColor: color,
            data: Object.values(points),
            borderWidth: 3,
            tension: 0.1,
            lineTension: 0,
            stepped: true,
            fill: false,
            pointHoverBorderColor: color,
            pointHoverBackgroundColor: "rgba(80,80,80,1)",
            pointHoverRadius: 3,
            pointHoverBorderWidth: 3
        }
        datasets.push(dataset);
    })
    let timedates = all_timedates.filter((v, i, a) => a.indexOf(v) === i);
    console.log("timedates: " + JSON.stringify(timedates));

    let max_i = Math.max.apply(null, all_values);
    let min_i = Math.min.apply(null, all_values);

    return createChart(selector, {
        type: 'line',
        data: {
            labels: timedates,
            datasets: datasets
        },
        options: {
            legend: {
                display: true,
                position: "right",
                align: "start",
                fullSize: false,
                // title: {
                //     text: name
                // }
            },
            scales: {
                yAxes: [{
                    ticks: {
                        min: Math.round(min_i / 1.1),
                        max: Math.round(max_i * 1.1),
                        stepSize: Math.round(max_i / 2)
                    }
                }
                ],
                xAxes: [{
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkipPadding: 1e3
                    }
                }
                ]
            },
            elements: {
                point: {
                    radius: 2,
                    borderWidth: 0,
                    pointStyle: "circle"
                },
            },
            hover: {
                mode: "nearest",
                intersect: false
            },
            responsive: false,
            tooltips: {
                enabled: true,
                mode: "nearest",
                intersect: false,
                position: "nearest",
                bodyAlign: "center",
                titleAlign: "center",
                xAlign: "center",
                yAlign: "center",
                caretPadding: 0,
                caretSize: 0,
                displayColors: false,
                borderWidth: 1,
                backgroundColor: "#fff",
                bodyFontColor: "rgba(0,0,0,0.87)",
                titleFontColor: "rgba(0,0,0,0.87)",
                borderColor: "rgba(0,0,0,0.4)",
            }
        }
    });
};

function get_id() {
    let expRecords = location.href.match(/\/p([0-9]*?)\//);
    if (expRecords && expRecords.length > 1) {
        return expRecords[1];
    }
    let iconElements = document.getElementsByClassName("product__code detail-code");
    return iconElements.length > 0 && !!((expRecords = iconElements[0].innerText.match(/\d[0-9]*/)) && expRecords.length > 0) && expRecords[0];
}

function parse_response(response, id_) {
{
    // console.log("got response: " + response.response);
    let json_data = JSON.parse(response.response);
    // console.log("got response: " + json_data);
    if (json_data.length === 0) {
        console.log("rozetka_api: no data on " + id_);
        return
    }
    let all_fields = Object.keys(json_data[0]);
    // console.log("all_fields: " + all_fields);
    const field_excludes = ['_time',];
    const fields = all_fields.filter(function(e) { return !field_excludes.includes(e)})
    // console.log("fields: " + fields);

    let container_element = document.getElementsByClassName('product-about')[0].parentNode;
    let before_element = document.getElementsByClassName('product-about')[1];
    const rozetkaApiDiv = createChartDiv('rozetka_api_chart');
    container_element.insertBefore(rozetkaApiDiv, before_element);

    let chart_data = [];
    let colors = [
        'rgb(173,173,173)',
        'rgb(176,85,85)',
        'rgba(17,243,0,0.4)',
        'rgb(0, 0, 0)',
        'rgb(0, 0, 0)',
        'rgb(0, 0, 0)',
        'rgb(0, 0, 0)',
    ];
    fields.forEach(function (field, index) {
        // let color = colors[Math.floor(Math.random()*colors.length)];
        let color = colors.at(index);
        let field_chart_data = {'field': field, 'color': color, 'points':{}};
        json_data.forEach(function (obj, index) {
            let _time = obj['_time'];
            let date = new Date(_time);
            let date_options = {year: 'numeric', month: 'short', day: 'numeric'};
            let date_str = date.toLocaleDateString(undefined, options = date_options);
            let time_options = { hour12: false, hour: '2-digit', minute: '2-digit'};
            let time_str = date.toLocaleTimeString(undefined, options=time_options)
            let value = obj[field];
            let datetime_str = date_str + ' ' + time_str;
            //console.log("point: datetime_str: " + datetime_str + ", value: " + value);
            field_chart_data.points[datetime_str] = value
        })
        // console.log("field_chart_data: " + field_chart_data);
        chart_data.push(field_chart_data)
    })
    //console.log("chart_data: " + JSON.stringify(chart_data));
    const myChart = createSimpleBarChart('#rozetka_api_chart-canvas', chart_data);
}
}

$(document).ready(function () {
    // let id_ = document.getElementsByClassName('g-id')[0].textContent;
    let id_ = get_id();
    if (id_ === false) {
        return
    }
    console.log("rozetka_api for " + id_);
//     GM_addStyle(`${GM_getResourceText('CHART_JS_CSS')}
//     .rozetka_api-chart-wrapper {
//       position: fixed;
//       width: 710px;
//       height: 236px;
//       background: rgba(255, 255, 255, 0.9);
//       border: thin solid grey;
//     }
//   `);

    GM_xmlhttpRequest({
        method: 'GET',
        url: urlBase + '/get/' + id_,
        onload: function (response) {
            return parse_response(response, id_)
        }
    });
});
