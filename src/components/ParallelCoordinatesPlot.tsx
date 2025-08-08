import React, { useState, useEffect } from "react";
import BrowserOnly from '@docusaurus/BrowserOnly';  // BrowserOnly importu
import * as Plotly from "plotly.js-dist";
import * as XLSX from "xlsx";

// Flexible type for each parsed Excel row
interface DataRow { 
  [key: string]: any; 
}

// Column headers - these will be used as axis labels
const colNames = [
  "x", "y", "z", "WWR",
  "Interior Shelf", "Interior Shelf Rotation Angle",
  "Interior Shelf Height (m)", "Interior Shelf Depth (m)",
  "Exterior Shelf", "Exterior Shelf Rotation Angle", 
  "Exterior Shelf Height (m)", "Exterior Shelf Depth (m)",
  "Cooling Load (kWh)", "Heating Load (kWh)",
  "UDI-a (%)", "Artificial Lighting Load (kWh)"
];

// Custom tick configuration based on actual data values
const customTicks: { [label: string]: number[] } = {
  "Interior Shelf": [0, 1],
  "Interior Shelf Rotation Angle": [-60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60],
  "Interior Shelf Height (m)": [1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5],
  "Interior Shelf Depth (m)": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
  "Exterior Shelf": [0, 1],
  "Exterior Shelf Rotation Angle": [-60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60],
  "Exterior Shelf Height (m)": [1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5],
  "Exterior Shelf Depth (m)": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
};

// Use Plotly's built-in Iris color palette
const irisColorScale = 'Viridis'; // Plotly built-in palette

