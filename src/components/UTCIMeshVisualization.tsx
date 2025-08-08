import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Plotly from 'plotly.js-dist';

interface UTCIMeshVisualizationProps {
  excelData?: number[][]; // Excel verisi - satırlar x sütunlar
  objMeshData?: string; // OBJ dosya içeriği
  defaultDate?: string; // Varsayılan tarih (örn: "19 Mar")
  defaultHour?: number; // Varsayılan saat (8-22)
  onSelectionChange?: (selectedDate: string, selectedHour: number, intensity: number[]) => void;
}

// Tarih listesi - 19 Mar'dan 25 Mar'a kadar
const availableDates = [
  "19 Mar", "20 Mar", "21 Mar", "22 Mar", "23 Mar", "24 Mar", "25 Mar"
];

// Saat aralığı - 08:00'dan 22:00'a kadar
const availableHours = Array.from({ length: 15 }, (_, i) => i + 8); // 8-22

interface MeshData {
  vertices: number[][];
  faces: number[][];
}

const UTCIMeshVisualization: React.FC<UTCIMeshVisualizationProps> = ({
  excelData = [],
  objMeshData = "",
  defaultDate = "19 Mar",
  defaultHour = 9,
  onSelectionChange,
}) => {
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedHour, setSelectedHour] = useState(defaultHour);
  const [meshData, setMeshData] = useState<MeshData | null>(null);
  const [intensityData, setIntensityData] = useState<number[]>([]);
  const plotRef = useRef<HTMLDivElement>(null);

  // OBJ verilerini parse et
  const parseObjData = useCallback((objContent: string): MeshData => {
    const vertices: number[][] = [];
    const faces: number[][] = [];

    const lines = objContent.split('\n');
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length === 0) continue;

      if (parts[0] === 'v') {
        // Vertex verisi
        const vertex = [
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        ];
        vertices.push(vertex);
      } else if (parts[0] === 'f') {
        // Face verisi
        const face = parts.slice(1).map(idx => {
          // OBJ dosyalarında indeksler 1'den başlar, 0'a çevir
          return parseInt(idx.split('/')[0]) - 1;
        });
        
        // Sadece üçgen yüzleri al
        if (face.length >= 3) {
          faces.push(face.slice(0, 3));
        }
      }
    }

    return { vertices, faces };
  }, []);

  // Excel verisinden intensity değerlerini hesapla
  const calculateIntensity = useCallback((date: string, hour: number): number[] => {
    if (!excelData || excelData.length === 0) {
      // Test verisi oluştur
      return Array.from({ length: 100 }, () => Math.random() * 40 + 10); // 10-50 arası random değerler
    }

    // Sütun başlığını oluştur
    const columnHeader = `${date} ${hour.toString().padStart(2, '0')}:00`;
    
    // Bu örnekte, sütun indeksini tarih ve saate göre hesaplıyoruz
    // Gerçek implementasyonda, Excel başlıklarını parse etmeniz gerekecek
    const dateIndex = availableDates.indexOf(date);
    const hourIndex = availableHours.indexOf(hour);
    const columnIndex = dateIndex * availableHours.length + hourIndex;

    if (columnIndex < excelData[0]?.length) {
      // İlgili sütundan değerleri al
      return excelData.map(row => row[columnIndex] || 0);
    }

    // Varsayılan değerler
    return Array.from({ length: excelData.length }, () => 25);
  }, [excelData]);

  // Mesh'i çiz
  const renderMesh = useCallback(() => {
    if (!plotRef.current || !meshData) return;

    const intensity = calculateIntensity(selectedDate, selectedHour);
    setIntensityData(intensity);

    const trace = {
      type: 'mesh3d' as const,
      x: meshData.vertices.map(v => v[0]),
      y: meshData.vertices.map(v => v[1]),
      z: meshData.vertices.map(v => v[2]),
      i: meshData.faces.map(f => f[0]),
      j: meshData.faces.map(f => f[1]),
      k: meshData.faces.map(f => f[2]),
      intensity: intensity,
      colorscale: 'Viridis',
      showscale: true,
      colorbar: {
        title: 'UTCI Value',
        titleside: 'right'
      }
    };

    const layout = {
      scene: {
        aspectmode: 'data' as const,
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.5 }
        }
      },
      autosize: true,
      margin: { l: 0, r: 0, b: 0, t: 0 }
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false
    };

    Plotly.newPlot(plotRef.current, [trace], layout, config);

    // Callback'i çağır
    if (onSelectionChange) {
      onSelectionChange(selectedDate, selectedHour, intensity);
    }
  }, [meshData, selectedDate, selectedHour, calculateIntensity, onSelectionChange]);

  // OBJ verilerini parse et
  useEffect(() => {
    if (objMeshData) {
      const parsed = parseObjData(objMeshData);
      setMeshData(parsed);
    }
  }, [objMeshData, parseObjData]);

  // Mesh'i yeniden çiz
  useEffect(() => {
    renderMesh();
  }, [renderMesh]);

  // Tarih değişikliği
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateIndex = parseInt(event.target.value);
    setSelectedDate(availableDates[dateIndex]);
  };

  // Saat değişikliği
  const handleHourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const hour = parseInt(event.target.value);
    setSelectedHour(hour);
  };

  return (
    <div style={{ width: '100%', height: '700px' }}>
      {/* Kontrol Paneli */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#495057' }}>
          UTCI Mesh Visualization Controls
        </h3>
        
        {/* Tarih Slider */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold', 
            color: '#495057' 
          }}>
            Date: {selectedDate}
          </label>
          <input
            type="range"
            min="0"
            max={availableDates.length - 1}
            value={availableDates.indexOf(selectedDate)}
            onChange={handleDateChange}
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#ddd',
              outline: 'none',
              borderRadius: '3px'
            }}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '12px', 
            color: '#6c757d',
            marginTop: '5px'
          }}>
            <span>{availableDates[0]}</span>
            <span>{availableDates[availableDates.length - 1]}</span>
          </div>
        </div>

        {/* Saat Slider */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold', 
            color: '#495057' 
          }}>
            Hour: {selectedHour}:00
          </label>
          <input
            type="range"
            min={availableHours[0]}
            max={availableHours[availableHours.length - 1]}
            value={selectedHour}
            onChange={handleHourChange}
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#ddd',
              outline: 'none',
              borderRadius: '3px'
            }}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '12px', 
            color: '#6c757d',
            marginTop: '5px'
          }}>
            <span>{availableHours[0]}:00</span>
            <span>{availableHours[availableHours.length - 1]}:00</span>
          </div>
        </div>

        {/* Bilgi Paneli */}
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>Current Selection:</strong> {selectedDate} at {selectedHour}:00
          {intensityData.length > 0 && (
            <span style={{ marginLeft: '20px' }}>
              <strong>Values:</strong> {Math.min(...intensityData).toFixed(1)} - {Math.max(...intensityData).toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* 3D Görselleştirme */}
      <div 
        ref={plotRef} 
        style={{ 
          width: '100%', 
          height: '500px',
          border: '1px solid #dee2e6',
          borderRadius: '8px'
        }}
      />
    </div>
  );
};

export default UTCIMeshVisualization;