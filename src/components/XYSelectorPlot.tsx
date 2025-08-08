import React, { useState } from 'react';
import Plot from 'react-plotly.js';

const allAxes = [
  'Cooling Load (kWh)',
  'Heating Load (kWh)',
  'Artificial Lighting Load (kWh)',
  'UDI-a (%)',
];

const widths = ['5'];
const lengths = ['5', '7', '9'];
const heights = ['3'];
const wwrs = ['05', '09'];

export default function XYSelectorPlot({ rawJson }: { rawJson: any[] }) {
  const [selectedAxis, setSelectedAxis] = useState(allAxes[0]);
  const [width, setWidth] = useState('5');
  const [length, setLength] = useState('9');
  const [height, setHeight] = useState('3');
  const [wwr, setWwr] = useState('09');

  const otherAxes = allAxes.filter((a) => a !== selectedAxis);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>XY Scatter Plot – Karşılaştırmalı Analiz</h2>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <label>
          Width:
          <select value={width} onChange={(e) => setWidth(e.target.value)}>
            {widths.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Length:
          <select value={length} onChange={(e) => setLength(e.target.value)}>
            {lengths.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Height:
          <select value={height} onChange={(e) => setHeight(e.target.value)}>
            {heights.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          WWR:
          <select value={wwr} onChange={(e) => setWwr(e.target.value)}>
            {wwrs.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>

        <label>
          Karşılaştırma için eksen seç:
          <select value={selectedAxis} onChange={(e) => setSelectedAxis(e.target.value)}>
            {allAxes.map((axis) => (
              <option key={axis}>{axis}</option>
            ))}
          </select>
        </label>
      </div>

      {rawJson?.length === 0 ? (
        <p>Veri yok. Lütfen Excel'den aktarılan veriyi kontrol edin.</p>
      ) : (
        otherAxes.map((axis) => (
          <div key={axis} style={{ marginBottom: '3rem' }}>
            <h4>
              {selectedAxis} vs {axis}
            </h4>
            <Plot
              data={[
                {
                  type: 'scatter',
                  mode: 'markers',
                  x: rawJson.map((row) => row[selectedAxis]),
                  y: rawJson.map((row) => row[axis]),
                  marker: { size: 6, color: 'royalblue' },
                },
              ]}
              layout={{
                xaxis: { title: selectedAxis },
                yaxis: { title: axis },
                height: 400,
                margin: { l: 50, r: 20, t: 20, b: 50 },
              }}
              style={{ width: '100%' }}
            />
          </div>
        ))
      )}
    </div>
  );
}
