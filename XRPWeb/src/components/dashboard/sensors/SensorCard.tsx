import React, { ReactNode, useEffect, useRef } from 'react';

interface SensorCardProps {
  title: string;
  icon: ReactNode;
  onStart: () => void;
  onStop: () => void;
  isConnected: boolean;
  children: ReactNode;
  lastUpdated?: string;
}

const SensorCard: React.FC<SensorCardProps> = ({
  title,
  icon,
  children,
  lastUpdated
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const adjustStyles = () => {
    const card = cardRef.current;
    if (!card) return;

    const width = card.clientWidth;
    const height = card.clientHeight;

    // Adjust font sizes based on container size
    if (width < 200) {
      card.classList.add('sensor-card-xs');
      card.classList.remove('sensor-card-sm', 'sensor-card-md', 'sensor-card-lg');
    } else if (width < 300) {
      card.classList.add('sensor-card-sm');
      card.classList.remove('sensor-card-xs', 'sensor-card-md', 'sensor-card-lg');
    } else if (width < 400) {
      card.classList.add('sensor-card-md');
      card.classList.remove('sensor-card-xs', 'sensor-card-sm', 'sensor-card-lg');
    } else {
      card.classList.add('sensor-card-lg');
      card.classList.remove('sensor-card-xs', 'sensor-card-sm', 'sensor-card-md');
    }

    // Adjust content area height based on card height
    const contentArea = card.querySelector('.sensor-content-area') as HTMLElement;
    if (contentArea) {
      const headerHeight = card.querySelector('.sensor-header')?.clientHeight || 0;
      const footerHeight = card.querySelector('.sensor-footer')?.clientHeight || 0;
      const availableHeight = height - headerHeight - footerHeight - 16; // Subtract padding

      contentArea.style.height = `${Math.max(50, availableHeight)}px`;
    }
  };

  // Set up resize observer to detect changes in the card's size
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    adjustStyles();

    const resizeObserver = new ResizeObserver(() => {
      adjustStyles();
    });

    resizeObserver.observe(card);

    // Listen for GridStack resize events
    const handleGridStackResize = () => {
      setTimeout(adjustStyles, 0);
    };

    document.addEventListener('gridstack.resize', handleGridStackResize);
    document.addEventListener('gridstack.resizestop', handleGridStackResize);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('gridstack.resize', handleGridStackResize);
      document.removeEventListener('gridstack.resizestop', handleGridStackResize);
    };
  }, []);

  return (

    <div ref={cardRef} className="sensor-card rounded-xl bg-white shadow w-full h-full flex flex-col border-gray-300 border-4">
      <div className="sensor-header flex justify-between items-center p-3">
        <div className="flex items-center gap-2">
          <div className="text-gray-600 dark:text-gray-300 text-2xl">
            {icon}
          </div>
          <h3 className="font-semibold text-gray-600 dark:text-gray-300">{title}</h3>
        </div>
      </div>

      <div className="sensor-content-area flex-grow flex justify-center items-center p-2 overflow-hidden">
        {children}
      </div>

      <div className="sensor-footer flex justify-between items-center p-3">
        <div className="text-xs text-gray-400 dark:text-gray-300">
          {lastUpdated && (
            <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
          )}
        </div>

      </div>
    </div>
  );
};

export default SensorCard;