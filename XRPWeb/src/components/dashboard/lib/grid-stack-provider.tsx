import type { GridStack, GridStackOptions, GridStackWidget } from "gridstack";
import { type PropsWithChildren, useCallback, useState, useEffect, useRef } from "react";
import { GridStackContext } from "./grid-stack-context";

const STORAGE_KEY = 'xrp-dashboard-config';
const STORAGE_VERSION = '1.0';

interface StoredConfig {
  version: string;
  widgets: GridStackWidget[];
  timestamp: number;
}

interface GridStackProviderProps {
  initialOptions: GridStackOptions;
  enablePersistence?: boolean;
  storageKey?: string;
}

// Load configuration from localStorage
function loadStoredConfig(storageKey: string): GridStackWidget[] | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      console.log('[GridStack] No stored config found');
      return null;
    }

    const config: StoredConfig = JSON.parse(stored);

    if (config.version !== STORAGE_VERSION) {
      console.warn('[GridStack] Config version mismatch, using defaults');
      return null;
    }

    // Validate widgets have required fields
    const validWidgets = config.widgets.filter(w => w.content);

    if (validWidgets.length === 0) {
      console.warn('[GridStack] No valid widgets in stored config');
      return null;
    }

    console.log('[GridStack] Loaded', validWidgets.length, 'widgets from storage');
    return validWidgets;
  } catch (error) {
    console.error('[GridStack] Error loading config:', error);
    return null;
  }
}

// Get initial options with stored widgets
function getInitialOptionsWithStorage(
  initialOptions: GridStackOptions,
  storageKey: string,
  enablePersistence: boolean
): GridStackOptions {
  if (!enablePersistence) {
    return initialOptions;
  }

  const storedWidgets = loadStoredConfig(storageKey);

  if (storedWidgets && storedWidgets.length > 0) {
    return {
      ...initialOptions,
      children: storedWidgets,
    };
  }

  return initialOptions;
}

