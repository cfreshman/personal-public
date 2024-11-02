/// Modified source copyright
// Copyright 2022 Takanori Fujiwara.
// Released under the BSD 3-Clause 'New' or 'Revised' License

/// Original source copyright
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/state-choropleth

import {
  choropleth
} from './chart.js';

import {
  legend
} from './legend.js';
console.log('here')
const unemployment = await d3.csv('/raw/maps/data/unemployment201907.csv', d3.autoType);
console.log('here 2', unemployment)
const us = await d3.json('/raw/maps/data/counties-albers-10m.json');
console.log('here 3', us)
const counties = topojson.feature(us, us.objects.counties);
const states = topojson.feature(us, us.objects.states);
const statemap = new Map(topojson.feature(us, us.objects.states).features.map(d => [d.id, d]));
const statemesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);

const namemap = new Map(states.features.map(d => [d.properties.name, d.id]));

const chart = choropleth(unemployment, {
  id: d => namemap.get(d.name),
  value: d => d.rate,
  scale: d3.scaleQuantize,
  domain: [1, 7],
  range: d3.schemeBlues[6],
  title: (f, d) => `${f.properties.name}\n${d?.rate}%`,
  features: states,
  borders: statemesh,
  width: 975,
  height: 610
});

const chartLegend = legend(chart.scales.color, {
  title: 'Unemployment rate (%)'
});

d3.select('body').append(() => chart);
d3.select('body').append(() => chartLegend);