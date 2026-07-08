import { useState, useEffect, useRef } from "react";
import {
  Accelerometer,
  Current,
  Encoder,
  Gyroscope,
  Rangefinder,
  Reflectance,
  Voltage,
  EmotionWidget,
} from "./sensors";
import CameraVisionWidget from "./sensors/CameraVisionWidget";
import UserProfileMemoryWidget from "./sensors/UserProfileMemoryWidget";
import RobotChatWidget from "./sensors/RobotChatWidget";
import CustomEmotionKeywordsWidget from "./sensors/CustomEmotionKeywordsWidget";
import CustomXPPSensor from "./sensors/CustomXPPSensor";
import CustomVariableWidget from "./sensors/CustomVariableWidget";
import { getCustomSensor } from "./sensors/customRegistry";
import { GridStackOptions } from "gridstack";
import AddWidgets from "./AddWidget";
import {
  GridStackProvider,
  GridStackRender,
  GridStackRenderProvider,
  useGridStackContext,
} from "./lib";
import { useTranslation } from "react-i18next";
import { FaUndo, FaBug } from "react-icons/fa";
import {
  startSimulator,
  stopSimulator,
  isSimulatorRunning,
} from "./utils/devSimulator";

const CELL_HEIGHT = 50;
const BREAKPOINTS = [
  { c: 1, w: 700 },
  { c: 3, w: 850 },
  { c: 6, w: 950 },
  { c: 8, w: 1100 },
];

// ─── Component Map ──────────────────────────────────────────────

const COMPONENT_MAP = {
  Accelerometer: () => <Accelerometer />,
  Gyroscope: () => <Gyroscope />,
  Current: () => <Current />,
  Encoder: () => <Encoder />,
  Reflectance: () => <Reflectance />,
  Voltage: () => <Voltage />,
  Rangefinder: () => <Rangefinder />,
  EmotionWidget: () => <EmotionWidget />,
  CameraVisionWidget: () => <CameraVisionWidget />,
  UserProfileMemoryWidget: () => <UserProfileMemoryWidget />,
  RobotChatWidget: () => <RobotChatWidget />,
  CustomEmotionKeywordsWidget: () => <CustomEmotionKeywordsWidget />,
  CustomSensor: ({ sensorName }: { sensorName: string }) => {
    const def = getCustomSensor(sensorName);
    if (!def) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Unknown sensor: {sensorName}
        </div>
      );
    }
    return (
      <CustomXPPSensor
        sensorName={def.sensorName}
        title={def.title}
        channels={def.channels}
        parser={def.parser}
      />
    );
  },

  CustomVariable: ({ initialVarName }: { initialVarName?: string }) => (
    <CustomVariableWidget initialVarName={initialVarName} />
  ),
};

const gridOptions: GridStackOptions = {
  acceptWidgets: true,
  cellHeight: CELL_HEIGHT,
  removable: '#trash',
  columnOpts: {
    breakpointForWindow: true,
    breakpoints: BREAKPOINTS,
    layout: "moveScale",
    columnMax: 12,
  },
  margin: 3,
  draggable: {
    scroll: true,
  },
  float: true,
  children: [],
};

function DashboardHeader() {
  const { t } = useTranslation();
  const { gridStack, removeWidget, _rawWidgetMetaMap } = useGridStackContext();
  const [simRunning, setSimRunning] = useState(isSimulatorRunning());

  const handleReset = () => {
    if (!window.confirm(
      'Remove all sensor widgets from the dashboard?'
    )) return;

    // Remove all widgets via GridStack
    if (gridStack) {
      const ids = Array.from(_rawWidgetMetaMap.value.keys());
      for (const id of ids) {
        removeWidget(id);
      }
    }
  };

  const handleToggleSim = () => {
    if (simRunning) {
      stopSimulator();
      setSimRunning(false);
    } else {
      startSimulator();
      setSimRunning(true);
    }
  };

  const isDev = import.meta.env.DEV;

  return (
    <div className="flex justify-between items-center mb-2 pt-2">
      <h1 className="text-2xl font-bold text-gray-600 dark:text-gray-300">
        {t('sensors')}
      </h1>
      <div className="flex items-center gap-2">
        {/* Dev simulator toggle — only visible in dev builds */}
        {isDev && (
          <button
            onClick={handleToggleSim}
            className={`p-2 rounded transition-colors duration-200 ${simRunning
              ? 'text-green-500 bg-green-50 hover:bg-green-100'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            title={simRunning ? 'Stop simulator' : 'Start simulator (fake XPP data)'}
          >
            <FaBug size={18} />
          </button>
        )}

        <button
          onClick={handleReset}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
          title={'Reset Dashboard'}
        >
          <FaUndo size={18} />
        </button>

        <AddWidgets />
      </div>
    </div>
  );
}

export default function XRPDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let parent = el.parentElement;
    while (parent) {
      if (parent.classList.contains('flexlayout__tab')) {
        parent.style.overflow = 'auto';
        break;
      }
      parent = parent.parentElement;
    }

    parent = el.parentElement;
    while (parent) {
      if (parent.classList.contains('flexlayout__tab_moveable')) {
        parent.style.overflow = 'auto';
        break;
      }
      parent = parent.parentElement;
    }
  }, []);

  return (
    <div ref={containerRef} className="mx-auto px-4 pb-10 bg-slate-100 min-h-full dark:bg-mountain-mist-950">
      <GridStackProvider initialOptions={gridOptions}>
        <DashboardHeader />
        <div className="relative top-35 border-t-4 border-gray-300">
          <GridStackRenderProvider>
            <GridStackRender componentMap={COMPONENT_MAP} />
          </GridStackRenderProvider>
        </div>
      </GridStackProvider>
    </div>
  );
}
