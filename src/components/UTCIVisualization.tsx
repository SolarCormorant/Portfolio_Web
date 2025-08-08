import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import DomainSlider from '@site/src/components/DomainSlider';
import '@site/src/components/DomainSlider.css';

declare global { interface Window { Plotly: any; } }

interface MeshData { vertices: number[][]; faces: number[][]; }

const dateRange = { start: 19, end: 25, month: 'Mar' };
const hourRange = { start: 8, end: 22 };
const availableDates = Array.from({ length: dateRange.end - dateRange.start + 1 }, (_, i) => dateRange.start + i);
const availableHours = Array.from({ length: hourRange.end - hourRange.start + 1 }, (_, i) => hourRange.start + i);

const App: FC = () => {
  const [dateRangeSelection, setDateRangeSelection] = useState<[number, number]>([0, availableDates.length - 1]);
  const [hourRangeSelection, setHourRangeSelection] = useState<[number, number]>([0, availableHours.length - 1]);
  const [meshData, setMeshData] = useState<MeshData | null>(null);
  const [contextMesh, setContextMesh] = useState<MeshData | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.Plotly) setPlotlyLoaded(true);
    else {
      const script = document.createElement('script');
      script.src = 'https://cdn.plot.ly/plotly-2.26.0.min.js';
      script.onload = () => setPlotlyLoaded(true);
      script.onerror = () => setError('Plotly yüklenemedi.');
      document.head.appendChild(script);
    }
  }, []);

  const parseOBJ = useCallback((content: string): MeshData => {
    const vertices: number[][] = [];
    const faces: number[][] = [];
    content.split('\n').forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'v') vertices.push([+parts[1], +parts[2], +parts[3]]);
      else if (parts[0] === 'f') faces.push(parts.slice(1, 4).map(p => parseInt(p.split('/')[0], 10) - 1));
    });
    return { vertices, faces };
  }, []);

  const parseCSV = useCallback((content: string) => {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) { setError('CSV verisi geçersiz.'); return; }
    setHeaders(lines[0].split(',').map(h => h.trim()));
    setCsvData(lines.slice(1).map(l => l.split(',').map(c => c.trim())));
  }, []);

  const calculateDomainAverageIntensity = useCallback((): number[] => {
    if (!csvData.length || !headers.length || !meshData) return [];
    const dates = availableDates.slice(dateRangeSelection[0], dateRangeSelection[1] + 1);
    const hours = availableHours.slice(hourRangeSelection[0], hourRangeSelection[1] + 1);
    const cols: number[] = [];
    dates.forEach(d => hours.forEach(h => {
      const key = `${d} ${dateRange.month} ${h.toString().padStart(2, '0')}:00`;
      const idx = headers.indexOf(key);
      if (idx >= 0) cols.push(idx);
    }));
    if (!cols.length) return Array(meshData.faces.length).fill(25);
    return csvData.map(row => {
      const vals = cols.map(i => isNaN(+row[i]) ? 25 : +row[i]);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
  }, [csvData, headers, meshData, dateRangeSelection, hourRangeSelection]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      let mainMesh: MeshData;
      try {
        const res = await fetch('/data/utci.obj');
        if (!res.ok) throw new Error();
        mainMesh = parseOBJ(await res.text());
      } catch {
        mainMesh = {
          vertices: [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],
          faces: [[0,1,2],[0,2,3],[4,7,6],[4,6,5],[0,4,5],[0,5,1],[2,6,7],[2,7,3],[0,3,7],[0,7,4],[1,5,6],[1,6,2]]
        };
      }
      setMeshData(mainMesh);
      try {
        const res2 = await fetch('/data/context.obj');
        if (res2.ok) setContextMesh(parseOBJ(await res2.text()));
      } catch { setContextMesh(null); }
      try {
        const res3 = await fetch('/data/utci.csv');
        if (res3.ok) parseCSV(await res3.text());
      } catch {
        const hdrs: string[] = [];
        availableDates.forEach(d => availableHours.forEach(h => hdrs.push(`${d} ${dateRange.month} ${h.toString().padStart(2,'0')}:00`)));
        setHeaders(hdrs);
        setCsvData(Array.from({ length: mainMesh.faces.length }, () => hdrs.map(() => (20 + Math.random()*10).toFixed(1))));
      }
      setIsLoading(false);
    })();
  }, [parseOBJ, parseCSV]);

  useEffect(() => {
    (async () => {
      if (isLoading || !plotlyLoaded || !plotRef.current || !meshData || !window.Plotly) return;

      // Preserve camera from previous render
      const gd = plotRef.current;
      const prevLayout = gd._fullLayout as any;
      const prevCam = prevLayout?.scene?.camera;

      const intensity = calculateDomainAverageIntensity();

      const trace = {
        type: 'mesh3d',
        x: meshData.vertices.map(v => v[0]),
        y: meshData.vertices.map(v => v[1]),
        z: meshData.vertices.map(v => v[2]),
        i: meshData.faces.map(f => f[0]),
        j: meshData.faces.map(f => f[1]),
        k: meshData.faces.map(f => f[2]),
        intensity,
        intensitymode: 'cell',
        colorscale: 'Electric',
        cmin: 20,
        cmax: 40,
        showscale: false,
        hovertemplate: 'UTCI: %{intensity:.2f}°C<extra></extra>'
      };

      let dataTraces = [trace];
      if (contextMesh) {
        const contextTrace = {
          type: 'mesh3d',
          x: contextMesh.vertices.map(v => v[0]),
          y: contextMesh.vertices.map(v => v[1]),
          z: contextMesh.vertices.map(v => v[2]),
          i: contextMesh.faces.map(f => f[0]),
          j: contextMesh.faces.map(f => f[1]),
          k: contextMesh.faces.map(f => f[2]),
          color: 'gold',
          opacity: 1,
          showscale: false,
          hoverinfo: 'skip'
        };
        dataTraces.push(contextTrace);
      }

      const layout = {
        scene: {
          xaxis: { visible: false },
          yaxis: { visible: false },
          zaxis: { visible: false },
          aspectmode: 'data',
          camera: prevCam ?? { eye: { x: 1.5, y: 1.5, z: 1.5 } }
        },
        margin: { l: 0, r: 0, b: 0, t: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
      };

      await window.Plotly.newPlot(gd, dataTraces, layout, { responsive: true });
    })();
  }, [isLoading, plotlyLoaded, meshData, contextMesh, calculateDomainAverageIntensity, dateRangeSelection, hourRangeSelection]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {error && <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6 rounded"><strong>Hata:</strong> {error}</div>}
        <div className="bg-white p-6 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <DomainSlider min={0} max={availableDates.length - 1} step={1} label="Date Range" onChange={setDateRangeSelection} />
            <div className="mt-2 text-blue-600">{availableDates[dateRangeSelection[0]]} - {availableDates[dateRangeSelection[1]]} {dateRange.month}</div>
          </div>
          <div>
            <DomainSlider min={0} max={availableHours.length - 1} step={1} label="Hour Range" onChange={setHourRangeSelection} />
            <div className="mt-2 text-blue-600">{availableHours[hourRangeSelection[0]]}:00 - {availableHours[hourRangeSelection[1]]}:00</div>
          </div>
        </div>
        <div className="bg-white rounded shadow p-2">
          <div ref={plotRef} className="w-full h-[600px]" />
        </div>
      </div>
    </div>
  );
};

export default App;
