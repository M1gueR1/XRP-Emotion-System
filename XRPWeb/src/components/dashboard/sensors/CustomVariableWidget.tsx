import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaPlug, FaTrash, FaPen, FaCheck, FaPaperPlane } from 'react-icons/fa';
import AppMgr, { EventType } from '@/managers/appmgr';
import { CustomVarMeta, NetworkTable } from '@/managers/tablemgr';
import { useGridStackWidget } from '../hooks/useGridStackWidget';
import { sendVariableUpdate, varTypeName } from '../utils/xppUtils';
import SensorCard from './SensorCard';

interface CustomVariableWidgetProps {
  /** Optional initial variable name (from saved layout) */
  initialVarName?: string;
}

/**
 * A bidirectional custom variable widget for XPP puppet protocol variables.
 */
const CustomVariableWidget: React.FC<CustomVariableWidgetProps> = ({
  initialVarName = '',
}) => {
  const { handleDelete } = useGridStackWidget();

  // Variable name the user is targeting
  const [varName, setVarName] = useState(initialVarName);
  const [isEditingName, setIsEditingName] = useState(!initialVarName);
  const [nameInput, setNameInput] = useState(initialVarName);

  // Live data from XRP
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [varMeta, setVarMeta] = useState<CustomVarMeta | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);

  // User input for sending back
  const [editValue, setEditValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  // Available custom variable names (for suggestions)
  const [availableVars, setAvailableVars] = useState<string[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Listen to NetworkTable updates
  useEffect(() => {
    const handleData = (data: string) => {
      try {
        const table: NetworkTable = JSON.parse(data);
        const meta = table.__customVarMeta as Record<string, CustomVarMeta> | undefined;

        // Update available variables list
        if (meta) {
          setAvailableVars(Object.keys(meta));
        }

        // If we have a target variable name, check if it exists
        if (varName && meta && meta[varName]) {
          setVarMeta(meta[varName]);
          const value = table[varName];
          if (typeof value === 'number') {
            setCurrentValue(value);
            setLastUpdated(new Date().toISOString());
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    AppMgr.getInstance().on(EventType.EVENT_DASHBOARD_DATA, handleData);
    return () => {
    };
  }, [varName]);

  // Focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  const confirmName = useCallback(() => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setVarName(trimmed);
      setIsEditingName(false);
      setCurrentValue(null);
      setVarMeta(null);
      setSendStatus('idle');
    }
  }, [nameInput]);

  const handleSendValue = useCallback(async () => {
    if (!varMeta || editValue === '') return;

    const numValue = Number(editValue);
    if (isNaN(numValue)) return;

    setIsSending(true);
    setSendStatus('idle');

    const ok = await sendVariableUpdate(varMeta, numValue);
    setSendStatus(ok ? 'ok' : 'err');
    setIsSending(false);

    if (ok) {
      setEditValue('');
      // Clear status after a moment
      setTimeout(() => setSendStatus('idle'), 1500);
    }
  }, [varMeta, editValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendValue();
    }
  }, [handleSendValue]);

  const isConnected = varMeta !== null;
  const typeLabel = varMeta ? varTypeName(varMeta.type) : '';

  return (
    <SensorCard
      title={varName || 'Custom Variable'}
      icon={<FaPlug size={12} />}
      onStart={() => { }}
      onStop={() => { }}
      isConnected={isConnected}
      lastUpdated={lastUpdated}
    >
      <div className="absolute top-4 right-4">
        <button
          onClick={handleDelete}
          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
          title="Delete widget"
        >
          <FaTrash size={12} />
        </button>
      </div>

      <div className="flex flex-col w-full h-full p-3 pt-10 gap-3">
        {/* Variable name input / display */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <>
              <input
                ref={nameInputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmName()}
                placeholder="variable_name"
                list="custom-var-suggestions"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <datalist id="custom-var-suggestions">
                {availableVars.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <button
                onClick={confirmName}
                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                title="Confirm"
              >
                <FaCheck size={12} />
              </button>
            </>
          ) : (
            <>
              <code className="flex-1 text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
                {varName}
              </code>
              {typeLabel && (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">
                  {typeLabel}
                </span>
              )}
              <button
                onClick={() => { setIsEditingName(true); setNameInput(varName); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Change variable name"
              >
                <FaPen size={10} />
              </button>
            </>
          )}
        </div>
        {!varName ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Enter a variable name above
          </div>
        ) : !isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <div className="text-gray-400 text-sm">
              Waiting for <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{varName}</code>
            </div>
            <div className="text-gray-300 text-xs">
              Define it on the XRP with puppet.define_variable('{varName}', ...)
            </div>
            {availableVars.length > 0 && (
              <div className="text-xs text-gray-400 mt-2">
                Available: {availableVars.map((v, i) => (
                  <button
                    key={v}
                    onClick={() => { setVarName(v); setNameInput(v); setIsEditingName(false); }}
                    className="font-mono text-blue-500 hover:underline mx-0.5"
                  >
                    {v}{i < availableVars.length - 1 ? ',' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Current value from XRP */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-400 mb-1">From XRP</div>
              <div className="text-3xl font-mono font-bold text-gray-700 dark:text-gray-200">
                {currentValue !== null ? currentValue.toFixed(
                  varMeta.type === 2 ? 4 : 0 // float: 4 decimals, int/bool: 0
                ) : '—'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Send ${typeLabel} to XRP...`}
                step={varMeta.type === 2 ? 'any' : '1'}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={handleSendValue}
                disabled={isSending || editValue === ''}
                className={`p-2 rounded transition-colors duration-200 ${sendStatus === 'ok'
                  ? 'text-green-500 bg-green-50'
                  : sendStatus === 'err'
                    ? 'text-red-500 bg-red-50'
                    : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                  } disabled:opacity-40`}
                title="Send to XRP"
              >
                {sendStatus === 'ok' ? <FaCheck size={14} /> : <FaPaperPlane size={14} />}
              </button>
            </div>
          </>
        )}
      </div>
    </SensorCard>
  );
};

export default CustomVariableWidget;