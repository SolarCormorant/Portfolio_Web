import React, { useState, useEffect, FC } from 'react';
import './DomainSlider.css';

interface DomainSliderProps {
  /** Minimum selectable value */
  min?: number;
  /** Maximum selectable value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Callback on value change */
  onChange?: (values: [number, number]) => void;
  /** Optional label above the slider */
  label?: string;
}

/**
 * A pure-React dual-thumb DomainSlider component in TypeScript
 */
const DomainSlider: FC<DomainSliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label = ''
}) => {
  const [minVal, setMinVal] = useState<number>(min);
  const [maxVal, setMaxVal] = useState<number>(max);

  // Keep minVal <= maxVal - step
  useEffect(() => {
    if (minVal > maxVal - step) {
      setMinVal(maxVal - step);
    }
    if (onChange) {
      onChange([minVal, maxVal]);
    }
  }, [minVal, maxVal, onChange, step]);

  return (
    <div className="domain-slider-container">
      {label && <label className="domain-slider-label">{label}</label>}
      <div className="slider-wrapper">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setMinVal(
              Math.min(Number(e.target.value), maxVal - step)
            )
          }
          className="thumb thumb--left"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setMaxVal(
              Math.max(Number(e.target.value), minVal + step)
            )
          }
          className="thumb thumb--right"
        />
        <div className="slider-track" />
        <div
          className="slider-range"
          style={{
            left: `${((minVal - min) / (max - min)) * 100}%`,
            right: `${100 - ((maxVal - min) / (max - min)) * 100}%`
          }}
        />
      </div>
      <div className="values">
        <span>{minVal}</span>
        <span>{maxVal}</span>
      </div>
    </div>
  );
};

export default DomainSlider;

// Dosya adı: DomainSlider.tsx
// Stylesheet: DomainSlider.css (aynı kalacak)
