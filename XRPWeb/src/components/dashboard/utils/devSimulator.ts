import AppMgr, { EventType } from '@/managers/appmgr';
import { CustomVarMeta, NetworkTable } from '@/managers/tablemgr';


interface SimVar {
  name: string;
  varId: number;
  type: number; // 1=int, 2=float, 3=bool
  value: number;
  generator: (current: number, tick: number) => number;
}

const VAR_TYPE_INT = 1;
const VAR_TYPE_FLOAT = 2;
const VAR_TYPE_BOOL = 3;

let simVars: SimVar[] = [];
let intervalId: ReturnType<typeof setInterval> | null = null;
let tick = 0;
let writeLog: Array<{ varName: string; value: number; timestamp: Date }> = [];


const DEFAULT_SIM_VARS: SimVar[] = [
  {
    name: 'motor_temp',
    varId: 38,
    type: VAR_TYPE_FLOAT,
    value: 35.0,
    generator: (cur) => cur + (Math.random() - 0.48) * 2, // slow drift upward
  },
  {
    name: 'battery_pct',
    varId: 39,
    type: VAR_TYPE_INT,
    value: 100,
    generator: (cur) => Math.max(0, Math.min(100, cur - Math.random() * 0.5)), // slow drain
  },
  {
    name: 'line_detected',
    varId: 40,
    type: VAR_TYPE_BOOL,
    value: 0,
    generator: (_cur, t) => (Math.sin(t * 0.1) > 0.3 ? 1 : 0), // toggles
  },
  {
    name: 'pid_output',
    varId: 41,
    type: VAR_TYPE_FLOAT,
    value: 0,
    generator: (_cur, t) => Math.sin(t * 0.15) * 50 + Math.random() * 5, // oscillating
  },
];


function emitFakeData(): void {
  tick++;

  for (const sv of simVars) {
    sv.value = sv.generator(sv.value, tick);
  }

  const table: NetworkTable = {
    gyro: { yaw: Math.sin(tick * 0.05) * 10, roll: Math.cos(tick * 0.05) * 5, pitch: 0 },
    accelerometer: { accX: Math.random() * 0.1, accY: 9.8 + Math.random() * 0.05, accZ: Math.random() * 0.1 },
    encoders: { encL: tick * 2, encR: tick * 2 + Math.round(Math.random() * 3), enc3: 0, enc4: 0 },
    current: { currL: 150 + Math.random() * 50, currR: 140 + Math.random() * 50, curr3: 0, curr4: 0 },
    distance: 20 + Math.sin(tick * 0.08) * 15,
    reflectance: { reflectanceL: 500 + Math.random() * 200, reflectanceR: 500 + Math.random() * 200 },
    voltage: 7.2 - tick * 0.001 + Math.random() * 0.05,
  };

  const metaObj: Record<string, CustomVarMeta> = {};
  for (const sv of simVars) {
    table[sv.name] = sv.value;
    metaObj[sv.name] = { varId: sv.varId, type: sv.type };
  }
  table.__customVarMeta = metaObj;

  AppMgr.getInstance().emit(EventType.EVENT_DASHBOARD_DATA, JSON.stringify(table));
}


let originalWriteToDevice: ((data: string | Uint8Array) => Promise<void>) | null = null;
let mockConnectionInstalled = false;

function installMockConnection(): void {
  if (mockConnectionInstalled) return;

  const connection = AppMgr.getInstance().getConnection();
  if (connection) {
    originalWriteToDevice = connection.writeToDevice.bind(connection);
    connection.writeToDevice = async (data: string | Uint8Array) => {
      if (data instanceof Uint8Array && data.length >= 6 && data[0] === 0xAA && data[1] === 0x55) {
        // Parse XPP packet to log the write-back
        const msgType = data[2];
        if (msgType === 2) { // VAR_UPDATE
          const payload = data.subarray(4, 4 + data[3]);
          const count = payload[0];
          let offset = 1;
          for (let i = 0; i < count; i++) {
            const varId = payload[offset++];
            const varType = payload[offset++];
            let value = 0;

            if (varType === VAR_TYPE_BOOL) {
              value = payload[offset++];
            } else if (varType === VAR_TYPE_FLOAT) {
              const view = new DataView(payload.buffer, payload.byteOffset + offset, 4);
              value = view.getFloat32(0, true);
              offset += 4;
            } else {
              const view = new DataView(payload.buffer, payload.byteOffset + offset, 4);
              value = view.getInt32(0, true);
              offset += 4;
            }

            const sv = simVars.find(v => v.varId === varId);
            const varName = sv ? sv.name : `var_${varId}`;

            console.log(`[DevSim] ← WRITE-BACK: ${varName} = ${value} (type=${varType})`);
            writeLog.push({ varName, value, timestamp: new Date() });

            if (sv) {
              sv.value = value;
            }
          }
        }
      }
    };
    mockConnectionInstalled = true;
    console.log('[DevSim] Mock writeToDevice installed — write-backs will be captured');
  } else {
    console.log('[DevSim] No active connection — write-backs will fail gracefully (expected in dev)');
  }
}

function uninstallMockConnection(): void {
  if (!mockConnectionInstalled) return;
  const connection = AppMgr.getInstance().getConnection();
  if (connection && originalWriteToDevice) {
    connection.writeToDevice = originalWriteToDevice;
    originalWriteToDevice = null;
  }
  mockConnectionInstalled = false;
}

/**
 * Start the simulator. Emits fake NetworkTable data every `intervalMs`.
 * Includes both standard sensor data and custom XPP variables.
 *
 * @param customVars - Optional array of custom variable configs.
 *                     If not provided, uses 4 default demo variables.
 * @param intervalMs - Emission interval in ms (default: 200)
 */
export function startSimulator(
  customVars?: SimVar[],
  intervalMs: number = 200
): void {
  if (intervalId) {
    console.warn('[DevSim] Already running — call stopSimulator() first');
    return;
  }

  simVars = customVars ?? [...DEFAULT_SIM_VARS];
  tick = 0;
  writeLog = [];

  installMockConnection();

  console.log('[DevSim] Starting simulator with variables:', simVars.map(v => v.name));
  console.log('[DevSim] Emitting every', intervalMs, 'ms');

  emitFakeData();
  intervalId = setInterval(emitFakeData, intervalMs);
}

/** Stop the simulator */
export function stopSimulator(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  uninstallMockConnection();
  console.log('[DevSim] Stopped');
}

/** Check if running */
export function isSimulatorRunning(): boolean {
  return intervalId !== null;
}

/** Get the write-back log (values sent from dashboard → XRP) */
export function getWriteLog() {
  return [...writeLog];
}

/** Get current simulated variable values */
export function getSimValues(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const sv of simVars) {
    result[sv.name] = sv.value;
  }
  return result;
}


if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__devSim = {
    start: startSimulator,
    stop: stopSimulator,
    running: isSimulatorRunning,
    log: getWriteLog,
    values: getSimValues,
  };
}

export type { SimVar };
