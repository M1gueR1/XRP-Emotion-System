// Copyright (c) Experiential Inc. and other XRP contributors.
// Open Source Software; you can modify and share it under the terms of the
// GNU General Public License v.3.
// See https://www.gnu.org/licenses/
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details
import AppMgr from "@/managers/appmgr";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ProgressBar from 'react-customizable-progressbar';
import Button from "@/widgets/button";
import { CommandToXRPMgr } from "@/managers/commandstoxrpmgr";
import { Constants } from "@/utils/constants";
import { FolderItem } from "@/utils/types";

type BackupDlgProps = {
    toggleDialog: () => void;
};

/**
 * BackupDlg component for displaying backup progress.
 * @param toggleDialog Function to toggle the visibility of the dialog
 * @returns BackupDlg component
 */
function BackupDlg({ toggleDialog }: BackupDlgProps) {
    const { t } = useTranslation();
    const [progress, setProgress] = useState(0);
    const [progressItem, setProgressItem] = useState<string>('');
    const [isBackup, setIsBackup] = useState(false);

    /*
     * Begin backup process
     */
    const beginBackup = async () => {
        setIsBackup(true);
        const runBackup = async () => {
            // Need to get the XRP Robot folder list here.
            const data = JSON.parse(await CommandToXRPMgr.getInstance().getOnBoardFSTree(false));
            const fileTree: FolderItem[] = data.at(0).children.filter((item: FolderItem) => 
                (item.name !== 'lib' && item.name !== 'XRPExamples' && item.name !== 'gusers' && item.name !== 'trash')).map(
                (item: FolderItem) => ({
                    name: item.name,
                    id: item.id,
                    isReadOnly: item.isReadOnly,
                    path: item.path,
                    children: item.children
                })
            );
            // if the backup folder does not exist, create it under the XRPCODE folder
            const xrpCodeFolder = await AppMgr.getInstance().driveService.findFolderByName(Constants.XRPCODE);
            if (!xrpCodeFolder) {
                throw new Error('XRPCODE folder not found in Google Drive');
            }

            let xrpCodeBackupFolder = await AppMgr.getInstance().driveService.findFolderByName(Constants.XRPCODE_BACKUP);
            if (!xrpCodeBackupFolder) {
                await AppMgr.getInstance().driveService.createFolder(Constants.XRPCODE_BACKUP, xrpCodeFolder.id).then((folder) => {
                    xrpCodeBackupFolder = folder;
                });
            } else {
                // delete all files under the backup folder
                await AppMgr.getInstance().driveService.DeleteFile(xrpCodeBackupFolder.id);
                await AppMgr.getInstance().driveService.createFolder(Constants.XRPCODE_BACKUP, xrpCodeFolder.id).then((folder) => {
                    xrpCodeBackupFolder = folder;
                });
            }

            const countItems = (items: FolderItem[]): number => {
                let count = 0;
                for (const item of items) {
                    count += 1;
                    if (item.children) {
                        count += countItems(item.children);
                    }
                }
                return count;
            };
            const totalItems = countItems(fileTree || []);
            let completedItems = 0;
            setProgress(0);

            // create a resursive function to process the folder items
            const processFolderItems = async (folderItems: FolderItem[], parentFolderId: string) => {
                for (const folderItem of folderItems) {
                    setProgressItem(folderItem.name);

                    if (folderItem.children) {
                        // create the directory in Google Drive
                        const folder = await AppMgr.getInstance().driveService.createFolder(folderItem.name, parentFolderId);
                        completedItems++;
                        setProgress(Math.round((completedItems / Math.max(totalItems, 1)) * 100));
                        await processFolderItems(folderItem.children || [], folder?.id || '');
                    } else {
                        // for each folder item, we need to read the content from the XRP Robot and save it to Google Drive
                        const filePath = folderItem.path === '/' ? folderItem.path + folderItem.name : folderItem.path + '/' + folderItem.name;
                        const content = await CommandToXRPMgr.getInstance().getFileContents(filePath);
                        const data: string = new TextDecoder().decode(new Uint8Array(content));
                        const minetype = folderItem.name.split('.').pop() === 'py' ? 'text/x-python' : 'text/plain';
                        const blob = new Blob([data], { type: minetype });
                        await AppMgr.getInstance().driveService.upsertFileToGoogleDrive(blob, folderItem.name, minetype, undefined, parentFolderId);
                        completedItems++;
                        setProgress(Math.round((completedItems / Math.max(totalItems, 1)) * 100));
                    }
                }
            };

            await processFolderItems(fileTree || [], xrpCodeBackupFolder?.id || '');
        };

        try {
            await runBackup();
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error during backup:', error.stack ?? error.message);
            } else {
                console.error('Error during backup:', String(error));
            }
        }
        setIsBackup(false);
        setTimeout(() => {
            toggleDialog();
        }, 1000);
    };

    return (
    <div className="w-96 flex flex-col items-center gap-4 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
        <div className="flex w-[90%] flex-col items-center">
            <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">{t('backup.title')}</h1>
            <p className="text-sm text-wrap text-mountain-mist-700 dark:text-mountain-mist-300">{t('backup.description')}</p>
        </div>
        <hr className="w-full border-mountain-mist-600" />
        <div className="w-full flex flex-col items-center gap-1">
            <p className="text-base text-left w-full text-mountain-mist-700 dark:text-mountain-mist-300">{t('backup.processing', { filename: progressItem })}</p>
            <ProgressBar
                radius={100}
                progress={progress}
                strokeColor="#0a96ed"
                strokeLinecap='square'
                trackStrokeWidth={18}
            >
                <div className='flex items-center justify-center top-0 w-full h-full absolute'>
                    <div className='text-2xl text-mountain-mist-700'>{progress}%</div>
                </div>
            </ProgressBar>
        </div>
        <hr className="w-full border-mountain-mist-600" />
        <div className="flex w-full justify-end gap-2">
            <Button onClicked={beginBackup} disabled={isBackup}>{t('backup.begin')}</Button>
        </div>
    </div>
    );
}

export default BackupDlg;
