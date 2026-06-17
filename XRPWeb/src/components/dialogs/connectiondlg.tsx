/// <reference types="web-bluetooth" />
import Bluetooth from '@assets/images/Bluetooth_FM_Black.png';
import Usb from '@assets/images/USB_icon.svg.png';
import { ConnectionType, ListItem } from '@/utils/types';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

type ConnProps = {
    callback: (connection: ConnectionType) => void;
};

interface ConnectionItem extends ListItem {
    disabled?: boolean;
}

/**
 * Connection Dialog content
 * @param param0
 * @returns
 */
function ConnectionDlg(connprops: ConnProps) {
    const { t } = useTranslation();
    const [isBluetoothAvailable, setIsBluetoothAvailable] = useState<boolean>(true);

    useEffect(() => {
        if (navigator.bluetooth && typeof navigator.bluetooth.getAvailability === 'function') {
            navigator.bluetooth
                .getAvailability()
                .then((available) => {
                    setIsBluetoothAvailable(available);
                })
                .catch(() => {
                    setIsBluetoothAvailable(false);
                });
        } else {
            setIsBluetoothAvailable(false);
        }
    }, []);

    // list of items to display
    const items: ConnectionItem[] = [
        {
            label: t('bluetoothConnection'),
            image: Bluetooth,
            disabled: !isBluetoothAvailable,
        },
        {
            label: t('usbConnection'),
            image: Usb,
        },
    ];

    /**
     * Connection handler - handledClick
     * @param item
     */
    const handleItemClick = (item: ConnectionItem) => {
        if (item.disabled) return;
        console.log(item);
        switch (item.label) {
            case t('bluetoothConnection'):
                connprops.callback(ConnectionType.BLUETOOTH);
                break;
            case t('usbConnection'):
                connprops.callback(ConnectionType.USB);
                break;
            default:
                break;
        }
    };

    return (
        <div className="border rounded-md border-mountain-mist-700 dark:border-shark-500 dark:bg-shark-950 flex h-auto w-96 flex-col items-center gap-2 p-4 shadow-md transition-all">
            <h1 className='text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300'>{t('connections')}</h1>
            <p className='text-sm text-mountain-mist-700 dark:text-mountain-mist-300'>{t('selectConnection')}</p>
            <hr className="w-full border-mountain-mist-600" />
            <ul>
                {items.map((item) => (
                    <li
                        key={item.label}
                        className={`flex flex-row items-center gap-2 px-3 py-1 text-neutral-900 ${
                            item.disabled
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-matisse-300 dark:hover:bg-shark-400 hover:text-neutral-100 cursor-pointer'
                        }`}
                        onClick={() => handleItemClick(item)}
                        title={item.disabled ? t('bluetooth-not-supported') : ''}
                    >
                        <img data-testid={item.label} src={item.image} height="28px" width="36px" />
                        <span className='text-mountain-mist-700 dark:text-mountain-mist-300'>{item.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ConnectionDlg;
