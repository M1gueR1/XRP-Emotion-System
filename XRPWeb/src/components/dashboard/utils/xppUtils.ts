import AppMgr from '@/managers/appmgr';
import { CustomVarMeta } from '@/managers/tablemgr';

// XPP Protocol Constants
const XPP_START = [0xAA, 0x55];
const XPP_END = [0x55, 0xAA];
const XPP_MSG_TYPE_VAR_UPDATE = 2;
const VAR_TYPE_INT = 1;
const VAR_TYPE_FLOAT = 2;
const VAR_TYPE_BOOL = 3;

/**
 * Build an XPP VAR_UPDATE packet from variable metadata and a value.
 * The metadata (varId, type) comes from __customVarMeta in the NetworkTable JSON,
 * so no direct TableMgr access is needed.
 */
export function buildVarUpdatePacket(meta: CustomVarMeta, value: number): Uint8Array {
  const payload: number[] = [];
  payload.push(1); // count = 1

  payload.push(meta.varId);
  payload.push(meta.type);

  if (meta.type === VAR_TYPE_BOOL) {
    payload.push(value ? 1 : 0);
  } else if (meta.type === VAR_TYPE_FLOAT) {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, value, true);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < 4; i++) payload.push(bytes[i]);
  } else {
    // INT
    const buf = new ArrayBuffer(4);
    new DataView(buf).setInt32(0, Math.round(value), true);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < 4; i++) payload.push(bytes[i]);
  }

  const msg = new Uint8Array(XPP_START.length + 1 + 1 + payload.length + XPP_END.length);
  let offset = 0;
  msg.set(XPP_START, offset); offset += XPP_START.length;
  msg[offset++] = XPP_MSG_TYPE_VAR_UPDATE;
  msg[offset++] = payload.length;
  msg.set(payload, offset); offset += payload.length;
  msg.set(XPP_END, offset);

  return msg;
}

/**
 * Send a variable update to the XRP.
 * Uses the active connection's writeToDevice.
 * Returns true if sent, false if no connection available.
 */
export async function sendVariableUpdate(meta: CustomVarMeta, value: number): Promise<boolean> {
  const connection = AppMgr.getInstance().getConnection();
  if (!connection) {
    console.warn('Cannot send variable update: no active connection');
    return false;
  }

  const packet = buildVarUpdatePacket(meta, value);
  try {
    await connection.writeToDevice(packet);
    return true;
  } catch (err) {
    console.error('Error sending variable update:', err);
    return false;
  }
}

/** Type name for display purposes */
export function varTypeName(type: number): string {
  switch (type) {
    case VAR_TYPE_INT: return 'int';
    case VAR_TYPE_FLOAT: return 'float';
    case VAR_TYPE_BOOL: return 'bool';
    default: return 'unknown';
  }
}