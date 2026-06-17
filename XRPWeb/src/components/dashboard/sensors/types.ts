import { ReactNode } from 'react';

/** Defines one channel/axis of data that a sensor produces */
export interface SensorChannel<TKey extends string = string> {
  /** Key in the data object (e.g. 'x', 'currL', 'voltage') */
  key: TKey;
  /** Display label (e.g. 'Left', 'X', 'Voltage') */
  label: string;
  /** Color used in charts and UI */
  color: string;
  /** Unit suffix for display (e.g. 'mA', 'V', '°') */
  unit?: string;
  /** Number of decimal places for display (default: 2) */
  decimals?: number;
}

/** Configuration that fully describes a sensor widget */
export interface SensorConfig<TData = any, THistoryEntry = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Sensor name used for data subscription (e.g. 'accelerometer', 'battery') */
  sensorName: string;
  /** i18n key for the title (falls back to literal string if no translation found) */
  titleKey: string;
  /** Icon element */
  icon: ReactNode;
  /** Channels this sensor exposes */
  channels: SensorChannel[];
  /** Transform raw sensor data into a flat history entry with a timestamp */
  toHistoryEntry: (data: TData, timestamp: number) => THistoryEntry;
  /** Optional custom number view. If not provided, a default grid of values is rendered. */
  renderNumberView?: (data: TData, channels: SensorChannel[]) => ReactNode;
  /** Tooltip value formatter for charts (default: value.toFixed(2)) */
  tooltipFormatter?: (value: number) => string;
}
