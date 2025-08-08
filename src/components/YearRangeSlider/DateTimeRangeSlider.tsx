// src/components/AnnualDomainSlider.tsx

import React, { useState, useCallback } from 'react';
import styles from './styles.module.css'; // Stil dosyasının yolu doğru olduğundan emin olun

interface AnnualDomainSliderProps {
  defaultDay?: number; // Yılın kaçıncı günü (1-365)
  defaultHour?: number; // Günün kaçıncı saati (0-23)
  onSelectionChange?: (selectedDay: number, selectedHour: number) => void;
  showCurrentValues?: boolean;
  minHour?: number;
  maxHour?: number;
}

const AnnualDomainSlider: React.FC<AnnualDomainSliderProps> = ({
  defaultDay = 1,
  defaultHour = 9,
  onSelectionChange,
  showCurrentValues = true,
  minHour = 0,
  maxHour = 23,
}) => {
  // Tekil Gün ve Saat durumları
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [selectedHour, setSelectedHour] = useState(defaultHour);

  const maxDaysInYear = 365; // Artık yılları şimdilik hesaba katmıyoruz

  // Yılın n. gününü tarihe çeviren yardımcı fonksiyon
  const dayOfYearToDate = (dayOfYear: number): string => {
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    let remainingDays = dayOfYear;
    let monthIndex = 0;

    // Ayı ve günü bul
    while (remainingDays > monthDays[monthIndex] && monthIndex < 11) {
      remainingDays -= monthDays[monthIndex];
      monthIndex++;
    }
    
    // Geçersiz gün değeri durumunda basit bir kontrol
    if (remainingDays <= 0) remainingDays = 1;

    return `${remainingDays} ${monthNames[monthIndex]}`;
  };

  // Saati HH:00 formatına çeviren yardımcı fonksiyon
  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Gün seçimi değişim yöneticisi
  const handleDayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setSelectedDay(value);
    onSelectionChange?.(value, selectedHour); // Seçilen gün ve saati bildir
  }, [selectedHour, onSelectionChange]);

  // Saat seçimi değişim yöneticisi
  const handleHourChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setSelectedHour(value);
    onSelectionChange?.(selectedDay, value); // Seçilen gün ve saati bildir
  }, [selectedDay, onSelectionChange]);

  // Yüzde hesaplamaları - Gün için (tek bir başparmak olduğu için)
  const getDayPercentage = () => ((selectedDay - 1) / (maxDaysInYear - 1)) * 100;

  // Yüzde hesaplamaları - Saat için (tek bir başparmak olduğu için)
  const getHourPercentage = () => ((selectedHour - minHour) / (maxHour - minHour)) * 100;

  return (
    <div className={styles.container}>
      {showCurrentValues && (
        <div className={styles.currentValues}>
          <h3>Seçilen Tarih ve Saat</h3>
          <p className={styles.highlight}>
            **{dayOfYearToDate(selectedDay)}** (Gün {selectedDay})
          </p>
          <p className={styles.highlight}>
            Saat: **{formatHour(selectedHour)}**
          </p>
        </div>
      )}

      ---

      {/* Gün Seçim Slider */}
      <div className={styles.sliderSection}>
        <h4>Yıl İçinde Gün Seçimi</h4>
        <div className={styles.sliderContainer}>
          <div className={styles.sliderWrapper}>
            <div className={styles.sliderTrack}>
              {/* Tek bir başparmak olduğu için, başparmağın solundaki dolgu */}
              <div
                className={`${styles.sliderFill} ${styles.dayFill}`}
                style={{ width: `${getDayPercentage()}%` }}
              />
            </div>

            {/* Tekli gün kaydırıcısı */}
            <input
              type="range"
              min="1"
              max={maxDaysInYear}
              value={selectedDay}
              onChange={handleDayChange}
              className={`${styles.slider} ${styles.singleSlider}`}
              aria-label="Seçilen gün"
            />
          </div>

          <div className={styles.dayLabels}>
            <span>1 Ocak</span>
            <span>1 Nisan</span>
            <span>1 Temmuz</span>
            <span>1 Ekim</span>
            <span>31 Aralık</span>
          </div>
        </div>
      </div>

      ---

      {/* Saat Seçim Slider */}
      <div className={styles.sliderSection}>
        <h4>Gün İçinde Saat Seçimi</h4>
        <div className={styles.sliderContainer}>
          <div className={styles.sliderWrapper}>
            <div className={styles.sliderTrack}>
              {/* Tek bir başparmak olduğu için, başparmağın solundaki dolgu */}
              <div
                className={`${styles.sliderFill} ${styles.hourFill}`}
                style={{ width: `${getHourPercentage()}%` }}
              />
            </div>

            {/* Tekli saat kaydırıcısı */}
            <input
              type="range"
              min={minHour}
              max={maxHour}
              value={selectedHour}
              onChange={handleHourChange}
              className={`${styles.slider} ${styles.singleSlider}`}
              aria-label="Seçilen saat"
            />
          </div>

          <div className={styles.hourLabels}>
            <span>{formatHour(minHour)}</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>{formatHour(maxHour)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnualDomainSlider;