import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import type { PlotSelectionEvent } from 'plotly.js';
import * as XLSX from "xlsx";

// Excel dosyasındaki sütun adları
const colNames = [
  "x", "y", "z", "WWR", "Interior Shelf", "Interior Shelf Rotation Angle",
  "Interior Shelf Height (m)", "Interior Shelf Depth (m)", "Exterior Shelf",
  "Exterior Shelf Rotation Angle", "Exterior Shelf Height (m) ",
  "Exterior Shelf Depth (m)", "Cooling Load (kWh)", "Heating Load (kWh)",
  "UDI-a (%)", "Artificial Lighting Load (kWh)",
];

// Veri satırı için arayüz
interface DataRow {
  [key: string]: any;
}

// Tüm grafikler için tek bir bileşen
const InteractivePlots: React.FC = () => {
  const [dataDF, setDataDF] = useState<DataRow[]>([]);
  const [dataPF, setDataPF] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Dropdown seçenekleri
  const widths = ["5"];
  const lengths = ["5", "7", "9"];
  const heights = ["3"];
  const wwrs = ["05", "09"];
  const outputs = [
    "Cooling Load (kWh)", "Heating Load (kWh)", "UDI-a (%)", "Artificial Lighting Load (kWh)",
  ];

  // Seçili değerlerin state'i
  const [selected, setSelected] = useState({
    width: "5",
    length: "9",
    height: "3",
    wwr: "09",
    output: "Heating Load (kWh)",
  });

  // Seçimlere göre dosya adını oluştur
  const filename = `${selected.width}x${selected.length}x${selected.height}x${selected.wwr}.xlsx`;

  // Dosya değiştiğinde veriyi yeniden çek
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/excel/${filename}`);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const dfSheet = workbook.Sheets['df'];
        const pfSheet = workbook.Sheets['pf'];

        const dfJson = XLSX.utils.sheet_to_json<DataRow>(dfSheet, { header: colNames, range: 1, defval: "" });
        const pfJson = XLSX.utils.sheet_to_json<DataRow>(pfSheet, { header: colNames, range: 1, defval: "" });

        setDataDF(dfJson);
        setDataPF(pfJson);
        setSelectedIndices([]);
      } catch (error) {
        console.error("Excel dosyası yüklenirken hata oluştu:", error);
        setDataDF([]);
        setDataPF([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filename]);

  // Dropdown'ların stil özellikleri
  const selectStyle: React.CSSProperties = {
    fontFamily: 'Jost, sans-serif',
    fontSize: '1rem',
    padding: '0.25rem 1rem',
    marginRight: '1rem',
    lineHeight: '1.2',
  };

  // Paralel koordinatlar grafiğindeki seçimi işleyen fonksiyon
  const handleParcoordsSelect = (eventData: PlotSelectionEvent | null) => {
    if (eventData && eventData.points.length > 0) {
      const indices = eventData.points.map(p => p.pointIndex);
      setSelectedIndices(indices);
    } else {
      setSelectedIndices([]);
    }
  };

  // --- GRAFİK VERİLERİNİ HAZIRLAMA ---

  const transparentLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };

  // 1. Paralel Koordinatlar Grafiği
  const parcoordsDimensions = [
    "Interior Shelf", "Interior Shelf Rotation Angle", "Interior Shelf Height (m)",
    "Interior Shelf Depth (m)", "Exterior Shelf", "Exterior Shelf Rotation Angle",
    "Exterior Shelf Height (m) ", "Exterior Shelf Depth (m)", "Cooling Load (kWh)",
    "Heating Load (kWh)", "UDI-a (%)", "Artificial Lighting Load (kWh)",
  ].map(key => ({
    label: key,
    values: dataDF.map(d => d[key]),
  }));

  const parcoordsData = [{
    type: 'parcoords',
    line: {
      color: dataDF.map(d => d['UDI-a (%)']),
      colorscale: 'tealrose',
      showscale: true,
      colorbar: { title: 'UDI-a (%)' }
    },
    dimensions: parcoordsDimensions,
  }];

  // Seçime göre işaretleyici stillerini hesapla (daha belirgin fark)
  const createMarkerStyles = (data: DataRow[]) => {
    const isSelectionActive = selectedIndices.length > 0;
    const sizes = data.map((_, index) => isSelectionActive ? (selectedIndices.includes(index) ? 10 : 3) : 6);
    const opacities = data.map((_, index) => isSelectionActive ? (selectedIndices.includes(index) ? 1.0 : 0.2) : 0.8);
    const lineStyles = data.map((_, index) => ({
        color: isSelectionActive && selectedIndices.includes(index) ? 'black' : 'rgba(0,0,0,0)',
        width: isSelectionActive && selectedIndices.includes(index) ? 2 : 0,
    }));
    return { sizes, opacities, lineStyles };
  };

  const dfMarkerStyles = createMarkerStyles(dataDF);

  // 2. 3D Dağılım Grafiği (DİNAMİK İŞARETLEYİCİLERLE)
  const hoverTemplate = "Cooling: %{x} kWh<br>Heating: %{y} kWh<br>Light: %{z} kWh<br>UDI-a: %{customdata}%";
  
  const scatter3dData = [
    {
      name: 'Search Space',
      type: "scatter3d",
      mode: "markers",
      x: dataDF.map(d => d["Cooling Load (kWh)"]),
      y: dataDF.map(d => d["Heating Load (kWh)"]),
      z: dataDF.map(d => d["Artificial Lighting Load (kWh)"]),
      customdata: dataDF.map(d => d["UDI-a (%)"]),
      hovertemplate: hoverTemplate,
      marker: {
        symbol: 'square',
        color: dataDF.map(d => d["UDI-a (%)"]),
        colorscale: "tealrose_r",
        colorbar: { title: { text: 'UDI-a (%)' } },
        size: dfMarkerStyles.sizes,
        opacity: dfMarkerStyles.opacities,
        line: { // Seçilenlere çerçeve ekle
            color: dfMarkerStyles.lineStyles.map(l => l.color),
            width: dfMarkerStyles.lineStyles.map(l => l.width),
        }
      },
      showscale: true,
    },
    {
      name: 'Pareto Front',
      type: "scatter3d",
      mode: "markers",
      x: dataPF.map(d => d["Cooling Load (kWh)"]),
      y: dataPF.map(d => d["Heating Load (kWh)"]),
      z: dataPF.map(d => d["Artificial Lighting Load (kWh)"]),
      customdata: dataPF.map(d => d["UDI-a (%)"]),
      hovertemplate: hoverTemplate,
      marker: {
        symbol: 'cross',
        color: 'red',
        size: 6
      },
    }
  ];

  // 3. 2D Dağılım Alt Grafikleri (BAĞLANTILI)
  const otherOutputs = outputs.filter(o => o !== selected.output);
  const scatter2dTraces = [];
  
  otherOutputs.forEach((yAxis, index) => {
      // Tüm veri seti için iz
      scatter2dTraces.push({
          x: dataDF.map(d => d[selected.output]),
          y: dataDF.map(d => d[yAxis]),
          xaxis: `x${index + 1}`,
          yaxis: `y${index + 1}`,
          mode: 'markers',
          type: 'scatter',
          name: `Tüm Veri Seti`,
          marker: { 
              color: 'blue', 
              size: dfMarkerStyles.sizes, 
              opacity: dfMarkerStyles.opacities,
              line: {
                  color: dfMarkerStyles.lineStyles.map(l => l.color),
                  width: dfMarkerStyles.lineStyles.map(l => l.width),
              }
          }
      });
      // Pareto seti için iz
      scatter2dTraces.push({
          x: dataPF.map(d => d[selected.output]),
          y: dataPF.map(d => d[yAxis]),
          xaxis: `x${index + 1}`, // Aynı alt grafikte göster
          yaxis: `y${index + 1}`,
          mode: 'markers',
          type: 'scatter',
          name: `Pareto Seti`,
          marker: { color: 'red', size: 6 }
      });
  });
  
  const scatter2dLayout = {
      ...transparentLayout,
      title: `<b>${selected.output}</b> ve Diğer Metriklerin Karşılaştırması`,
      grid: { rows: 1, columns: 3, pattern: 'independent' }, // Tek satırda 3 grafik
      showlegend: true,
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.25 }
  };
  otherOutputs.forEach((yAxis, i) => {
      scatter2dLayout[`xaxis${i + 1}`] = { title: selected.output, ...transparentLayout };
      scatter2dLayout[`yaxis${i + 1}`] = { title: yAxis, ...transparentLayout };
  });

  if (loading) return <p>Grafikler yükleniyor...</p>;
  if (!dataDF.length || !dataPF.length) return <p>Seçilen parametreler için veri bulunamadı. Lütfen {filename} dosyasının `static/excel` klasöründe olduğundan emin olun.</p>;

  return (
    <div>
      {/* Kontrol Menüsü */}
      <div style={{ display: "flex", flexWrap: 'wrap', gap: "1rem", marginBottom: "2rem", alignItems: 'center' }}>
        <select style={selectStyle} value={selected.width} onChange={e => setSelected(p => ({ ...p, width: e.target.value }))}>{widths.map(w => <option key={w} value={w}>Genişlik: {w} m</option>)}</select>
        <select style={selectStyle} value={selected.length} onChange={e => setSelected(p => ({ ...p, length: e.target.value }))}>{lengths.map(l => <option key={l} value={l}>Derinlik: {l} m</option>)}</select>
        <select style={selectStyle} value={selected.height} onChange={e => setSelected(p => ({ ...p, height: e.target.value }))}>{heights.map(h => <option key={h} value={h}>Yükseklik: {h} m</option>)}</select>
        <select style={selectStyle} value={selected.wwr} onChange={e => setSelected(p => ({ ...p, wwr: e.target.value }))}>{wwrs.map(w => <option key={w} value={w}>WWR: {w}</option>)}</select>
        <select style={selectStyle} value={selected.output} onChange={e => setSelected(p => ({ ...p, output: e.target.value }))}>{outputs.map(o => <option key={o} value={o}>{o}</option>)}</select>
      </div>
      <hr />

      {/* Grafik 1: Paralel Koordinatlar */}
      <h3>Tasarım Parametreleri ve Performans İlişkileri (Seçim Yapılabilir)</h3>
      <Plot
        data={parcoordsData}
        layout={{
          title: 'Paralel Koordinatlar Grafiği',
          ...transparentLayout,
          margin: { t: 60, l: 60, r: 60, b: 60 },
        }}
        useResizeHandler
        style={{ width: "100%", height: "500px" }}
        config={{ responsive: true, displaylogo: false }}
        onSelected={handleParcoordsSelect}
        onDeselect={() => setSelectedIndices([])}
      />
      
      <hr />
      
      {/* Grafik 2: 3D Dağılım (BAĞLANTILI) */}
      <h3>Performans Metrikleri Arasındaki İlişki (3D)</h3>
      <Plot
        data={scatter3dData}
        layout={{
          title: 'Enerji ve Gün Işığı Performansı',
          autosize: true,
          ...transparentLayout,
          margin: { t: 60, l: 0, r: 0, b: 0 },
          scene: {
            bgcolor: 'rgba(0,0,0,0)',
            xaxis: { title: { text: "Soğutma Yükü (kWh)" }, ...transparentLayout },
            yaxis: { title: { text: "Isıtma Yükü (kWh)" }, ...transparentLayout },
            zaxis: { title: { text: "Aydınlatma Yükü (kWh)" }, ...transparentLayout },
          },
          legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1 }
        }}
        useResizeHandler
        style={{ width: "100%", height: "600px" }}
        config={{ responsive: true, displaylogo: false }}
      />
      
      <hr />

      {/* Grafik 3: 2D Dağılım Alt Grafikleri (BAĞLANTILI) */}
      <h3>Seçilen Çıktıya Göre Diğer Metriklerin Dağılımı</h3>
      <Plot
          data={scatter2dTraces}
          layout={scatter2dLayout}
          useResizeHandler
          style={{ width: "100%", height: "500px" }}
          config={{ responsive: true, displaylogo: false }}
      />
    </div>
  );
};

export default InteractivePlots;
