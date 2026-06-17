import { useTranslation } from 'react-i18next';
import DialogFooter from './dialog-footer';

type AlertProps = {
    alertMessage: string;
    toggleDialog: () => void;
};

export default function AlertDialog({ alertMessage, toggleDialog }: AlertProps) {
    const { t } = useTranslation();
    return (
        <div className="flex h-auto w-96 flex-col gap-2 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('alert')}
                </h1>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <span className='text-md text-mountain-mist-900 dark:text-mountain-mist-300'>{alertMessage}</span>
            <hr className="w-full border-mountain-mist-600" />
            <DialogFooter
                hideCancelBtn={true}
                disabledAccept={false}
                btnAcceptLabel={t('okButton')}
                btnCancelCallback={toggleDialog}
                btnAcceptCallback={toggleDialog}
            />
        </div>
    );
}
