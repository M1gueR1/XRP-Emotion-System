// Copyright (c) Experiential Inc. and other XRP contributors.
// Open Source Software; you can modify and share it under the terms of the
// GNU General Public License v.3.
// See https://www.gnu.org/licenses/
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ProgressBar from 'react-customizable-progressbar';
import Button from "@/widgets/button";
import { Constants } from "@/utils/constants";
import { CommandToXRPMgr } from "@/managers/commandstoxrpmgr";
import { GoogleDriveFile } from "@/services/google-drive";
import AppMgr, { EventType } from "@/managers/appmgr";

type RestoreDlgProps = {
    toggleDialog: () => void;
};

/**
 * RestoreDlg component for displaying restore progress.
 * @param toggleDialog Function to toggle the visibility of the dialog
 * @returns RestoreDlg component
 */
function RestoreDlg({ toggleDialog }: RestoreDlgProps) {
    const { t } = useTranslation();
    const [progress, setProgress] = useState(0);
    const [filename, setFilename] = useState<string>('');
    const [isRestore, setIsRestore] = useState(false);

    useEffect(() => {
        // subscribe to the progress event
        AppMgr.getInstance().on(EventType.EVENT_PROGRESS, (percent) => {
            setProgress(Math.round(parseFloat(percent)));
        });
    }, []);
    
    /**
     * Begin restore process
     */
    const beginRestore = async () => {
        setIsRestore(true);
        const runRestore = async () => {
            // Need to get a list of Google Drive files under the XRPCODE_BACKUP folder
            const xrpCodeBackupFolder = await AppMgr.getInstance().driveService.findFolderByName(Constants.XRPCODE_BACKUP);
            if (!xrpCodeBackupFolder) {
                throw new Error('XRPCODE_BACKUP folder not found in Google Drive');
            }
            const gfilesTree = await AppMgr.getInstance().driveService.buildTree(xrpCodeBackupFolder.name);

            // Recursively process files
            const processFiles = async (gfiles: GoogleDriveFile[], path: string) => {
                for (const child of gfiles) {
                    setFilename(child.name);
                    // for each child, if it is a file, restore it to the XRP Robot folder
                    if (child.mimeType === 'application/vnd.google-apps.folder') {
                        // create the folder
                        const dirPath = path === Constants.XRP_ROOT_FOLDER ? Constants.XRP_ROOT_FOLDER + child.name : path + '/' + child.name;
                        await CommandToXRPMgr.getInstance().buildPath(dirPath);
                        // if it is a folder, create the folder and process the children
                        await processFiles(child.children || [], dirPath);
                    } else {
                        // get the content of the file
                        const filePath = path === Constants.XRP_ROOT_FOLDER ? Constants.XRP_ROOT_FOLDER + child.name : path + '/' + child.name;
                        const content = await AppMgr.getInstance().driveService.getFileContents(child.id);
                        // restore the file
                        await CommandToXRPMgr.getInstance().uploadFile(filePath, content || '', true);
                    }
                }
            };
            await processFiles(gfilesTree.children || [], Constants.XRP_ROOT_FOLDER);  
        };

        try {
            await runRestore();
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error during restore:', error.stack ?? error.message);
            } else {
                console.error('Error during restore:', String(error));
            }
        }
        setIsRestore(false);
        setTimeout(() => {
            toggleDialog();
        }, 1000);
    };
    
    return (
    <div className="w-96 flex flex-col items-center gap-4 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
        <div className="flex w-[90%] flex-col items-center">
            <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">{t('restore.title')}</h1>
            <p className="text-sm text-wrap text-mountain-mist-700 dark:text-mountain-mist-300">{t('restore.description')}</p>
        </div>
        <hr className="w-full border-mountain-mist-600" />
        <div className="w-full flex flex-col items-center gap-1">
            <p className="text-base text-left w-full text-mountain-mist-700 dark:text-mountain-mist-300">{t('restore.processing', { filename: filename })}</p>
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
            <Button onClicked={beginRestore} disabled={isRestore}>{t('restore.begin')}</Button>
        </div>

    </div>
    );
}

export default RestoreDlg;