import React from "react";
import { useGridStackContext } from "./lib/grid-stack-context";
import { Dropdown, DropdownItem } from "flowbite-react";
import { MdSpeed } from 'react-icons/md';
import { FaBatteryHalf, FaBolt, FaCamera, FaCog, FaEye, FaGlobe, FaPlug, FaPlus, FaSlidersH, FaRobot, FaCommentDots } from 'react-icons/fa';
import { BsRulers } from 'react-icons/bs';
import { FlowBiteConstants } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { getCustomSensors } from "./sensors/customRegistry";



interface BuiltinSensorDef {
  action: string;
  icon: React.ComponentType<{ size?: number }>;
  titleKey: string;
  gridH: number;
  gridW: number;
  minW: number;
  minH: number;
  componentName: string;
}

const BUILTIN_SENSORS: BuiltinSensorDef[] = [
  { action: 'accelerometer', icon: MdSpeed, titleKey: 'accelerometer', gridH: 5, gridW: 4, minW: 2, minH: 5, componentName: 'Accelerometer' },
  { action: 'current', icon: FaBolt, titleKey: 'current', gridH: 4, gridW: 4, minW: 1, minH: 5, componentName: 'Current' },
  { action: 'gyroscope', icon: FaGlobe, titleKey: 'gyroscope', gridH: 4, gridW: 4, minW: 2, minH: 5, componentName: 'Gyroscope' },
  { action: 'encoder', icon: FaCog, titleKey: 'encoders', gridH: 5, gridW: 4, minW: 1, minH: 4, componentName: 'Encoder' },
  { action: 'reflectance', icon: FaEye, titleKey: 'reflectance', gridH: 5, gridW: 4, minW: 2, minH: 5, componentName: 'Reflectance' },
  { action: 'rangefinder', icon: BsRulers, titleKey: 'rangefinder', gridH: 8, gridW: 4, minW: 2, minH: 8, componentName: 'Rangefinder' },
  { action: 'voltage', icon: FaBatteryHalf, titleKey: 'voltage', gridH: 6, gridW: 4, minW: 2, minH: 6, componentName: 'Voltage' },
  {
    action: "emotion",
    icon: FaRobot,
    titleKey: "Emotion Face",
    gridH: 7,
    gridW: 4,
    minW: 3,
    minH: 6,
    componentName: "EmotionWidget",
  },
  {
    action: "cameraVision",
    icon: FaCamera,
    titleKey: "Camera Vision",
    gridH: 8,
    gridW: 5,
    minW: 3,
    minH: 6,
    componentName: "CameraVisionWidget",
  },
  {
    action: "robotChat",
    icon: FaCommentDots,
    titleKey: "Robot Chat",
    gridH: 9,
    gridW: 5,
    minW: 3,
    minH: 7,
    componentName: "RobotChatWidget",
  },
];

const AddWidgets: React.FC = () => {
  const { t } = useTranslation();
  const { addWidget } = useGridStackContext();

  const customSensors = getCustomSensors();

  const handleAddBuiltin = (def: BuiltinSensorDef) => {
    addWidget(() => ({
      h: def.gridH,
      w: def.gridW,
      x: 0,
      y: 2,
      minW: def.minW,
      minH: def.minH,
      content: JSON.stringify({
        name: def.componentName,
        props: { isActive: true },
      }),
    }));
  };

  const handleAddCustom = (sensorName: string) => {
    const def = customSensors.find(s => s.sensorName === sensorName);
    if (!def) return;

    const grid = def.gridDefaults ?? {};
    addWidget(() => ({
      h: grid.h ?? 5,
      w: grid.w ?? 4,
      x: 0,
      y: 2,
      minW: grid.minW ?? 2,
      minH: grid.minH ?? 5,
      content: JSON.stringify({
        name: 'CustomSensor',
        props: { sensorName: def.sensorName },
      }),
    }));
  };

  return (
    <div className="flex items-center mt-4 sm:mt-0">
      <Dropdown
        label={<FaPlus size={20} />}
        inline={true}
        theme={FlowBiteConstants.DropdownTheme}
        className="flex items-center mt-4 sm:mt-0"
      >
        {/* Built-in sensors */}
        {BUILTIN_SENSORS.map((def) => (
          <DropdownItem
            key={def.action}
            icon={def.icon as any}
            onClick={() => handleAddBuiltin(def)}
          >
            {t(def.titleKey)}
          </DropdownItem>
        ))}

        {/* Custom Variable (bidirectional XPP variable inspector/editor) */}
        <hr className="my-1 border-gray-200" />
        <DropdownItem
          icon={FaSlidersH}
          onClick={() => {
            addWidget(() => ({
              h: 5,
              w: 4,
              x: 0,
              y: 2,
              minW: 2,
              minH: 4,
              content: JSON.stringify({
                name: 'CustomVariable',
                props: {},
              }),
            }));
          }}
        >
          {'Custom Variable'}
        </DropdownItem>
        {customSensors.length > 0 && (
          <>
            <hr className="my-1 border-gray-200" />
            {customSensors.map((def) => (
              <DropdownItem
                key={def.sensorName}
                icon={FaPlug}
                onClick={() => handleAddCustom(def.sensorName)}
              >
                {def.title}
              </DropdownItem>
            ))}
          </>
        )}
      </Dropdown>
    </div>
  );
};

export default AddWidgets;
