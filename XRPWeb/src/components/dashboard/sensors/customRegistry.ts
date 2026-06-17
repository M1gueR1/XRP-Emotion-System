import { SensorChannel } from './types';
import { SensorParser } from './parserRegistry';

/**
 * Definition for a custom XPP sensor that can be registered at runtime.
 * Used by CustomXPPSensor and the dynamic AddWidgets dropdown.
 */
export interface CustomSensorDef {
  /** Sensor name must match the NetworkTable key published by the XRP */
  sensorName: string;
  /** Display title */
  title: string;
  /** Channel definitions */
  channels: SensorChannel[];
  /** Optional custom parser. If omitted, createSimpleParser is used. */
  parser?: SensorParser<Record<string, number>>;
  /** GridStack widget dimensions (optional, defaults provided) */
  gridDefaults?: {
    h?: number;
    w?: number;
    minW?: number;
    minH?: number;
  };
}

const customSensorRegistry = new Map<string, CustomSensorDef>();

/** Register a custom sensor definition at runtime */
export function registerCustomSensor(def: CustomSensorDef): void {
  customSensorRegistry.set(def.sensorName, def);
}

/** Unregister a custom sensor */
export function unregisterCustomSensor(sensorName: string): void {
  customSensorRegistry.delete(sensorName);
}

/** Get a single custom sensor definition */
export function getCustomSensor(sensorName: string): CustomSensorDef | undefined {
  return customSensorRegistry.get(sensorName);
}

/** Get all registered custom sensor definitions */
export function getCustomSensors(): CustomSensorDef[] {
  return Array.from(customSensorRegistry.values());
}
