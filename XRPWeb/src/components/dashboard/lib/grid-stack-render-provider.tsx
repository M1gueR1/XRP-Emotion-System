import {
  PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useGridStackContext } from "./grid-stack-context";
import { GridStack, GridStackOptions, GridStackWidget } from "gridstack";
import { GridStackRenderContext } from "./grid-stack-render-context";
import isEqual from "react-fast-compare";

export function GridStackRenderProvider({ children }: PropsWithChildren) {
  const {
    _gridStack: { value: gridStack, set: setGridStack },
    _rawWidgetMetaMap: { set: setRawWidgetMetaMap },
    initialOptions,
  } = useGridStackContext();

  const widgetContainersRef = useRef<Map<string, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<GridStackOptions>(initialOptions);

  const renderCBFn = useCallback(
    (element: HTMLElement, widget: GridStackWidget) => {
      if (widget.id) {
        console.log('[GridStackRenderProvider] renderCB called for widget:', widget.id);
        widgetContainersRef.current.set(widget.id, element);
      }
    },
    []
  );

  // Sync the widget meta map from GridStack's actual state
  const syncWidgetMapFromGrid = useCallback((grid: GridStack) => {
    const newMap = new Map<string, GridStackWidget>();
    const gridItems = grid.getGridItems();

    console.log('[GridStackRenderProvider] Syncing widget map, grid has', gridItems.length, 'items');

    gridItems.forEach((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const node = (item as any).gridstackNode as GridStackWidget;
      if (node && node.id && node.content) {
        console.log('[GridStackRenderProvider] Found widget:', node.id, 'with content');
        newMap.set(node.id, node);
      } else {
        console.warn('[GridStackRenderProvider] Widget missing id or content:', node);
      }
    });

    console.log('[GridStackRenderProvider] Setting widget map with', newMap.size, 'widgets');
    setRawWidgetMetaMap(newMap);
  }, [setRawWidgetMetaMap]);

  const initGrid = useCallback(() => {
    if (containerRef.current) {
      console.log('[GridStackRenderProvider] Initializing GridStack with options:', {
        childrenCount: optionsRef.current.children?.length || 0
      });

      GridStack.renderCB = renderCBFn;
      const grid = GridStack.init(optionsRef.current, containerRef.current);

      // Sync widget map immediately after init
      // Use setTimeout to ensure renderCB has been called for all widgets
      setTimeout(() => {
        syncWidgetMapFromGrid(grid);
      }, 0);

      return grid;
    }
    return null;
  }, [renderCBFn, syncWidgetMapFromGrid]);

  useLayoutEffect(() => {
    if (!isEqual(initialOptions, optionsRef.current) && gridStack) {
      try {
        console.log('[GridStackRenderProvider] Options changed, reinitializing grid');
        gridStack.removeAll(false);
        gridStack.destroy(false);
        widgetContainersRef.current.clear();
        optionsRef.current = initialOptions;
        setGridStack(initGrid());
      } catch (e) {
        console.error("[GridStackRenderProvider] Error reinitializing gridstack", e);
      }
    }
  }, [initialOptions, gridStack, initGrid, setGridStack]);

  useLayoutEffect(() => {
    if (!gridStack) {
      try {
        console.log('[GridStackRenderProvider] No grid, initializing');
        setGridStack(initGrid());
      } catch (e) {
        console.error("[GridStackRenderProvider] Error initializing gridstack", e);
      }
    }
  }, [gridStack, initGrid, setGridStack]);

  // Re-sync widget map when gridStack changes
  useEffect(() => {
    if (gridStack) {
      // Additional sync after grid is set in state
      setTimeout(() => {
        syncWidgetMapFromGrid(gridStack);
      }, 50);
    }
  }, [gridStack, syncWidgetMapFromGrid]);

  return (
    <GridStackRenderContext.Provider
      value={useMemo(
        () => ({
          getWidgetContainer: (widgetId: string) => {
            const container = widgetContainersRef.current.get(widgetId);
            if (!container) {
              console.warn('[GridStackRenderProvider] Container not found for:', widgetId);
              console.warn('[GridStackRenderProvider] Available containers:', Array.from(widgetContainersRef.current.keys()));
            }
            return container || null;
          },
        }),
        [gridStack]
      )}
    >
      <div ref={containerRef}>{gridStack ? children : null}</div>
    </GridStackRenderContext.Provider>
  );
}