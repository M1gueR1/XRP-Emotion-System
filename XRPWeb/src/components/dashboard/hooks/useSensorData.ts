import { useState, useEffect, useCallback } from 'react';
import { SensorData } from '../utils/sensorParsers';
import AppMgr, { EventType } from '@/managers/appmgr';
import { NetworkTable } from '@/managers/tablemgr';
import { getSensorParser } from '../sensors/parserRegistry';

const useSensorData = () => {
  const [sensorData, setSensorData] = useState<Map<string, SensorData>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [activeSensors, setActiveSensors] = useState<Set<string>>(new Set());

  const handleSensorData = useCallback((data: string) => {
    try {
      const parsedTable = JSON.parse(data) as NetworkTable;

      for (const sensor of activeSensors) {
        const parser = getSensorParser(sensor);
        if (!parser) {
          console.warn(`No parser registered for sensor: ${sensor}`);
          continue;
        }

        const value = parser(parsedTable);
        if (value == null) continue;

        const sensorEntry: SensorData = {
          sensorType: sensor,
          value,
          timestamp: new Date().toISOString(),
        };

        setSensorData(prev => {
          const newMap = new Map(prev);
          newMap.set(sensor, sensorEntry);
          return newMap;
        });
      }
    } catch (err) {
      console.error('Error handling sensor data:', err);
      setError('Error handling sensor data');
    }
  }, [activeSensors]);

  useEffect(() => {
    AppMgr.getInstance().on(EventType.EVENT_DASHBOARD_DATA, handleSensorData);
  }, [handleSensorData]);

  const stopSensor = (sensor: string) => {
    setActiveSensors(prev => {
      const newSet = new Set(prev);
      newSet.delete(sensor);
      return newSet;
    });
  };

  const getSensorData = <T,>(sensor: string): T | null => {
    const data = sensorData.get(sensor);
    return data ? data.value as T : null;
  };

  const requestSensors = (sensors: string[]) => {
    setActiveSensors(prev => {
      const newSet = new Set(prev);
      sensors.forEach(sensor => newSet.add(sensor));
      return newSet;
    });
  };

  return {
    sensorData,
    getSensorData,
    error,
    requestSensors,
    stopSensor,
    activeSensors: Array.from(activeSensors),
  };
};

export default useSensorData;
