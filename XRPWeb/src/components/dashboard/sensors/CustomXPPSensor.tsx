import React, { useMemo, useEffect } from 'react';
import { FaPlug } from 'react-icons/fa';
import SensorWidget from './SensorWidget';
import { SensorConfig, SensorChannel } from './types';
import {
  registerSensorParser,
  unregisterSensorParser,
  createSimpleParser,
  SensorParser,
} from './parserRegistry';

interface CustomXPPSensorProps {
  /** Sensor name for data subscription (must match the NetworkTable key) */
  sensorName: string;
  /** Display title */
  title: string;
  /** Channel definitions */
  channels: SensorChannel[];
  /** Optional icon (defaults to a plug icon) */
  icon?: React.ReactNode;
  /** Optional custom tooltip formatter */
  tooltipFormatter?: (value: number) => string;
  /** Optional custom number view renderer */
  renderNumberView?: (data: Record<string, number>, channels: SensorChannel[]) => React.ReactNode;
  /**
   * Optional custom parser for extracting data from the NetworkTable.
   * If not provided, a simple parser is auto-generated that reads
   * table[sensorName][channel.key] for each channel.
   */
  parser?: SensorParser<Record<string, number>>;
}

/**
 * A props-driven sensor widget for custom XPP variables
 */
const CustomXPPSensor: React.FC<CustomXPPSensorProps> = ({
  sensorName,
  title,
  channels,
  icon,
  tooltipFormatter,
  renderNumberView,
  parser,
}) => {
  // Auto-register parser on mount, unregister on unmount
  useEffect(() => {
    const sensorParser = parser ?? createSimpleParser(
      sensorName,
      channels.map(ch => ch.key)
    );
    registerSensorParser(sensorName, sensorParser);

    return () => {
      unregisterSensorParser(sensorName);
    };
  }, [sensorName, channels, parser]);

  const config = useMemo<SensorConfig<Record<string, number>, Record<string, number>>>(
    () => ({
      sensorName,
      titleKey: title,
      icon: icon ?? <FaPlug size={12} />,
      channels,
      toHistoryEntry: (data, timestamp) => {
        const entry: Record<string, number> = { timestamp };
        for (const ch of channels) {
          entry[ch.key] = data[ch.key] ?? 0;
        }
        return entry;
      },
      tooltipFormatter,
      renderNumberView,
    }),
    [sensorName, title, channels, icon, tooltipFormatter, renderNumberView]
  );

  return <SensorWidget config={config} />;
};

export default CustomXPPSensor;