export function GridStackProvider({
  children,
  initialOptions,
  enablePersistence = true,
  storageKey = STORAGE_KEY,
}: PropsWithChildren<GridStackProviderProps>) {
  // Calculate effective options once before first render
  const [effectiveOptions] = useState<GridStackOptions>(() =>
    getInitialOptionsWithStorage(initialOptions, storageKey, enablePersistence)
  );

  const [gridStack, setGridStack] = useState<GridStack | null>(null);
  const [rawWidgetMetaMap, setRawWidgetMetaMap] = useState<Map<string, GridStackWidget>>(() => new Map());

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenersAttachedRef = useRef(false);

  // Sync rawWidgetMetaMap with GridStack's actual state
  const syncWidgetMap = useCallback(() => {
    if (!gridStack) return;

    const newMap = new Map<string, GridStackWidget>();
    const gridItems = gridStack.getGridItems();

    gridItems.forEach((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const node = (item as any).gridstackNode as GridStackWidget;
      if (node && node.id && node.content) {
        newMap.set(node.id, node);
      }
    });

    console.log('[GridStack] Synced widget map, found', newMap.size, 'widgets');
    setRawWidgetMetaMap(newMap);
  }, [gridStack]);

  // Save to localStorage (debounced)
  const saveToStorage = useCallback(() => {
    if (!enablePersistence || !gridStack) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const widgets: GridStackWidget[] = [];
        const gridItems = gridStack.getGridItems();

        gridItems.forEach((item) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const node = (item as any).gridstackNode as GridStackWidget;
          if (node && node.content) {
            // Save all relevant properties
            widgets.push({
              id: node.id,
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              minW: node.minW,
              minH: node.minH,
              maxW: node.maxW,
              maxH: node.maxH,
              content: node.content,
            });
          }
        });

        if (widgets.length === 0) {
          // If no widgets, remove the stored config
          localStorage.removeItem(storageKey);
          console.log('[GridStack] No widgets to save, cleared storage');
          return;
        }

        const config: StoredConfig = {
          version: STORAGE_VERSION,
          widgets,
          timestamp: Date.now(),
        };

        localStorage.setItem(storageKey, JSON.stringify(config));
        console.log('[GridStack] Saved', widgets.length, 'widgets to storage');
      } catch (error) {
        console.error('[GridStack] Error saving config:', error);
      }
    }, 300);
  }, [enablePersistence, gridStack, storageKey]);

  // Clear stored configuration
  const clearStoredConfig = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log('[GridStack] Cleared storage');
      window.location.reload();
      return true;
    } catch (error) {
      console.error('[GridStack] Error clearing storage:', error);
      return false;
    }
  }, [storageKey]);

  // Set up event listeners when gridStack becomes available
  useEffect(() => {
    if (!gridStack || listenersAttachedRef.current) return;

    listenersAttachedRef.current = true;
    console.log('[GridStack] Attaching event listeners');

    // Initial sync after GridStack is ready
    // Use setTimeout to ensure GridStack has finished rendering
    setTimeout(() => {
      syncWidgetMap();
    }, 0);

    const handleAdded = (_event: Event, items: GridStackWidget[]) => {
      console.log('[GridStack] Widget(s) added:', items.length);
      syncWidgetMap();
      saveToStorage();
    };

    const handleRemoved = (_event: Event, items: GridStackWidget[]) => {
      console.log('[GridStack] Widget(s) removed:', items.length);
      syncWidgetMap();
      saveToStorage();
    };

    const handleChange = () => {
      console.log('[GridStack] Layout changed');
      saveToStorage();
    };

    gridStack.on('added', handleAdded);
    gridStack.on('removed', handleRemoved);
    gridStack.on('change', handleChange);

    return () => {
      gridStack.off('added');
      gridStack.off('removed');
      gridStack.off('change');
      listenersAttachedRef.current = false;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [gridStack, syncWidgetMap, saveToStorage]);

  const addWidget = useCallback(
    (fn: (id: string) => Omit<GridStackWidget, "id">) => {
      if (!gridStack) return;

      const newId = `widget-${Math.random().toString(36).substring(2, 15)}`;
      const widget = fn(newId);

      console.log('[GridStack] Adding widget:', newId);
      gridStack.addWidget({ ...widget, id: newId });
      // syncWidgetMap and saveToStorage are called by the 'added' event handler
    },
    [gridStack]
  );

  const addSubGrid = useCallback(
    (
      fn: (
        id: string,
        withWidget: (w: Omit<GridStackWidget, "id">) => GridStackWidget
      ) => Omit<GridStackWidget, "id">
    ) => {
      if (!gridStack) return;

      const newId = `sub-grid-${Math.random().toString(36).substring(2, 15)}`;

      const widget = fn(newId, (w) => {
        const subWidgetId = `widget-${Math.random().toString(36).substring(2, 15)}`;
        return { ...w, id: subWidgetId };
      });

      gridStack.addWidget({ ...widget, id: newId });
    },
    [gridStack]
  );

  const removeWidget = useCallback(
    (id: string) => {
      if (!gridStack) {
        console.error('[GridStack] Cannot remove widget - no grid instance');
        return;
      }

      console.log('[GridStack] Removing widget:', id);
      const gridItems = gridStack.getGridItems();

      for (const item of gridItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const node = (item as any).gridstackNode;
        if (node && node.id === id) {
          gridStack.removeWidget(item, true);
          // syncWidgetMap and saveToStorage are called by the 'removed' event handler
          return;
        }
      }

      console.error('[GridStack] Widget not found:', id);
    },
    [gridStack]
  );

  const saveOptions = useCallback(() => {
    return gridStack?.save(true, true, (_, widget) => widget);
  }, [gridStack]);

  return (
    <GridStackContext.Provider
      value={{
        initialOptions: effectiveOptions,
        gridStack,

        addWidget,
        removeWidget,
        addSubGrid,
        saveOptions,
        clearStoredConfig,

        _gridStack: {
          value: gridStack,
          set: setGridStack,
        },
        _rawWidgetMetaMap: {
          value: rawWidgetMetaMap,
          set: setRawWidgetMetaMap,
        },
      }}
    >
      {children}
    </GridStackContext.Provider>
  );
}