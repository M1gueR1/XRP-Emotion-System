export interface SensorData {
  sensorType: string;
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  timestamp: string;
}

export interface ColorSensorData {
  r: number;
  g: number;
  b: number;
}

export interface VoltageData {
  voltage: number;
}

export interface ReflectanceData {
  reflectanceL: number;
  reflectanceR: number;
}



export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

export interface GyroscopeData {
  pitch: number;
  roll: number;
  yaw: number;
}

export interface TemperatureData {
  celsius: number;
}

export interface LEDData {
  state: 'on' | 'off';
}

export interface ServoData {
  angle: number;
}

export interface EncoderData {
  encL: number;
  encR: number;
  enc3: number;
  enc4: number;
}

export interface CurrentData {
  currL: number;
  currR: number;
  curr3: number;
  curr4: number;
}

export interface MotorData {
  speed: number;
  position: number;
  count: number;
}

export interface RangefinderData {
  distance: number;
}

export interface EmotionData {
  emotionId: number;
  emotionGeneration: number;
  emotionFps: number;
  emotionStatus: number;

  emotionFlags: number;
  emotionRepeatMode: number;
  emotionRepeatCount: number;

  emotionFrameSubsetLength: number;
  emotionFrameSubsetPacked: number;
}

// Parse sensor data from string format to appropriate object
export const parseSensorData = (data: { value: string }): SensorData | null => {
  try {
    // Extract the sensor type and values from the string
    // Expected format: "Sensor Type Data", "value1, value2, ..."
    const valueStr = data.value;
    const parts = valueStr.split('", "');

    if (parts.length !== 2) {
      console.error("Invalid data format:", valueStr);
      return null;
    }

    // Remove the quotes from the parts
    const sensorType = parts[0].replace(/"/g, '');
    const valuesStr = parts[1].replace(/"/g, '');
    const values = valuesStr.split(', ').map(v => {
      const num = parseFloat(v);
      return isNaN(num) ? v : num;
    });

    let parsedValue: any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Parse based on sensor type
    switch (sensorType) {
      case "Color Sensor Data":
        parsedValue = {
          r: Math.round(Number(values[0])),
          g: Math.round(Number(values[1])),
          b: Math.round(Number(values[2]))
        };
        break;

      case "Accelerometer Data":
        parsedValue = {
          x: values[0],
          y: values[1],
          z: values[2]
        };
        break;

      case "Gyroscope Data":
        parsedValue = {
          pitch: values[0],
          roll: values[1],
          yaw: values[2]
        };
        break;

      case "Temperature Data":
        parsedValue = {
          celsius: values[0]
        };
        break;

      case "LED Data":
        parsedValue = {
          state: values[0] === 1 ? 'on' : 'off'
        };
        break;

      case "Servo Data":
        parsedValue = {
          angle: values[0]
        };
        break;

      case "Motor Data":
        parsedValue = {
          speed: values[0],
          position: values[1],
          count: values[2]
        };
        break;

      case "Rangefinder Data":
        parsedValue = {
          distance: values[0]
        };
        break;

      case "Battery Data":
        parsedValue = {
          voltage: values[0]
        };
        break;

      case "Reflectance Data":
        parsedValue = {
          reflectance: {
            reflectanceL: values[0],
            reflectanceR: values[1]
          }
        };
        break;

      case "Current Data":
        parsedValue = {
          current: {
            currL: values[0],
            currR: values[1],
            curr3: values[2],
            curr4: values[3]
          }
        };
        break;

      case "Encoder Data":
        parsedValue = {
          encoders: {
            encL: values[0],
            encR: values[1],
            enc3: values[2],
            enc4: values[3]
          }
        };
        break;

      default:
        console.warn("Unknown sensor type:", sensorType);
        return null;
    }

    // Map sensor type string to sensor identifier
    const sensorTypeMap: Record<string, string> = {
      "Color Sensor Data": "color_sensor",
      "Accelerometer Data": "accelerometer",
      "Gyroscope Data": "gyroscope",
      "Temperature Data": "temperature",
      "LED Data": "LED",
      "Servo Data": "servo",
      "Motor Data": "motor",
      "Rangefinder Data": "rangefinder",
      "Battery Data": "battery",
      "Reflectance Data": "reflectance",
      "Current Data": "current",
      "Encoder Data": "encoders"
    };

    return {
      sensorType: sensorTypeMap[sensorType] || sensorType,
      value: parsedValue,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error parsing sensor data:", error, data);
    return null;
  }
};