const ParallelCoordinatesPlot: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataDF, setDataDF] = useState<DataRow[]>([]);
  const [dataPF, setDataPF] = useState<DataRow[]>([]);

  // Configuration options
  const widths = ["5"];
  const lengths = ["5", "7", "9"];
  const heights = ["3"];
  const wwrs = ["05", "09"];
  const datasets = ["Search Space", "Pareto Front", "Both"];

  const [selected, setSelected] = useState({ 
    width: "5", 
    length: "5", 
    height: "3", 
    wwr: "05",
    dataset: "Both"
  });

  const filename = `${selected.width}x${selected.length}x${selected.height}x${selected.wwr}.xlsx`;

  // Load Excel data when filename changes
  // Filter data based on selected dataset - show only one at a time
  let filteredData: DataRow[] = [];
  if (selected.dataset === "Search Space") {
    filteredData = dataDF;
  } else if (selected.dataset === "Pareto Front") {
    filteredData = dataPF;
  } else {
    // For "Both", still show them separately but you can modify this logic
    filteredData = [...dataDF, ...dataPF];
  }

  // Add index for coloring (from Excel row position)
  const merged = filteredData.map((d, i) => ({ ...d, excelIndex: i }));

  useEffect(() => {
    setLoading(true); 
    setError(null);

    fetch(`/excel/${filename}`)
      .then(res => { 
        if(!res.ok) throw new Error(`HTTP ${res.status}`); 
        return res.arrayBuffer(); 
      })
      .then(buffer => {
        const wb = XLSX.read(buffer, {type: "array"});
        const [s1, s2] = wb.SheetNames;
        
        // Read both sheets using the column names as headers
        const sheet1Data = XLSX.utils.sheet_to_json<DataRow>(wb.Sheets[s1], {
          header: colNames,
          range: 0,
          defval: null
        });

        const sheet2Data = XLSX.utils.sheet_to_json<DataRow>(wb.Sheets[s2], {
          header: colNames,
          range: 0,
          defval: null
        });

        setDataDF(sheet1Data);
        setDataPF(sheet2Data);
      })
      .catch(e => {
        console.error(e); 
        setError(e.message); 
        setDataDF([]); 
        setDataPF([]);
      })
      .finally(() => setLoading(false));
  }, [filename]);

  useEffect(() => {
    if (merged.length === 0) return;

    // Check if DOM element exists before creating plot
    const plotElement = document.getElementById('parallel-plot');
    if (!plotElement) return;

    // Create dimensions with proper labels and automatic ticks
    const dimensions = colNames.slice(4).map((label, dimIndex) => {
      const values = merged.map(row => {
        const val = row[label];
        return typeof val === 'number' ? val : Number(val) || 0;
      });
      
      const numericValues = values.filter(v => !isNaN(v));
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      
      // Check if we have custom ticks for this parameter
      if (customTicks[label]) {
        const tickvals = customTicks[label];
        
        // For categorical parameters, map data values to tick indices
        const mappedValues = values.map(val => {
          const numVal = typeof val === 'number' ? val : Number(val);
          // Find the closest tick value
          const closestTickIndex = tickvals.reduce((bestIdx, tick, idx) => {
            return Math.abs(tick - numVal) < Math.abs(tickvals[bestIdx] - numVal) ? idx : bestIdx;
          }, 0);
          return closestTickIndex;
        });
        
        return {
          label: label,
          values: mappedValues,
          range: [0, tickvals.length - 1],
          tickmode: 'array',
          tickvals: tickvals.map((_, idx) => idx),
          ticktext: tickvals.map(v => v.toString()),
          labelfont: { size: 10, family: 'Jost, sans-serif' },
          tickfont: { size: 9, family: 'Jost, sans-serif' },
          labelangle: -45, // Rotate labels to prevent overlap
          labelside: 'top'
        };
      }
      
      // For performance metrics, generate 10 rounded ticks
      const isPerformanceMetric = label.includes('(kWh)') || label.includes('(%)');
      if (isPerformanceMetric) {
        const tickCount = 10;
        const step = (max - min) / (tickCount - 1);
        const tickvals = [];
        
        for (let i = 0; i < tickCount; i++) {
          const tickVal = min + (step * i);
          if (label.includes('(%)')) {
            tickvals.push(Math.round(tickVal * 10) / 10);
          } else if (label.includes('(kWh)')) {
            tickvals.push(Math.round(tickVal / 50) * 50);
          }
        }
        
        return {
          label: label,
          values: values,
          range: [min, max],
          tickmode: 'array',
          tickvals: tickvals,
          ticktext: tickvals.map(v => v.toString()),
          labelfont: { size: 10, family: 'Jost, sans-serif' },
          tickfont: { size: 9, family: 'Jost, sans-serif' },
          labelangle: -45,
          labelside: 'top'
        };
      }
      
      // Default case for other parameters
      return {
        label: label,
        values: values,
        range: [min, max],
        tickformat: '.1f',
        labelfont: { size: 10, family: 'Jost, sans-serif' },
        tickfont: { size: 9, family: 'Jost, sans-serif' },
        labelangle: -45,
        labelside: 'top'
      };
    });

    // Create color array based on Excel row index
    const colors = merged.map((row, index) => row.excelIndex);
    const maxIndex = Math.max(...colors);

    const data: Plotly.Data[] = [{
      type: 'parcoords' as any,
      line: {
        color: colors,
        colorscale: irisColorScale,
        showscale: true,
        colorbar: {
          title: {
            text: 'Excel Row Index',
            font: { family: 'Jost, sans-serif', size: 12 }
          },
          tickfont: { family: 'Jost, sans-serif', size: 10 }
        },
        cmin: 0,
        cmax: maxIndex
      },
      dimensions: dimensions
    }];

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: `Building Performance Analysis - ${filename} (${selected.dataset})`,
        font: { size: 18, family: 'Jost, sans-serif' }
      },
      margin: { t: 120, l: 80, r: 80, b: 80 }, // Increased top margin for rotated labels
      font: { size: 12, family: 'Jost, sans-serif' },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff'
    };

    const config = {
      displayModeBar: true,
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d']
    };

    // Clean up any existing plot first
    try {
      Plotly.purge('parallel-plot');
    } catch (e) {
      // Ignore purge errors
    }

    // Create new plot
    Plotly.newPlot('parallel-plot', data, layout, config).catch(error => {
      console.error('Error creating Plotly chart:', error);
    });

    // Cleanup function
    return () => {
      try {
        const element = document.getElementById('parallel-plot');
        if (element) {
          Plotly.purge('parallel-plot');
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };

  }, [merged, filename, selected.dataset]);

  // Handle loading and error states after all hooks are defined
  if(loading) return <div className="p-4 font-jost">Loading Excel data...</div>;
  if(error) return <div className="p-4 text-red-600 font-jost">Error: {error}</div>;

  return (
    <div className="w-full space-y-4 font-jost">
      {/* Load Jost font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&display=swap');
        .font-jost { font-family: 'Jost', sans-serif; }
      `}</style>
      
      {/* Configuration Controls */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Building Configuration</h3>
        <div className="flex flex-row flex-nowrap gap-4 items-end">
          <div className="w-32">
            <label className="block text-sm font-medium mb-2 text-gray-700">Width</label>
            <select 
              value={selected.width}
              onChange={(e) => setSelected({...selected, width: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-jost bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {widths.map(w => <option key={w} value={w}>{w}m</option>)}
            </select>
          </div>
          
          <div className="w-32">
            <label className="block text-sm font-medium mb-2 text-gray-700">Length</label>
            <select 
              value={selected.length}
              onChange={(e) => setSelected({...selected, length: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-jost bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {lengths.map(l => <option key={l} value={l}>{l}m</option>)}
            </select>
          </div>
          
          <div className="w-32">
            <label className="block text-sm font-medium mb-2 text-gray-700">Height</label>
            <select 
              value={selected.height}
              onChange={(e) => setSelected({...selected, height: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-jost bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {heights.map(h => <option key={h} value={h}>{h}m</option>)}
            </select>
          </div>
          
          <div className="w-32">
            <label className="block text-sm font-medium mb-2 text-gray-700">WWR</label>
            <select 
              value={selected.wwr}
              onChange={(e) => setSelected({...selected, wwr: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-jost bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {wwrs.map(w => <option key={w} value={w}>{w === '05' ? '0.5' : '0.9'}</option>)}
            </select>
          </div>

          <div className="w-40">
            <label className="block text-sm font-medium mb-2 text-gray-700">Dataset</label>
            <select 
              value={selected.dataset}
              onChange={(e) => setSelected({...selected, dataset: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-jost bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {datasets.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Plot Container */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div id="parallel-plot" style={{ width: '100%', height: '600px' }}></div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <h4 className="font-semibold mb-3 text-gray-800">Dataset Information</h4>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded shadow-sm"></div>
            <span className="text-gray-700">
              {selected.dataset === "Search Space" ? `Search Space (${dataDF.length} points)` :
               selected.dataset === "Pareto Front" ? `Pareto Front (${dataPF.length} points)` :
               `Combined Data (${dataDF.length + dataPF.length} points)`}
            </span>
          </div>
          <div className="text-gray-600">
            <span>Colors represent Excel row indices using Viridis color scale</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParallelCoordinatesPlot;
