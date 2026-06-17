import { useState, useEffect, useCallback } from 'react';
import useSensorData from './useSensorData';

const MAX_HISTORY_SIZE = 1000;

/**
 * Hook that manages sensor data subscription and history accumulation.
 * Generic over TData (raw sensor shape) and THistoryEntry (timestamped history object).
 */
export function useSensorHistory<TData, THistoryEntry>(
  sensorName: string,
  /** Transform raw sensor data + timestamp into a history entry */
  toHistoryEntry: (data: TData, timestamp: number) => THistoryEntry
) {
  const { getSensorData, requestSensors, stopSensor, sensorData } = useSensorData();
  const [history, setHistory] = useState<THistoryEntry[]>([]);

  const currentData = getSensorData<TData>(sensorName);
  const lastUpdated = sensorData.get(sensorName)?.timestamp;

  // Accumulate history when new data arrives
  useEffect(() => {
    if (currentData && lastUpdated) {
      const timestamp = typeof lastUpdated === 'string'
        ? Number(lastUpdated)
        : lastUpdated;
      const entry = toHistoryEntry(currentData, timestamp);
      setHistory(prev => {
        const next = [...prev, entry];
        return next.length > MAX_HISTORY_SIZE
          ? next.slice(next.length - MAX_HISTORY_SIZE)
          : next;
      });
    }
  }, [currentData, lastUpdated, toHistoryEntry]);

  const handleStart = useCallback(() => {
    setHistory([]);
    requestSensors([sensorName]);
  }, [sensorName, requestSensors]);

  const handleStop = useCallback(() => {
    stopSensor(sensorName);
  }, [sensorName, stopSensor]);

  return {
    currentData,
    lastUpdated,
    history,
    handleStart,
    handleStop,
    requestSensors,
  };
}
