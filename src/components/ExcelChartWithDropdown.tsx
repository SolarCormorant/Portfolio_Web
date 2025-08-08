import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import * as XLSX from 'xlsx';

const col_names = [
  "x",
  "y",
  "z",
  "WWR",
  "Interior Shelf",
  "Interior Shelf Rotation Angle",
  "Interior Shelf Height (m)",
  "Interior Shelf Depth (m)",
  "Exterior Shelf",
  "Exterior Shelf Rotation Angle",
  "Exterior Shelf Height (m)",
  "Exterior Shelf Depth (m)",
  "Cooling Load (kWh)",
  "Heating Load (kWh)",
  "UDI-a (%)",
  "Artificial Lighting Load (kWh)",
  "UDI-a (%)_2",
];


const widths = ['5'];
const lengths = ['5', '7', '9'];
const heights = ['3'];
const wwrs = ['05', '09'];

const ExcelChartWithDropdown: React.FC = () => {
  const [selectedWidth, setSelectedWidth] = useState('5');
  const [selectedLength, setSelectedLength] = useState('9');
  const [selectedHeight, setSelectedHeight] = useState('3');
  const [selectedWWR, setSelectedWWR] = useState('09');
  const [plotData2D, setPlotData2D] = useState<any[]>([]);
  const [rawJson, setRawJson] = useState<any[]>([]); // 3D plot için

  const buildFilename = () =>
    `${selectedWidth}x${selectedLength}x${selectedHeight}x${selectedWWR}.xls`;

  const fetchAndParseExcel = async () => {
    const filename = buildFilename();
    try {
      const res = await fetch(`/excel/${filename}`);
      const arrayBuffer = await res.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: col_names, range: 0 });
    setRawJson(json);

      console.log('Example row from Excel:', json[0]);

      const x = json.map((row: any) => row.X);
      const y = json.map((row: any) => row.Y);

      setPlotData2D([
        {
          x,
          y,
          type: 'scatter',
          mode: 'lines+markers',
          name: filename,
        },
      ]);
    } catch (err) {
      console.error('Dosya yüklenemedi:', filename, err);
      setRawJson([]);
      setPlotData2D([]);
    }
  };

  useEffect(() => {
    fetchAndParseExcel();
  }, [selectedWidth, selectedLength, selectedHeight, selectedWWR]);

  return (
    <div>
      {/* Dropdownlar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <label>
          Width:
          <select value={selectedWidth} onChange={(e) => setSelectedWidth(e.target.value)}>
            {widths.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
        <label>
          Length:
          <select value={selectedLength} onChange={(e) => setSelectedLength(e.target.value)}>
            {lengths.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Height:
          <select value={selectedHeight} onChange={(e) => setSelectedHeight(e.target.value)}>
            {heights.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
        <label>
          WWR:
          <select value={selectedWWR} onChange={(e) => setSelectedWWR(e.target.value)}>
            {wwrs.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
      </div>

      {/* 2D Grafik */}
      <Plot
        data={plotData2D}
        layout={{ title: `2D Plot for ${buildFilename()}` }}
        style={{ width: '100%', height: '400px' }}
      />

      {/* 3D Grafik */}
      {rawJson.length > 0 && (
        <Plot
          data={[
            {
              type: 'scatter3d',
              mode: 'markers',
              x: rawJson.map((row: any) => row['Cooling Load (kWh)']),
              y: rawJson.map((row: any) => row['Heating Load (kWh)']),
              z: rawJson.map((row: any) => row['Artificial Lighting Load (kWh)']),
              customdata: rawJson.map((row: any) => row['UDI-a (%)']),
              hovertemplate:
                'Cooling Load (kWh): %{x}<br>' +
                'Heating Load (kWh): %{y}<br>' +
                'Artificial Lighting Load (kWh): %{z}<br>' +
                'UDI-a: %{customdata}',
              marker: {
                size: 5,
                color: rawJson.map((row: any) => row['UDI-a (%)']),
                colorscale: 'YlGnBu',
                colorbar: { title: 'UDI-a (%)' },
              },
            },
          ]}
          layout={{
            title: '3D Scatter: Cooling / Heating / Lighting vs UDI-a',
            scene: {
              xaxis: { title: 'Cooling Load (kWh)' },
              yaxis: { title: 'Heating Load (kWh)' },
              zaxis: { title: 'Artificial Lighting Load (kWh)' },
            },
            margin: { l: 0, r: 0, b: 0, t: 40 },
          }}
          style={{ width: '100%', height: '600px', marginTop: '2rem' }}
        />
      )}
    </div>
  );
};

export default ExcelChartWithDropdown;
