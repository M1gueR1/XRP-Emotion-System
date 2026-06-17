// Copyright (c) Experiential Inc. and other XRP contributors.
// Open Source Software; you can modify and share it under the terms of the
// GNU General Public License v.3.
// See https://www.gnu.org/licenses/
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details
import { BluetoothConnection } from '@/connections/bluetoothconnection';
import AppMgr from '@/managers/appmgr';
import Button from '@/widgets/button';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type BackupRestoreDlgProps = {
    /**
     * Function to toggle the visibility of the dialog
     */
    toggleDialog: () => void;
    onBackup: () => void;
    onRestore: () => void;
}

/**
 * BackupRestoreDlg component for displaying backup and restore options.
 * @param toggleDialog Function to toggle the visibility of the dialog
 * @param onBackup Function to handle backup operation
 * @param onRestore Function to handle restore operation
 * @returns BackupRestoreDlg component
 */
function BackupRestoreDlg({toggleDialog, onBackup, onRestore}: BackupRestoreDlgProps) {
    const { t } = useTranslation();
    const [isBackRestoreDisabled, setIsBackRestoreDisabled] = useState(true);
    const [isBluetoothConnection, setIsBluetoothConnection] = useState(false);

    useEffect(() => {
        if (AppMgr.getInstance().getConnection()?.isConnected && AppMgr.getInstance().authService.isLogin) {
            setIsBackRestoreDisabled(false);
            if (AppMgr.getInstance().getConnection() instanceof BluetoothConnection) {
                setIsBluetoothConnection(true);
            }
        } else {
            setIsBackRestoreDisabled(true);
        }
    }, []);

  return (
    <div className="w-96 flex flex-col items-center gap-4 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
        <div className="flex w-[90%] flex-col items-center">
            <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">{t('backup-restore.title')}</h1>
            <p className="text-sm text-wrap text-mountain-mist-700 dark:text-mountain-mist-300">{t('backup-restore.description')}</p>
        </div>
        <hr className="w-full border-mountain-mist-600" />
        <div className="flex flex-row justify-center gap-4">
            <Button onClicked={onBackup} disabled={isBackRestoreDisabled}>
                {t('backup-restore.backup')}
            </Button>
            <Button onClicked={onRestore} disabled={isBackRestoreDisabled}>
                {t('backup-restore.restore')}
            </Button>
        </div>
        <hr className="w-full border-mountain-mist-600" />
        {isBluetoothConnection &&
            <p className='text-sm text-red-500 dark:text-red-300'>{t('backup-restore.bluetooth-warning')}</p>
        }
        <div className="flex w-full flex-row justify-end gap-4">
            <Button onClicked={toggleDialog}>
                {t('backup-restore.close')}
            </Button>
        </div>
    </div>
  )
}

export default BackupRestoreDlg;