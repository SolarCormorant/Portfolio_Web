// Excel verilerini işlemek için yardımcı fonksiyonlar

export interface ExcelColumn {
  date: string;
  hour: number;
  columnIndex: number;
  header: string;
}

export interface MeshVertex {
  x: number;
  y: number;
  z: number;
}

export interface MeshFace {
  i: number;
  j: number;
  k: number;
}

/**
 * Excel sütun başlıklarını parse eder
 * Örnek: "19 Mar 08:00" -> { date: "19 Mar", hour: 8 }
 */
export const parseExcelHeaders = (headers: string[]): ExcelColumn[] => {
  const columns: ExcelColumn[] = [];
  
  headers.forEach((header, index) => {
    const trimmedHeader = header.trim();
    
    // "19 Mar 08:00" formatını parse et
    const match = trimmedHeader.match(/^(\d{1,2}\s+\w{3})\s+(\d{2}):00$/);
    
    if (match) {
      const date = match[1];
      const hour = parseInt(match[2]);
      
      columns.push({
        date,
        hour,
        columnIndex: index,
        header: trimmedHeader
      });
    }
  });
  
  return columns;
};

/**
 * Belirli tarih aralığı ve saat aralığındaki sütunları filtreler
 */
export const filterColumnsByDateAndHour = (
  columns: ExcelColumn[],
  startDate: string,
  endDate: string,
  startHour: number,
  endHour: number
): ExcelColumn[] => {
  const availableDates = ["19 Mar", "20 Mar", "21 Mar", "22 Mar", "23 Mar", "24 Mar", "25 Mar"];
  
  const startDateIndex = availableDates.indexOf(startDate);
  const endDateIndex = availableDates.indexOf(endDate);
  
  if (startDateIndex === -1 || endDateIndex === -1) {
    return [];
  }
  
  return columns.filter(col => {
    const dateIndex = availableDates.indexOf(col.date);
    const inDateRange = dateIndex >= startDateIndex && dateIndex <= endDateIndex;
    const inHourRange = col.hour >= startHour && col.hour <= endHour;
    
    return inDateRange && inHourRange;
  });
};

/**
 * Belirli sütunlardaki verilerin ortalamasını hesaplar
 */
export const calculateAverageIntensity = (
  data: number[][],
  columnIndices: number[]
): number[] => {
  if (!data || data.length === 0 || columnIndices.length === 0) {
    return [];
  }
  
  const averages: number[] = [];
  
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    let sum = 0;
    let count = 0;
    
    for (const colIndex of columnIndices) {
      if (colIndex < row.length && !isNaN(row[colIndex])) {
        sum += row[colIndex];
        count++;
      }
    }
    
    averages.push(count > 0 ? sum / count : 0);
  }
  
  return averages;
};

/**
 * OBJ dosya içeriğini parse eder
 */
export const parseOBJFile = (objContent: string): { vertices: MeshVertex[], faces: MeshFace[] } => {
  const vertices: MeshVertex[] = [];
  const faces: MeshFace[] = [];
  
  const lines = objContent.split('\n');
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length === 0) continue;
    
    if (parts[0] === 'v' && parts.length >= 4) {
      // Vertex verisi
      vertices.push({
        x: parseFloat(parts[1]),
        y: parseFloat(parts[2]),
        z: parseFloat(parts[3])
      });
    } else if (parts[0] === 'f' && parts.length >= 4) {
      // Face verisi (üçgen)
      const faceIndices = parts.slice(1, 4).map(idx => {
        // OBJ dosyalarında indeksler 1'den başlar, 0'a çevir
        return parseInt(idx.split('/')[0]) - 1;
      });
      
      faces.push({
        i: faceIndices[0],
        j: faceIndices[1],
        k: faceIndices[2]
      });
    }
  }
  
  return { vertices, faces };
};

/**
 * Excel dosyasını CSV olarak parse eder
 */
export const parseCSVData = (csvContent: string): { headers: string[], data: number[][] } => {
  const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { headers: [], data: [] };
  }
  
  // İlk satır başlıklar
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Veri satırları
  const data: number[][] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const numericRow = row.slice(1).map(cell => {
      const num = parseFloat(cell.trim());
      return isNaN(num) ? 0 : num;
    });
    
    if (numericRow.length > 0) {
      data.push(numericRow);
    }
  }
  
  return { headers: headers.slice(1), data }; // İlk sütun genelde index olduğu için atla
};

/**
 * Intensity değerlerini normalize eder (0-1 aralığına)
 */
export const normalizeIntensity = (values: number[]): number[] => {
  if (values.length === 0) return [];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) {
    return values.map(() => 0.5); // Tüm değerler aynıysa ortada bir değer ver
  }
  
  return values.map(val => (val - min) / range);
};

/**
 * Test verisi oluşturur
 */
export const generateTestData = (rowCount: number, colCount: number): number[][] => {
  const data: number[][] = [];
  
  for (let i = 0; i < rowCount; i++) {
    const row: number[] = [];
    for (let j = 0; j < colCount; j++) {
      // UTCI değerleri genelde -40 ile +50 arasında
      row.push(Math.random() * 90 - 40);
    }
    data.push(row);
  }
  
  return data;
};

/**
 * Test OBJ verisi oluşturur (basit küp)
 */
export const generateTestOBJ = (): string => {
  return `# Test cube
v -1.0 -1.0  1.0
v  1.0 -1.0  1.0
v  1.0  1.0  1.0
v -1.0  1.0  1.0
v -1.0 -1.0 -1.0
v  1.0 -1.0 -1.0
v  1.0  1.0 -1.0
v -1.0  1.0 -1.0

f 1 2 3
f 1 3 4
f 2 6 7
f 2 7 3
f 6 5 8
f 6 8 7
f 5 1 4
f 5 4 8
f 4 3 7
f 4 7 8
f 5 6 2
f 5 2 1`;
};