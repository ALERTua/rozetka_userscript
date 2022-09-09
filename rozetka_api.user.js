// ==UserScript==
// @name Rozetka API
// @icon http://rozetka.com.ua/favicon.ico
// @description Rozetka API
// @version 1
// @match https://rozetka.com.ua/*
// @match https://*.rozetka.com.ua/*"
// @match https://bt.rozetka.com.ua/*
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

const createElement = (tagName, config = {}) => {
    const el = document.createElement(tagName);
    if (config.attrs) Object.entries(config.attrs).forEach(([attr, val]) => el.setAttribute(attr, val));
    if (config.props) Object.entries(config.props).forEach(([prop, val]) => el[prop] = val);
    if (config.css) Object.entries(config.css).forEach(([prop, val]) => el.style[prop] = val);
    if (config.children) config.children.forEach(child => el.append(child));
    return el;
};

const createChart = (canvas, settings) => new Chart((typeof canvas === 'string' ? document.querySelector(canvas) : canvas).getContext('2d'), settings);

const createSimpleBarChart = (selector, chartData) => {
    const {data, label} = chartData;
    let prices = data.map(({value}) => value);
    let max_i = Math.max.apply(null, prices);
    let min_i = Math.min.apply(null, prices);
    return createChart(selector, {
        type: 'bar',
        data: {
            labels: data.map(({key}) => key),
            datasets: [{
                label: label,
                borderColor: "#00DC4B",
                data: data.map(({value}) => value),
                // backgroundColor: data.map(({backgroundColor}) => backgroundColor),
                // borderColor: data.map(({borderColor}) => borderColor),
                borderWidth: 3,
                tension: 0.0,
                lineTension: 0,
                stepped: true,
                fill: false,
                pointHoverBorderColor: "rgba(0,220,75,1)",
                pointHoverBackgroundColor: "rgba(19,21,33,1)",
                pointHoverRadius: 5,
                pointHoverBorderWidth: 4
                // borderColor: 'rgb(75, 192, 192)',
            }]
        },
        options: {
            interaction: {
                mode: 'x'
            },
            legend: {
                //display: false
                position: "chartArea",
                align: "center",
                title: {
                    text: "price"
                }
            },
            scales: {
                yAxes: [{
                    ticks: {
                        min: Math.round(min_i / 1.2),
                        max: Math.round(max_i * 1.2),
                        stepSize: Math.round(max_i / 2)
                    }
                }
                ],
                xAxes: [{
                    gridLines: {
                        display: !1
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
                    radius: 3,
                    borderWidth: 3,
                    pointStyle: "circle"
                },
            },
            hover: {
                mode: "nearest",
                intersect: !1
            },
            aspectRatio: 3,
            responsive: !0,
            plugins: {
                tooltip: {
                    enabled: true
                }
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

$(document).ready(function () {

    // let id_ = document.getElementsByClassName('g-id')[0].textContent;
    let id_ = get_id();
    console.log("rozetka_api for " + id_);
    GM_addStyle(`${GM_getResourceText('CHART_JS_CSS')}
    .rozetka_api-chart-wrapper {
      position: fixed;
      width: 710px;
      height: 236px;
      background: rgba(255, 255, 255, 0.9);
      border: thin solid grey;
    }
  `);

    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://rozetka.alertua.duckdns.org/get/' + id_,
        onload: function (response) {
            // console.log("got response");
            let json_data = JSON.parse(response.response);
            let timestamps = [];
            let prices = [];

            for (const [key, value] of Object.entries(json_data)) {
                console.log(key, value);
                timestamps.push(key);
                prices.push(value);
            }
            if (timestamps.length === 0) {
                console.log("rozetka_api: no data on " + id_);
                return
            }
            // console.log(id_ + " " + data);
            // console.log("response parsed");
            console.log("timestamps: " + timestamps);
            console.log("prices: " + prices);

            let product_trade = document.getElementsByClassName('product-trade')[0];
            let rozetka_api_div = createElement('div', {
                props: {
                    className: 'rozetka_api',
                    style: "width: 100%"
                },
                children: [
                    createElement('div', {
                        props: {
                            className: 'rozetka_api-chart-container',
                            style: "position: relative;"
                        },
                        children: [
                            createElement('canvas', {
                                attrs: {id: 'rozetka_api-canvas'}
                            })
                        ]
                    })
                ]
            })
            product_trade.appendChild(rozetka_api_div);

            let chart_data = []
            for (const [key, value] of Object.entries(json_data)) {
                console.log("key: " + key);
                let flt = parseFloat(key);
                let date = new Date(flt);
                let date_options = {year: 'numeric', month: 'short', day: 'numeric'};
                let date_str = date.toLocaleDateString(undefined, options = date_options);
                console.log("date_str: " + date_str);
                chart_data.push({
                    key: date_str,
                    value: value
                })
            }

            const chartData = {
                label: 'Price',
                data: chart_data
            };

            const myChart = createSimpleBarChart('#rozetka_api-canvas', chartData);
        }
    });
});
