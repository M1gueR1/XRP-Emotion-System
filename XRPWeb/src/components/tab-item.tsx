import { sanitizeForId } from '@/utils/stringUtils';
import { ReactNode } from 'react';

export interface TabItemProps {
    label: string;
    children: ReactNode;
}

interface TabItemPropsAnimated extends TabItemProps {
    isActive?: boolean;
}

function TabItem({ label, children, isActive }: TabItemPropsAnimated) {
    return (
        <div
            className={`${isActive ? 'block' : 'hidden'}`}
            role="tabpanel"
            aria-labelledby={`tab-${sanitizeForId(label)}`}
            id={`pane-${sanitizeForId(label)}`}
        >
            {children}
        </div>
    );
}

export default TabItem;
