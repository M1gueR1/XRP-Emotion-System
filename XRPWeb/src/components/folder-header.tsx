import { ConnectionState } from '@/connections/connection';
import AppMgr, { EventType } from '@/managers/appmgr';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiOutlineFileAdd } from "react-icons/ai";
import { AiOutlineFolderAdd } from "react-icons/ai";

interface FolderHeaderProps {
    newFolderCallback: () => void;
    newFileCallback: () => void;
}

function FolderHeader({newFolderCallback, newFileCallback }: FolderHeaderProps) {
    const { t } = useTranslation();
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [appMgr, SetAppMgr] = useState<AppMgr>(AppMgr.getInstance());
    const [capacity, setCapacity] = useState<string>('0/0');

    useEffect(() => {
        SetAppMgr(AppMgr.getInstance());

        appMgr.on(EventType.EVENT_CONNECTION_STATUS, (state: string) => {
            if (state === ConnectionState.Disconnected.toString()) {
                setCapacity('0/0');
            }
        });

        appMgr.on(EventType.EVENT_FILESYS_STORAGE, (storageCapacity: string) => {
            // Update the storage capacity state here
            const storage = JSON.parse(storageCapacity);
            setCapacity(storage.used + '/' + storage.total);
        });


        appMgr.on(EventType.EVENT_ISRUNNING, (running: string) => {
            if (running === 'running') {
                setIsRunning(true);
            } else if (running === 'stopped') {
                setIsRunning(false);
            }
        });
    }, []);
    
    return (
        <div className="flex flex-row items-center justify-between bg-mountain-mist-100 p-1 text-sm dark:bg-mountain-mist-800">
            <div className="flex flex-row">
                { appMgr.authService.isLogin ?
                    <span>{t('GoogleDriveStorage')}</span> :
                    <span>{t('FilesystemStorage', { capacity: capacity})}</span>
                }
            </div>
            <div className="flex flex-row gap-1">
                <button title={t('newFolder')} onClick={newFolderCallback} disabled={isRunning}>
                    <AiOutlineFolderAdd className={`${isRunning ? 'opacity-50' : 'opacity-100'}`} size={'1.5em'} />
                </button>
                <button title={t('newFile')} className={`${isRunning ? 'opacity-50' : 'opacity-100'}`} onClick={newFileCallback} disabled={isRunning}>
                    <AiOutlineFileAdd size={'1.4em'} />
                </button>
            </div>
        </div>
    );
}

export default FolderHeader;
