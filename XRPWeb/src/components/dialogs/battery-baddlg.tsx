import SadBattery from '@assets/images/sad-battery.png';
import DialogFooter from './dialog-footer';
import { useTranslation } from 'react-i18next';

type BatteryBadDlgProps = {
    cancelCallback: () => void;
}

export default function BatteryBadDlg({cancelCallback}: BatteryBadDlgProps) {
    const { t } = useTranslation();
    return (
        <div className="flex h-auto w-96 flex-col gap-2 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700">{t('sad-battery-title')}</h1>
                <p className='text-sm text-mountain-mist-700'>{t('sad-battery-desc')}</p>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <img src={SadBattery} width={'400px'} height={'400px'} alt={t('sad-battery-title')} />
            <hr className="w-full border-mountain-mist-600" />
            <DialogFooter disabledAccept={false} btnAcceptLabel={t('okButton')} btnCancelCallback={cancelCallback} btnAcceptCallback={cancelCallback} />
        </div>
    )
}