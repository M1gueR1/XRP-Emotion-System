// ##### tablemgr.ts #####
// Wraps the table procedures into a class
import logger from "@/utils/logger";
import AppMgr, { EventType } from "./appmgr";

export interface CustomVarMeta {
    varId: number;
    type: number; // 1=int, 2=float, 3=bool
}

export interface NetworkTable {
    gyro: {
        yaw: number;
        roll: number;
        pitch: number;
    },
    accelerometer: {
        accX: number;
        accY: number;
        accZ: number;
    },
    encoders: {
        encL: number;
        encR: number;
        enc3: number;
        enc4: number;
    },
    current: {
        currL: number;
        currR: number;
        curr3: number;
        curr4: number;
    },
    distance: number;
    reflectance: {
        reflectanceL: number;
        reflectanceR: number;
    },
    voltage: number;
    /** Metadata for custom variables (varId + type) so the dashboard can send updates back */
    __customVarMeta?: Record<string, CustomVarMeta>;
    /** Custom variables appear as top-level keys with numeric values */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

class TableMgr {
    protected tableLogger = logger.child({ module: 'table' });

    // State Arrays
    private tableArray: number[] = [
        0.0, // yaw
        0.0, // roll
        0.0, // pitch
        0.0, // accX
        0.0,   // accY
        0.0,   // accZ
        0.0,   // encL
        0.0,   // encR
        0.0,   // enc3
        0.0,   // enc4
        0.0,   // currentL
        0.0,   // currentR
        0.0,   // current3
        0.0,   // current4
        0.0,   // distance
        0.0,   // reflectanceL
        0.0,   // reflectanceR
        0.0,   // voltage
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private tableNames: any = {
        "yaw": 0,
        "roll": 1,
        "pitch": 2,
        "accX": 3,
        "accY": 4,
        "accZ": 5,
        "encL": 6,
        "encR": 7,
        "enc3": 8,
        "enc4": 9,
        "currR": 10,
        "currL": 11,
        "curr3": 12,
        "curr4": 13,
        "dist": 14,
        "reflectanceL": 15,
        "reflectanceR": 16,
        "voltage": 17
    };

    // XPP Protocol Constants
    private readonly XPP_MSG_TYPE_VAR_DEF: number = 1;
    private readonly XPP_MSG_TYPE_VAR_UPDATE: number = 2;
    private readonly VAR_TYPE_INT: number = 1;
    private readonly VAR_TYPE_FLOAT: number = 2;
    private readonly VAR_TYPE_BOOL: number = 3;

    // Mapping from XPP variable IDs (20-37) to table array indices
    private readonly xppVarIdToTableIndex: Map<number, number> = new Map([
        [20, 0], [21, 1], [22, 2], [23, 3], [24, 4], [25, 5],
        [26, 6], [27, 7], [28, 8], [29, 9],
        [30, 11], [31, 10], [32, 12], [33, 13],
        [34, 14], [35, 15], [36, 16], [37, 17],
    ]);

    // Map for custom variables (ID >= 38) defined via Variable Definition messages
    private customVarIdToTableIndex: Map<number, number> = new Map();

    // Custom variable metadata: name → { varId, type }
    private customVarMeta: Map<string, CustomVarMeta> = new Map();

    constructor() { }

    // --- Public Methods ---

    private getTable(): NetworkTable {
        const table: NetworkTable = {
            gyro: {
                yaw: this.tableArray[this.tableNames["yaw"]],
                roll: this.tableArray[this.tableNames["roll"]],
                pitch: this.tableArray[this.tableNames["pitch"]],
            },
            accelerometer: {
                accX: this.tableArray[this.tableNames["accX"]],
                accY: this.tableArray[this.tableNames["accY"]],
                accZ: this.tableArray[this.tableNames["accZ"]],
            },
            encoders: {
                encL: this.tableArray[this.tableNames["encL"]],
                encR: this.tableArray[this.tableNames["encR"]],
                enc3: this.tableArray[this.tableNames["enc3"]],
                enc4: this.tableArray[this.tableNames["enc4"]],
            },
            current: {
                currL: this.tableArray[this.tableNames["currL"]],
                currR: this.tableArray[this.tableNames["currR"]],
                curr3: this.tableArray[this.tableNames["curr3"]],
                curr4: this.tableArray[this.tableNames["curr4"]],
            },
            distance: this.tableArray[this.tableNames["dist"]],
            reflectance: {
                reflectanceL: this.tableArray[this.tableNames["reflectanceL"]],
                reflectanceR: this.tableArray[this.tableNames["reflectanceR"]],
            },
            voltage: this.tableArray[this.tableNames["voltage"]],
        };

        // Include custom variables as top-level number keys
        for (const [name] of this.customVarMeta) {
            const idx = this.tableNames[name];
            if (idx !== undefined) {
                table[name] = this.tableArray[idx];
            }
        }

        // Embed metadata so the dashboard can build write-back packets
        // without needing direct access to TableMgr
        const metaObj: Record<string, CustomVarMeta> = {};
        for (const [name, meta] of this.customVarMeta) {
            metaObj[name] = { varId: meta.varId, type: meta.type };
        }
        table.__customVarMeta = metaObj;

        return table;
    }

    public getValue(name: string): number | null {
        const index = this.tableNames[name];
        if (index)
            return this.tableArray[index];
        else
            return null;
    }

    public readFromDevice(packet: Uint8Array) {
  const messageType = packet[2];
  const payloadLength = packet[3];
  const payload = packet.subarray(
    4,
    4 + payloadLength
  );

  console.log("XPP decoded:", {
  messageType,
  payloadLength,
  payload: Array.from(payload),
});

  switch (messageType) {
    case this.XPP_MSG_TYPE_VAR_DEF:
      console.log(
        "XPP VAR_DEF:",
        Array.from(payload)
      );

      this.processVariableDefinition(
        payload
      );
      break;

    case this.XPP_MSG_TYPE_VAR_UPDATE:
      console.log(
        "XPP VAR_UPDATE:",
        Array.from(payload)
      );

      this.processVariableUpdate(
        payload
      );

      console.log(
        "Updated table:",
        this.getTable()
      );

      AppMgr.getInstance().emit(
        EventType.EVENT_DASHBOARD_DATA,
        JSON.stringify(
          this.getTable()
        )
      );
      break;

    default:
      console.warn(
        "Unhandled XPP message:",
        messageType,
        Array.from(payload)
      );
      break;
  }
}

    private processVariableDefinition(payload: Uint8Array): void {
        
        if (payload.length < 1) return;

        const nameLen = payload[0];
        if (payload.length < 4 + nameLen) return;

        const nameBytes = payload.subarray(1, 1 + nameLen);
        const name = new TextDecoder().decode(nameBytes);

        const type = payload[1 + nameLen];
        const varId = payload[3 + nameLen];

        const newIndex = this.tableArray.length;
        this.tableArray.push(0.0);

        this.tableNames[name] = newIndex;
        this.customVarIdToTableIndex.set(varId, newIndex);
        this.customVarMeta.set(name, { varId, type });

        this.tableLogger.info(`New variable defined: ${name} (ID: ${varId}, Type: ${type}, Index: ${newIndex})`);

        // Emit immediately so the dashboard discovers the new variable
        AppMgr.getInstance().emit(EventType.EVENT_DASHBOARD_DATA, JSON.stringify(this.getTable()));

        console.log(
  "Custom variable defined:",
  {
    name,
    type,
    varId,
  }
);
    }

    private processVariableUpdate(payload: Uint8Array): void {
        console.log(
            "XPP variable update:",
            Array.from(payload)
            );
        if (payload.length < 1) return;

        const count = payload[0];
        let offset = 1;

        for (let i = 0; i < count && offset < payload.length; i++) {
            if (offset + 2 > payload.length) break;

            const varId = payload[offset++];
            const varType = payload[offset++];

            let tableIndex: number | undefined = this.xppVarIdToTableIndex.get(varId);
            if (tableIndex === undefined) {
                tableIndex = this.customVarIdToTableIndex.get(varId);
            }

            if (tableIndex === undefined) {
                if (varType === this.VAR_TYPE_BOOL) { offset += 1; } else { offset += 4; }
                continue;
            }

            if (varType === this.VAR_TYPE_INT) {
                if (offset + 4 > payload.length) break;
                const view = new DataView(payload.buffer, payload.byteOffset + offset, 4);
                this.tableArray[tableIndex] = view.getInt32(0, true);
                offset += 4;
            } else if (varType === this.VAR_TYPE_FLOAT) {
                if (offset + 4 > payload.length) break;
                const view = new DataView(payload.buffer, payload.byteOffset + offset, 4);
                this.tableArray[tableIndex] = view.getFloat32(0, true);
                offset += 4;
            } else if (varType === this.VAR_TYPE_BOOL) {
                if (offset >= payload.length) break;
                this.tableArray[tableIndex] = payload[offset] !== 0 ? 1 : 0;
                offset += 1;
            } else {
                offset += 4;
            }
        }

        console.log(
  "Updated NetworkTable:",
  this.getTable()
);
    }
}

export default TableMgr;