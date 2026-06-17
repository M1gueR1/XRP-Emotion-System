import DialogFooter from '@/components/dialogs/dialog-footer';
import { useTranslation } from 'react-i18next';

type ConfirmationProps = {
    confirmationMessage: string;
    acceptCallback: (name?: string) => void;
    toggleDialog: () => void;
    name?: string;
}

function ConfirmationDlg({confirmationMessage, name, acceptCallback, toggleDialog}: ConfirmationProps) {
    const { t } = useTranslation();

    const handleAccept = () => {
        acceptCallback(name);
    }

    return (
        <div className="flex h-auto w-96 flex-col gap-2 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('confirmTitle')}
                </h1>
            </div>
            <hr className="w-full border-mountain-mist-600 dark:border-matisse-200" />
            <span className='text-md text-mountain-mist-900 dark:text-mountain-mist-300'>{confirmationMessage}</span>
            <hr className="w-full border-mountain-mist-600 dark:border-matisse-200" />
            <DialogFooter
                hideCancelBtn={false}
                disabledAccept={false}
                btnAcceptLabel={t('okButton')}
                btnCancelCallback={toggleDialog}
                btnAcceptCallback={handleAccept}
            />
        </div>
    )
}

export default ConfirmationDlg