import { NetworkTable } from '@/managers/tablemgr';
import {
  AccelerometerData,
  GyroscopeData,
  RangefinderData,
  VoltageData,
  ReflectanceData,
  CurrentData,
  EncoderData,
  EmotionData,
} from '../utils/sensorParsers';

/**
 * A parser function that extracts typed sensor data from a NetworkTable update.
 * Returns null if the data isn't available in this update.
 */
export type SensorParser<T = unknown> = (table: NetworkTable) => T | null;


const accelerometerParser: SensorParser<AccelerometerData> = (table) => {
  if (!table.accelerometer) return null;
  return {
    x: table.accelerometer.accX,
    y: table.accelerometer.accY,
    z: table.accelerometer.accZ,
  };
};

const gyroscopeParser: SensorParser<GyroscopeData> = (table) => {
  if (!table.gyro) return null;
  return {
    pitch: table.gyro.pitch,
    roll: table.gyro.roll,
    yaw: table.gyro.yaw,
  };
};

const rangefinderParser: SensorParser<RangefinderData> = (table) => {
  if (table.distance == null) return null;
  return { distance: table.distance };
};

const batteryParser: SensorParser<VoltageData> = (table) => {
  if (table.voltage == null) return null;
  return { voltage: table.voltage };
};

const reflectanceParser: SensorParser<ReflectanceData> = (table) => {
  if (!table.reflectance) return null;
  return {
    reflectanceL: table.reflectance.reflectanceL,
    reflectanceR: table.reflectance.reflectanceR,
  };
};

const currentParser: SensorParser<CurrentData> = (table) => {
  if (!table.current) return null;
  return {
    currL: table.current.currL,
    currR: table.current.currR,
    curr3: table.current.curr3,
    curr4: table.current.curr4,
  };
};

const encoderParser: SensorParser<EncoderData> = (table) => {
  if (!table.encoders) return null;
  return {
    encL: table.encoders.encL,
    encR: table.encoders.encR,
    enc3: table.encoders.enc3,
    enc4: table.encoders.enc4,
  };
};

const emotionParser:
  SensorParser<EmotionData> = (
    table
  ) => {
    const source = table as NetworkTable &
      Partial<EmotionData>;

    if (
      typeof source.emotionId !== "number" ||
      typeof source.emotionGeneration !==
        "number" ||
      typeof source.emotionFps !== "number" ||
      typeof source.emotionStatus !== "number"
    ) {
      return null;
    }

    return {
      emotionId:
        source.emotionId,

      emotionGeneration:
        source.emotionGeneration,

      emotionFps:
        source.emotionFps,

      emotionStatus:
        source.emotionStatus,

      emotionFlags:
        source.emotionFlags ?? 0,

      emotionRepeatMode:
        source.emotionRepeatMode ?? 0,

      emotionRepeatCount:
        source.emotionRepeatCount ?? -1,

      emotionFrameSubsetLength:
        source.emotionFrameSubsetLength ?? 0,

      emotionFrameSubsetPacked:
        source.emotionFrameSubsetPacked ?? 0,
    };
  };


const parserRegistry = new Map<string, SensorParser>([
  ['accelerometer', accelerometerParser],
  ['gyroscope', gyroscopeParser],
  ['rangefinder', rangefinderParser],
  ['battery', batteryParser],
  ['reflectance', reflectanceParser],
  ['current', currentParser],
  ['encoders', encoderParser],
  ["emotion", emotionParser],
]);

/**
 * Register a custom sensor parser at runtime.
 * The sensor name must match the key used in useSensorData subscriptions.
 */
export function registerSensorParser<T>(name: string, parser: SensorParser<T>): void {
  parserRegistry.set(name, parser as SensorParser);
}

/** Unregister a sensor parser. */
export function unregisterSensorParser(name: string): void {
  parserRegistry.delete(name);
}

/** Get the parser for a sensor name, or null if none registered. */
export function getSensorParser(name: string): SensorParser | null {
  return parserRegistry.get(name) ?? null;
}

/** Get all registered sensor names. */
export function getRegisteredSensors(): string[] {
  return Array.from(parserRegistry.keys());
}

/**
 * Creates a generic parser that reads a top-level key from the NetworkTable
 * and extracts the specified fields. Useful for simple custom XPP sensors
 * where the NetworkTable shape is { [tableKey]: { field1, field2, ... } }.
 *
 * Example:
 *   registerSensorParser('motor_temp', createSimpleParser('motor_temp', ['temp1', 'temp2']));
 */
export function createSimpleParser<T extends Record<string, number>>(
  tableKey: string,
  fields: (keyof T & string)[]
): SensorParser<T> {
  return (table: NetworkTable) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const source = (table as any)[tableKey];
    if (!source) return null;

    const result: Record<string, number> = {};
    for (const field of fields) {
      result[field] = source[field] ?? 0;
    }
    return result as T;
  };
}
