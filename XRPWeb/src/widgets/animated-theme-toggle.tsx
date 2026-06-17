import { Themes } from '@/managers/appmgr';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';

type AnimatedThemeToggleProps = {
    labelLeft?: string;
    labelRight?: string;
    initial?: boolean;
    onToggle?: (state: Themes) => void;
};

export default function AnimatedThemeToggle({
    labelLeft,
    labelRight,
    initial,
    onToggle,
}: AnimatedThemeToggleProps) {
    const [enabled, setEnabled] = React.useState(initial);

    useEffect(() => {
        setEnabled(initial);
    }, [initial]);

    const handleToggle = () => {
        const newState = !enabled;
        setEnabled(newState);
        if (onToggle) {
            onToggle(newState ? Themes.DARK : Themes.LIGHT);
        }
    };

    return (
        <label className="flex items-center gap-2 cursor-pointer">
            {/* Checkbox input (hidden) */}
            <input
                type="checkbox"
                className="peer sr-only"
                checked={enabled}
                onChange={handleToggle}
                aria-label="Theme toggle"
            />
            {/* Label left */}
            {labelLeft && (
                <span className="select-none ml-3 text-shark-900 dark:text-shark-200">{labelLeft}</span>
            )}
            {/* Toggle Track */}
            <div className="relative flex items-center h-9 w-20 rounded-full bg-curious-blue-700 dark:bg-curious-blue-500 transition-colors duration-200 ease-in-out peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-curious-blue-400 dark:peer-focus:ring-mountain-mist-500">
                {/* Toggle slider/circle */}
                <div
                    className={clsx(
                        'bg-mountain-mist-200 dark:bg-shark-500 absolute left-1 top-0.5 h-8 w-8 rounded-full shadow-md transform transition-transform duration-300 ease-in-out',
                        'flex items-center justify-center', // Center the icon
                        {
                            'translate-x-10': enabled,
                            'translate-x-0': !enabled,
                        },
                    )}
                >
                    {/* Conditionally render icon inside the circle */}
                    {enabled ? (
                        <FiMoon className="text-blue-800" size={20} />
                    ) : (
                        <FiSun className="text-yellow-500" size={20} />
                    )}
                </div>
            </div>
            {/* Label right */}
            {labelRight && (
                <span className="select-none text-shark-900 dark:text-shark-200">{labelRight}</span>
            )}
        </label>
    );
}
