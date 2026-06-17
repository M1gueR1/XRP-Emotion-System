import FolderTree from '@/components/folder-tree';
import DialogFooter from './dialog-footer';
import { FileType, FolderItem, NewFileData } from '@/utils/types';
import { useEffect, useState } from 'react';
import { useReadLocalStorage } from 'usehooks-ts';
import { StorageKeys } from '@/utils/localstorage';
import EditorMgr from '@/managers/editormgr';
import { useTranslation } from 'react-i18next';
import AppMgr from '@/managers/appmgr';
import { Constants } from '@/utils/constants';

type FileSaveAsProps = {
    saveCallback: (fileData: NewFileData) => void;
    toggleDialog: () => void;
};

/**
 * FileSaveAs Dialog Content
 * @param fileSaveAsProps
 * @returns
 */
function FileSaveAsDialg(fileSaveAsProps: FileSaveAsProps) {
    const { t } = useTranslation();
    const [selectedFolder, setSelectedFolder] = useState<string>('');
    const [gFolderId, setGFolderId] = useState<string>('');
    const activeTab = useReadLocalStorage<string>(StorageKeys.ACTIVETAB);
    const [isFileExists, setIsFileExists] = useState(false);
    const [isOkayToSubmit, setIsOkayToSubmit] = useState(false);
    const [filename, setFilename] = useState<string>('');
    const [folderList, setFolderList] = useState<FolderItem[] | null>(null);

    /**
     * get folder list from AppMgr
     */
    useEffect(() => {
        const appMgr = AppMgr.getInstance();
        setFolderList(appMgr.getFolderList());
    }, []);    

    /**
     * handleFileSave - collects the selected file and save to XRP
     */
    const handleFileSave = () => {
        const fileData: NewFileData = {
            name: filename,
            path: selectedFolder,
            gpath: selectedFolder,
            gparentId: gFolderId,
            parentId: '',
            filetype: activeTab?.includes('.blocks') ? FileType.BLOCKLY : FileType.PYTHON,
        }
        fileSaveAsProps.saveCallback(fileData);
    };

    /**
     * handleFolderSelection - callback function to handle the selected folder
     * @param selectedItem
     */
    const handleFolderSelection = (selectedItem: FolderItem) => {
        const path = selectedItem.path === '/' ? `` : selectedItem.path;
        setSelectedFolder(path);
        setGFolderId(selectedItem.id);
    };

    /**
     * handleFilenameInput
     * @param e 
     */
    const handleFilenameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilename(e.target.value);
        const inputName = e.target.value;
        const isValid = Constants.REGEX_FILENAME.test(inputName);
        const parts = selectedFolder.split('/').filter((part) => part !== '');
        const foldername = parts[parts.length - 1];
        if (!isValid || AppMgr.getInstance().IsFileExists(foldername || '', inputName)) {
            setIsFileExists(true);
            setIsOkayToSubmit(false);
        } else {
            setIsFileExists(false);
            setIsOkayToSubmit(true);
        }
    };

    useEffect(() => {
        if (activeTab !== null) {
            const session = EditorMgr.getInstance().getEditorSession(activeTab);
            if (session) {
                setSelectedFolder('/' + session.path.split('/')[1]);
                setFilename(session.name); 
            }
        }
    }, [activeTab]);

    /**
     * handleFocus - selects the filename without the extension when the input is focused.
     * @param e
     */
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        const dotIndex = e.target.value.lastIndexOf('.');
        const filenameWithoutExtension = dotIndex === -1 ? e.target.value : e.target.value.substring(0, dotIndex);
        e.target.setSelectionRange(0, filenameWithoutExtension.length);
    };    

    return (
        <div className="flex h-auto w-96 flex-col gap-2 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">{t('saveFileAs')}</h1>
                <p className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">{t('choose-dest-file')}</p>
            </div>
            <hr className="w-full border-mountain-mist-600 dark:border-mountain-mist-200" />
            <label className="text-mountain-mist-700 dark:text-mountain-mist-300">
                {t('destFolder')}: {selectedFolder}
            </label>
            <div className='h-48 w-full overflow-y-auto border border-shark-300 dark:border-shark-600'>
                <FolderTree
                    treeData={JSON.stringify(folderList)}
                    theme=""
                    onSelected={handleFolderSelection}
                />
            </div>
            <label className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">{t('filename')}</label>
            <div>
                <input
                    className={`w-full border p-2 rounded text-md text-mountain-mist-700 dark:bg-shark-500 dark:text-mountain-mist-200 dark:placeholder-mountain-mist-200 ${isFileExists ? 'border-cinnabar-800' : 'border-shark-300 dark:border-shark-600'}`}
                    id="filenameId"
                    type="text"
                    placeholder={t('enterFilename')}
                    value={filename}
                    required
                    onChange={handleFilenameInput}
                    onFocus={handleFocus}
                    minLength={2}
                />
                {isFileExists && (
                    <span className="text-sm text-cinnabar-800 dark:text-cinnabar-400">{t('fileExists')}</span>
                )}
            </div>
            <label className="text-mountain-mist-700 dark:text-mountain-mist-300">
                {t('final-path')}
                {selectedFolder}{filename}
            </label>
            <hr className="w-full border-mountain-mist-600 dark:border-mountain-mist-200" />
            <DialogFooter
                disabledAccept={!isOkayToSubmit}
                btnCancelCallback={fileSaveAsProps.toggleDialog}
                btnAcceptLabel={t('save')}
                btnAcceptCallback={handleFileSave}
            />
        </div>
    );
}

export default FileSaveAsDialg;
