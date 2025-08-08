import React, { useState } from 'react';
import Plot from 'react-plotly.js';

const dataSets = {
  database1: {
    x: [1, 2, 3, 4],
    y: [10, 15, 13, 17],
    name: 'Database 1',
  },
  database2: {
    x: [1, 2, 3, 4],
    y: [16, 5, 11, 9],
    name: 'Database 2',
  },
  database3: {
    x: [1, 2, 3, 4],
    y: [12, 9, 15, 12],
    name: 'Database 3',
  },
};

const PlotlyDropdownChart: React.FC = () => {
  const [selected, setSelected] = useState<keyof typeof dataSets>('database1');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(e.target.value as keyof typeof dataSets);
  };

  const currentData = dataSets[selected];

  return (
    <div>
      <label htmlFor="dataset-select">Select Dataset: </label>
      <select id="dataset-select" onChange={handleChange} value={selected}>
        {Object.keys(dataSets).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>

      <Plot
        data={[{ type: 'scatter', mode: 'lines+markers', ...currentData }]}
        layout={{ title: `Plot for ${selected}` }}
        style={{ width: '100%', height: '400px' }}
      />
    </div>
  );
};

export default PlotlyDropdownChart;
