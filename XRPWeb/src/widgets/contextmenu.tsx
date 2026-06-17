import React, { useEffect, useRef, useState } from 'react';
import { MenuDataItem } from '@/widgets/menutypes';
import MenuItem from '@/widgets/menu';

type ContextMenuProps = {
    children: React.ReactNode;
    items: MenuDataItem[];
};

function ContextMenu({children, items}: ContextMenuProps) {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef<HTMLDivElement | null>(null);

    const onContextMenuClicked = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        // offset 50 is to correct position in displaying the context menu
        setPosition({ x: event.pageX-50, y: event.pageY-50 });
        console.log(`mouse positions: X: ${event.pageX} Y: ${event.pageY}`);
        setVisible(true);
    }

    const onClicked = () => {
        setVisible(false);
    }

    useEffect(() => {
        document.addEventListener('click', onClicked);
        return () => {
            document.removeEventListener('click', onClicked);
        }
    }, []);

    return (
        <div ref={menuRef} onContextMenu={onContextMenuClicked}>
            {children}
            {visible && (
                <ul
                    style={{top: `${position.y}px`, left: `${position.x}px`}}
                    className='absolute flex flex-col p-2 gap-1 border rounded-sm shadow-md text-matisse-100 bg-curious-blue-700 z-50 transition-all'
                >
                    {items.map((item, index) => (
                        <li 
                            key={index}
                            className='hover:bg-curious-blue-400'
                            onClick={item.clicked}
                        >
                            <MenuItem key={index} item={item} isConnected={true} isOther={false}/>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default ContextMenu;
