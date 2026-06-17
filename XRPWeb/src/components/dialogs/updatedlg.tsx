import DialogFooter from './dialog-footer';
import { ConnectionType, Versions } from '@/utils/types';
import { useEffect, useState } from 'react';
import AppMgr from '@/managers/appmgr';
import { useTranslation } from 'react-i18next';

type UpdateDlgProps = {
    isUpdateMP: boolean;
    isUpdateLib: boolean;
    mpVersion?: Versions;
    xrpVersion?: Versions;
    updateCallback: () => void;
    toggleDialog: () => void;
};

export default function UpdateDlg({
    isUpdateMP,
    isUpdateLib,
    mpVersion,
    xrpVersion,
    updateCallback,
    toggleDialog,
}: UpdateDlgProps) {
    const { t } = useTranslation();
    const [connectionType, setConnectionType] = useState(ConnectionType.USB);

    useEffect(() => {
        if (AppMgr.getInstance().getConnectionType() === ConnectionType.BLUETOOTH) {
            setConnectionType(ConnectionType.BLUETOOTH);
        } else {
            setConnectionType(ConnectionType.USB);
        }
    }, []);

    const handleUpdate = async () => {
        if (isUpdateMP && mpVersion && updateCallback) {
            updateCallback();
        } else if (isUpdateLib && xrpVersion && updateCallback) {
            updateCallback();
        }
        toggleDialog();
    };

    return (
        <div className="flex flex-col items-center gap-4 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex w-[90%] flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('update')}
                </h1>
                <p className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('update-desc')}
                </p>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <div className="flex flex-col items-start gap-2">
                {isUpdateMP && (
                    <p className="text-md text-left text-mountain-mist-700 dark:text-mountain-mist-300">
                        {t('update-MP')}
                    </p>
                )}
                {isUpdateLib && (
                    <p className="text-md text-left text-mountain-mist-700 dark:text-mountain-mist-300">
                        {t('update-lib')}
                    </p>
                )}
                {mpVersion && (
                    <>
                        <div className="flex flex-row gap-2">
                            <label className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                                {t('current-mp-version')}
                            </label>
                            <span className="text-sm text-mountain-mist-900 dark:text-mountain-mist-300">
                                {mpVersion?.currentVersion}
                            </span>
                        </div>
                        <div className="flex flex-row gap-2">
                            <label className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                                {t('available-mp-version')}
                            </label>
                            <span className="text-sm text-mountain-mist-900 dark:text-mountain-mist-300">
                                {mpVersion?.newVersion}
                            </span>
                        </div>
                    </>
                )}
                {xrpVersion && (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                                {t('current-lib-version')}
                            </label>
                            <span className="text-sm text-mountain-mist-900 dark:text-mountain-mist-300">
                                {xrpVersion?.currentVersion}
                            </span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                                {t('available-lib-version')}
                            </label>
                            <span className="text-sm text-mountain-mist-900 dark:text-mountain-mist-300">
                                {xrpVersion?.newVersion}
                            </span>
                        </div>
                    </>
                )}
                <p className="text-md text-left text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('update-inst')}
                </p>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <DialogFooter
                disabledAccept={connectionType === ConnectionType.BLUETOOTH}
                btnAcceptLabel={t('OK')}
                btnAcceptCallback={handleUpdate}
                btnCancelCallback={toggleDialog}
            />
        </div>
    );
}
