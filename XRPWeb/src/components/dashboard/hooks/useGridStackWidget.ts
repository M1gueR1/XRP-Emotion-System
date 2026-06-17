import { useCallback } from 'react';
import { useGridStackContext } from '../lib/grid-stack-context';
import { useGridStackWidgetContext } from '../lib/grid-stack-widget-context';

export function useGridStackWidget() {
  const { removeWidget } = useGridStackContext();
  const { widget } = useGridStackWidgetContext();

  const handleDelete = useCallback(() => {
    if (widget.id && removeWidget) {
      removeWidget(widget.id);
    } else {
      console.error('Could not delete widget — missing ID or removeWidget');
    }
  }, [widget.id, removeWidget]);

  return { widgetId: widget.id, handleDelete };
}
