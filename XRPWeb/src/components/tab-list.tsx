import { ReactElement, useState } from 'react';
import TabItem, { TabItemProps } from '@/components/tab-item';
import React from 'react';
import { sanitizeForId } from '@/utils/stringUtils';

export interface TabListProps {
    activeTabIndex: number;
    children: ReactElement<TabItemProps> | ReactElement<TabItemProps>[];
}

function TabList({ children, activeTabIndex }: TabListProps) {
    const [activeTab, setActiveTab] = useState(activeTabIndex);

    const tabs = React.Children.toArray(children).filter(
        (child): child is ReactElement<TabItemProps> =>
            React.isValidElement(child) && child.type === TabItem,
    );

    const handleTabClick = (index: number) => {
        setActiveTab(index);
    };

    return (
        <div className="w-full">
            <ul
                className="flex flex-row items-center justify-start gap-1"
                role="tablist"
                aria-orientation="horizontal"
            >
                {tabs.map((tab, index) => (
                    <li
                        key={index}
                        className={`rounded-md border-0 px-2 border-shark-400 dark:border-shark-200 text-xl hover:bg-curious-blue-400 dark:hover:bg-shark-400 ${activeTab === index ? 'text-curious-blue-600 dark:text-curious-blue-800 border-b-2 bg-mountain-mist-100 dark:bg-mountain-mist-500' : 'text-shark-300 dark:text-shark-600 bg-mountain-mist-50 dark:bg-mountain-mist-400'}`}
                    >
                        <button
                            key={`tab-btn-${index}`}
                            role="tab"
                            id={`tab-${sanitizeForId(tab.props.label)}`}
                            aria-controls={`panel-${sanitizeForId(tab.props.label)}`}
                            aria-selected={activeTab === index}
                            onClick={() => handleTabClick(index)}
                        >
                            {tab.props.label}
                        </button>
                    </li>
                ))}
            </ul>
            {tabs.map((tab, index) => (
                <TabItem key={index} label={tab.props.label} isActive={activeTab === index}>
                    {tab.props.children}
                </TabItem>
            ))}
        </div>
    );
}

export default TabList;
