import { createPortal } from "react-dom";
import { useGridStackContext } from "./grid-stack-context";
import { useGridStackRenderContext } from "./grid-stack-render-context";
import { GridStackWidgetContext } from "./grid-stack-widget-context";
import { GridStackWidget } from "gridstack";
import { ComponentType } from "react";

export interface ComponentDataType<T = object> {
  name: string;
  props: T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentMap = Record<string, ComponentType<any>>;

function parseWidgetMetaToComponentData(
  meta: GridStackWidget
): ComponentDataType & { error: unknown } {
  let error = null;
  let name = "";
  let props = {};
  try {
    if (meta.content) {
      const result = JSON.parse(meta.content) as {
        name: string;
        props: object;
      };
      name = result.name;
      props = result.props;
    }
  } catch (e) {
    error = e;
    console.error('[GridStackRender] Error parsing widget content:', e, meta.content);
  }
  return {
    name,
    props,
    error,
  };
}

export function GridStackRender(props: { componentMap: ComponentMap }) {
  const { _rawWidgetMetaMap } = useGridStackContext();
  const { getWidgetContainer } = useGridStackRenderContext();

  return (
    <>
      {Array.from(_rawWidgetMetaMap.value.entries()).map(([id, meta]) => {
        const componentData = parseWidgetMetaToComponentData(meta);

        // Skip widgets with parse errors
        if (componentData.error) {
          console.error(`[GridStackRender] Skipping widget ${id} due to parse error`);
          return null;
        }

        const WidgetComponent = props.componentMap[componentData.name];

        // Skip widgets with unknown component names
        if (!WidgetComponent) {
          console.error(`[GridStackRender] Unknown component: "${componentData.name}" for widget ${id}`);
          return null;
        }

        const widgetContainer = getWidgetContainer(id);

        // Skip widgets without containers (they may not be ready yet)
        if (!widgetContainer) {
          console.warn(`[GridStackRender] Container not found for widget ${id}, skipping`);
          return null;
        }

        return (
          <GridStackWidgetContext.Provider key={id} value={{ widget: { id } }}>
            {createPortal(
              <WidgetComponent {...componentData.props} />,
              widgetContainer
            )}
          </GridStackWidgetContext.Provider>
        );
      })}
    </>
  );
}