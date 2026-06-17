import React from 'react';
import SensorWidget from './SensorWidget';
import {
  accelerometerConfig,
  gyroscopeConfig,
  currentConfig,
  encoderConfig,
  rangefinderConfig,
  reflectanceConfig,
  voltageConfig,
} from './configs';

export const Accelerometer: React.FC = () => (
  <SensorWidget config={accelerometerConfig} />
);

export const Gyroscope: React.FC = () => (
  <SensorWidget config={gyroscopeConfig} />
);

export const Current: React.FC = () => (
  <SensorWidget config={currentConfig} />
);

export const Encoder: React.FC = () => (
  <SensorWidget config={encoderConfig} />
);

export const Rangefinder: React.FC = () => (
  <SensorWidget config={rangefinderConfig} />
);

export const Reflectance: React.FC = () => (
  <SensorWidget config={reflectanceConfig} />
);

export const Voltage: React.FC = () => (
  <SensorWidget config={voltageConfig} />
);

export {
  default as EmotionWidget,
} from "./EmotionWidget";