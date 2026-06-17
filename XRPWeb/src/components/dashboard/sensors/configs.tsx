import { MdSpeed } from 'react-icons/md';
import { FaBolt, FaCog, FaGlobe, FaEye, FaBatteryHalf } from 'react-icons/fa';
import { BsRulers } from 'react-icons/bs';
import { SensorConfig } from './types';
import {
  AccelerometerData,
  CurrentData,
  EncoderData,
  GyroscopeData,
  RangefinderData,
  ReflectanceData,
  VoltageData,
} from '../utils/sensorParsers';


interface AccelHistory { x: number; y: number; z: number; timestamp: number }

export const accelerometerConfig: SensorConfig<AccelerometerData, AccelHistory> = {
  sensorName: 'accelerometer',
  titleKey: 'accelerometer',
  icon: <MdSpeed size={12} />,
  channels: [
    { key: 'x', label: 'X', color: '#3b82f6' },
    { key: 'y', label: 'Y', color: '#10b981' },
    { key: 'z', label: 'Z', color: '#ef4444' },
  ],
  toHistoryEntry: (data, timestamp) => ({
    x: data.x, y: data.y, z: data.z, timestamp,
  }),
};

interface GyroHistory { pitch: number; roll: number; yaw: number; timestamp: number }

export const gyroscopeConfig: SensorConfig<GyroscopeData, GyroHistory> = {
  sensorName: 'gyroscope',
  titleKey: 'gyroscope',
  icon: <FaGlobe size={20} />,
  channels: [
    { key: 'pitch', label: 'Pitch', color: '#3b82f6' },
    { key: 'roll', label: 'Roll', color: '#10b981' },
    { key: 'yaw', label: 'Yaw', color: '#ef4444' },
  ],
  toHistoryEntry: (data, timestamp) => ({
    pitch: data.pitch, roll: data.roll, yaw: data.yaw, timestamp,
  }),
};


interface CurrentHistory { currL: number; currR: number; curr3: number; curr4: number; timestamp: number }

export const currentConfig: SensorConfig<CurrentData, CurrentHistory> = {
  sensorName: 'current',
  titleKey: 'current',
  icon: <FaBolt size={12} />,
  channels: [
    { key: 'currL', label: 'Left', color: '#8b5cf6', unit: 'mA', decimals: 0 },
    { key: 'currR', label: 'Right', color: '#06b6d4', unit: 'mA', decimals: 0 },
    { key: 'curr3', label: 'Ch 3', color: '#10b981', unit: 'mA', decimals: 0 },
    { key: 'curr4', label: 'Ch 4', color: '#f59e0b', unit: 'mA', decimals: 0 },
  ],
  toHistoryEntry: (data, timestamp) => ({
    currL: data.currL, currR: data.currR, curr3: data.curr3, curr4: data.curr4, timestamp,
  }),
  tooltipFormatter: (v) => `${v.toFixed(0)} mA`,
};

interface EncoderHistory { encL: number; encR: number; enc3: number; enc4: number; timestamp: number }

export const encoderConfig: SensorConfig<EncoderData, EncoderHistory> = {
  sensorName: 'encoders',
  titleKey: 'encoders',
  icon: <FaCog size={12} />,
  channels: [
    { key: 'encL', label: 'Left', color: '#8b5cf6', unit: 'ticks', decimals: 0 },
    { key: 'encR', label: 'Right', color: '#06b6d4', unit: 'ticks', decimals: 0 },
    { key: 'enc3', label: 'Enc 3', color: '#10b981', unit: 'ticks', decimals: 0 },
    { key: 'enc4', label: 'Enc 4', color: '#f59e0b', unit: 'ticks', decimals: 0 },
  ],
  toHistoryEntry: (data, timestamp) => ({
    encL: data.encL, encR: data.encR, enc3: data.enc3, enc4: data.enc4, timestamp,
  }),
  tooltipFormatter: (v) => `${v} ticks`,
};

interface RangeHistory { distance: number; timestamp: number }

export const rangefinderConfig: SensorConfig<RangefinderData, RangeHistory> = {
  sensorName: 'rangefinder',
  titleKey: 'rangefinder',
  icon: <BsRulers size={12} />,
  channels: [
    { key: 'distance', label: 'Distance', color: '#10b981', unit: 'cm', decimals: 1 },
  ],
  toHistoryEntry: (data, timestamp) => ({
    distance: data.distance, timestamp,
  }),
};

interface ReflectanceHistory { reflectanceL: number; reflectanceR: number; timestamp: number }

export const reflectanceConfig: SensorConfig<ReflectanceData, ReflectanceHistory> = {
  sensorName: 'reflectance',
  titleKey: 'reflectance',
  icon: <FaEye size={12} />,
  channels: [
    { key: 'reflectanceL', label: 'Left', color: '#8b5cf6', decimals: 0 },
    { key: 'reflectanceR', label: 'Right', color: '#06b6d4', decimals: 0 },
  ],
  toHistoryEntry: (data, timestamp) => ({
    reflectanceL: data.reflectanceL, reflectanceR: data.reflectanceR, timestamp,
  }),
};

interface VoltageHistory { voltage: number; timestamp: number }

export const voltageConfig: SensorConfig<VoltageData, VoltageHistory> = {
  sensorName: 'battery',
  titleKey: 'voltage',
  icon: <FaBatteryHalf size={12} />,
  channels: [
    { key: 'voltage', label: 'Voltage', color: '#f59e0b', unit: 'V', decimals: 2 },
  ],
  toHistoryEntry: (data, timestamp) => ({
    voltage: data.voltage, timestamp,
  }),
};
