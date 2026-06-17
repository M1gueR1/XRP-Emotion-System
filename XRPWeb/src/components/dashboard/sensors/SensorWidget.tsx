import { useState } from 'react';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FaChartLine, FaHashtag, FaCog, FaTrash } from 'react-icons/fa';
import { FlowBiteConstants } from '@/utils/constants';
import { useTranslation } from 'react-i18next';
import SensorCard from './SensorCard';
import { useGridStackWidget } from '../hooks/useGridStackWidget';
import { useSensorHistory } from '../hooks/useSensorHistory';
import { SensorConfig, SensorChannel } from './types';

interface SensorWidgetProps<TData, THistoryEntry> {
  config: SensorConfig<TData, THistoryEntry>;
}

/**
 * Default number view: renders a responsive grid of channel values.
 * Used when a sensor config doesn't provide a custom renderNumberView.
 */
function DefaultNumberView<TData>({
  data,
  channels,
}: {
  data: TData;
  channels: SensorChannel[];
}) {
  const cols = channels.length <= 3 ? channels.length : Math.min(4, channels.length);
  return (
    <div
      className="grid gap-2 text-center p-4 flex-grow"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {channels.map((ch) => {
        const value = (data as Record<string, number>)[ch.key];
        return (
          <div key={ch.key} className="flex flex-col items-center justify-center">
            <span className="text-xs font-medium" style={{ color: ch.color }}>
              {ch.label}
            </span>
            <span className="font-mono text-lg">
              {typeof value === 'number' ? value.toFixed(ch.decimals ?? 2) : value}
            </span>
            {ch.unit && (
              <span className="text-xs text-gray-500">{ch.unit}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Generic sensor widget that handles all shared UI logic:
 */
function SensorWidget<TData, THistoryEntry>({
  config,
}: SensorWidgetProps<TData, THistoryEntry>) {
  const { t } = useTranslation();
  const { handleDelete } = useGridStackWidget();
  const [viewMode, setViewMode] = useState<'number' | 'graph'>('number');

  const {
    currentData,
    lastUpdated,
    history,
    handleStart,
    handleStop,
    requestSensors,
  } = useSensorHistory<TData, THistoryEntry>(
    config.sensorName,
    config.toHistoryEntry
  );

  const handleViewChange = (mode: 'number' | 'graph') => {
    setViewMode(mode);
    requestSensors([config.sensorName]);
  };

  const tooltipFormatter = config.tooltipFormatter
    ?? ((value: number) => value.toFixed(2));

  const sensorCardProps = {
    title: t(config.titleKey),
    icon: config.icon,
    onStart: handleStart,
    onStop: handleStop,
    isConnected: true,
    lastUpdated,
  };

  return (
    <SensorCard {...sensorCardProps}>
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <Dropdown
          label={<FaCog size={12} />}
          inline
          theme={FlowBiteConstants.DropdownTheme}
          className="font-bold flex items-center text-xs border border-gray-300 rounded"
        >
          <DropdownItem onClick={() => handleViewChange('graph')}>
            <div className="flex items-center space-x-2">
              <FaChartLine size={12} />
              <span>{t('graph')}</span>
            </div>
          </DropdownItem>
          <DropdownItem onClick={() => handleViewChange('number')}>
            <div className="flex items-center space-x-2">
              <FaHashtag size={12} />
              <span>{t('number')}</span>
            </div>
          </DropdownItem>
        </Dropdown>

        <button
          onClick={handleDelete}
          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
          title="Delete widget"
        >
          <FaTrash size={12} />
        </button>
      </div>

      {/* Content */}
      {!currentData ? (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-gray-500 dark:text-gray-400">
            {t('no-data-available')}
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full h-full relative pt-12">
          {viewMode === 'graph' ? (
            history.length > 0 && (
              <div className="mt-4 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(history as Record<string, unknown>[]).slice(-50)}>
                    <XAxis dataKey="timestamp" tick={false} label={t('time')} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value as number).toLocaleTimeString()
                      }
                      formatter={(value) =>
                        typeof value === 'number' ? tooltipFormatter(value) : value
                      }
                    />
                    {config.channels.map((ch) => (
                      <Line
                        key={ch.key}
                        type="monotone"
                        dataKey={ch.key}
                        stroke={ch.color}
                        dot={false}
                        name={ch.label}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-xs text-gray-500 text-center mt-2 dark:text-gray-400">
                  {history.length} {t('readings-stored')}
                </div>
              </div>
            )
          ) : config.renderNumberView ? (
            config.renderNumberView(currentData, config.channels)
          ) : (
            <DefaultNumberView data={currentData} channels={config.channels} />
          )}
        </div>
      )}
    </SensorCard>
  );
}

export default SensorWidget;
