import { FileType, FolderItem, ListItem, NewFileData } from '@/utils/types';
import { useEffect, useState, useRef } from 'react';
import AppMgr from '@/managers/appmgr';
import DialogFooter from './dialog-footer';
import FolderTree from '../folder-tree';
import { useTranslation } from 'react-i18next';
import { Constants } from '@/utils/constants';
import { getUsernameFromEmail } from '@/utils/google-utils';
import { TiArrowSortedDown } from 'react-icons/ti';
import pythonicon from '@assets/images/python-svgrepo-com.svg';
import blockIcon from '@assets/images/blockly.svg';
import fileIcon from '@assets/images/file.svg';
import { FiCheckSquare } from "react-icons/fi";

type NewFileProps = {
    submitCallback: (formData: NewFileData) => void;
    toggleDialog: () => void;
};

function NewFileDlg(newFileProps: NewFileProps) {
    const { t } = useTranslation();
    const [isFileExists, setIsFileExists] = useState(false);
    const [isOkayToSubmit, setIsOkayToSubmit] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState('');
    const [filename, setFilename] = useState('');
    const [filetype, setFileType] = useState<number | null>(null);
    const [folderList, setFolderList] = useState<FolderItem[] | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState<ListItem | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const fileOptions: ListItem[] = [
        {
            label: t('blocklyfile'),
            image: blockIcon
        },
        {
            label: t('pythonfile'),
            image: pythonicon
        },
        {
            label: t('other'),
            image: fileIcon
        },
    ];

    /**
     * get folder list from AppMgr
     */
    useEffect(() => {
        const appMgr = AppMgr.getInstance();
        setFolderList(appMgr.getFolderList());
    }, []);

    /**
     * Handle clicking outside the popover to close it
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsPopoverOpen(false);
            }
        };

        if (isPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen]);

    /**
     * Handle file type option selection
     */
    const handleOptionSelect = (option: ListItem, index: number) => {
        setSelectedOption(option);
        // Map index to filetype: 0 = Blockly (filetype 1), 1 = Python (filetype 0), 2 = Other (filetype 0)
        const filetypeValue = index === 0 ? 1 : 0;
        setFileType(filetypeValue);
        setIsPopoverOpen(false);
        // Re-validate filename if it exists
        if (filename) {
            const filenameWithExt = filename + (filetypeValue === 1 ? '.blocks' : '.py');
            const isValid = Constants.REGEX_FILENAME.test(filenameWithExt);
            const parts = selectedFolder.split('/').filter((part) => part !== '');
            const foldername = parts[parts.length - 1];
            if (!isValid || AppMgr.getInstance().IsFileExists(foldername, filenameWithExt)) {
                setIsFileExists(true);
                setIsOkayToSubmit(false);
            } else {
                setIsFileExists(false);
                setIsOkayToSubmit(true);
            }
        }
    };

    /**
     * Toggle popover open/close
     */
    const togglePopover = () => {
        if (selectedFolder !== '') {
            setIsPopoverOpen(!isPopoverOpen);
        }
    };

    /**
     * handleFilenameInput - handles the filename input from user
     * @param e 
     * @returns 
     */
    const handleFilenameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilename(e.target.value);
        const filename = e.target.value + (filetype === 1 ? '.blocks' : '.py');
        const isValid = Constants.REGEX_FILENAME.test(filename);
        const parts = selectedFolder.split('/').filter((part) => part !== '');
        const foldername = parts.length > 0 ? parts[parts.length - 1] : selectedFolder;
        if (!isValid || AppMgr.getInstance().IsFileExists(foldername,filename)) {
            setIsFileExists(true);
            setIsOkayToSubmit(false);
            return;
        } else {
            setIsFileExists(false);
            setIsOkayToSubmit(true);
        }
    };

    /**
     * findItemInFolderList - recursive function to find the folder item in the folder list
     * @param folderList 
     * @param folder 
     * @returns folder item or null
     */
    const findItemInFolderList = (folderList: FolderItem[], folder: string): FolderItem | null => {
        for (const item of folderList) {
            if (item.name === folder) {
                return item;
            }
            if (item.children) {
                const foundItem = findItemInFolderList(item.children, folder);
                if (foundItem) {
                    return foundItem;
                }
            }
        }
        return null;
    }
    /**
     * handleSubmit handler. Gather all data from the form and send back to parent component
     */
    const handleSubmit = () => {
        const folders = selectedFolder.split('/');
        const folder = folders[folders.length - 2];
        const parentId = findItemInFolderList(folderList || [], folder)?.id || '';
        const fileExt = filetype === 1 ? '.blocks' : '.py';
        const username = getUsernameFromEmail(AppMgr.getInstance().authService.userProfile.email);
        const path = selectedFolder.includes('/XRPCode/')
            ? selectedFolder.replace('/XRPCode/', Constants.GUSERS_FOLDER + `${username}/`)
            : selectedFolder;
        const formData: NewFileData = {
            name: `${filename}${fileExt}`,
            path: `${path}${filename}${fileExt}`,
            gpath: '',
            gparentId: parentId || '',
            filetype: filetype === 1 ? FileType.BLOCKLY : FileType.PYTHON,
            parentId: parentId || '',
        };
        newFileProps.submitCallback(formData);
    };

    /**
     * handleFolderSelection - callback function to handle the selected folder
     * @param selectedItem
     */
    const handleFolderSelection = (selectedItem: FolderItem) => {
        setSelectedFolder(selectedItem.path);
    };

    /**
     * Handle Escape key to close dialog
     */
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                newFileProps.toggleDialog();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    /**
     * Auto-focus filename input when it becomes enabled
     */
    const filenameInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (filetype !== null && selectedFolder !== '' && filenameInputRef.current) {
            filenameInputRef.current.focus();
        }
    }, [filetype, selectedFolder]);

    /**
     * Handle key down on filename input (Enter to submit)
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && isOkayToSubmit) {
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950 w-96 max-h-[90vh] overflow-y-auto">
            <div className="flex w-[90%] flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">{t('newFile')}</h1>
                <p className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">{t('chooseNewFile')}</p>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <form id="fileOptionId" className="flex w-full flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
                <span className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">{t('destFolder')}</span>
                <div className='h-48 w-full overflow-y-auto border border-shark-300 dark:border-shark-600'>
                    <FolderTree
                        treeData={JSON.stringify(folderList)}
                        theme=""
                        onSelected={handleFolderSelection}
                    />
                </div>
                <label className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300" htmlFor="filesId">
                    {t('fileType')}
                </label>
                <div className='relative w-full' ref={popoverRef}>
                    <button 
                        type='button' 
                        name='filetypeSelecion' 
                        onClick={togglePopover}
                        disabled={selectedFolder === ''}
                        className={`relative h-10 w-full p-2 text-left border rounded-md shadow-md cursor-default focus:outline-none focus:ring-2 focus:ring-curious-blue-400 dark:border-shark-600 dark:bg-shark-500 ${
                            selectedFolder === '' 
                                ? 'border-shark-300 bg-shark-100 opacity-50 cursor-not-allowed' 
                                : 'border-shark-300 dark:border-shark-600 bg-white dark:bg-shark-500'
                        }`}
                        aria-haspopup="listbox" 
                        aria-expanded={isPopoverOpen} 
                        aria-labelledby='listbox-label'
                    >
                        <span className='flex items-center'>
                            {selectedOption ? (
                                <span className='flex items-center gap-2'>
                                    <img className='h-5 w-5' src={selectedOption.image} alt={selectedOption.label} />
                                    <span className='text-sm text-mountain-mist-700 dark:text-mountain-mist-200'>{selectedOption.label}</span>
                                </span>
                            ) : (
                                <span className='text-sm text-mountain-mist-700 dark:text-mountain-mist-300'>{t('files')}</span>
                            )}
                        </span>
                        <span className='absolute inset-y-0 right-0 flex pr-3 items-center pointer-events-none'>
                            <TiArrowSortedDown className={`transition-transform ${isPopoverOpen ? 'rotate-180' : ''} text-mountain-mist-700 dark:text-mountain-mist-300`} />
                        </span>
                    </button>
                    {isPopoverOpen && (
                        <ul 
                            className='absolute z-[200] bg-mountain-mist-50 dark:bg-shark-700 w-full mt-1 py-1 overflow-auto text-base border border-gray-300 dark:border-shark-600 rounded-md shadow-xl max-h-56 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm'
                            role='listbox'
                            aria-labelledby='listbox-label'
                        >
                            {fileOptions.map((option, index) => (
                                <li 
                                    key={option.label} 
                                    className={`flex flex-row items-center gap-2 px-3 py-2 cursor-pointer hover:bg-curious-blue-100 dark:hover:bg-shark-600 ${
                                        selectedOption?.label === option.label ? 'bg-curious-blue-50 dark:bg-shark-700' : ''
                                    }`}
                                    tabIndex={0}
                                    role='option'
                                    aria-selected={selectedOption?.label === option.label}
                                    onClick={() => handleOptionSelect(option, index)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleOptionSelect(option, index);
                                        }
                                    }}
                                >
                                    <img className='h-5 w-5' src={option.image} alt={option.label} />
                                    <span className='text-sm text-mountain-mist-700 dark:text-mountain-mist-200 flex-1'>{option.label}</span>
                                    {selectedOption?.label === option.label && (
                                        <span className="flex items-center pr-2 text-curious-blue-600 dark:text-curious-blue-400">
                                            <FiCheckSquare />
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <span className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">{t('filename')}</span>
                <div className="flex flex-col items-center gap-1">
                    <input
                        ref={filenameInputRef}
                        className={`w-full rounded border ${isFileExists ? 'border-cinnabar-800' : 'border-shark-300 dark:border-shark-600'} p-2 text-md text-mountain-mist-700 dark:bg-shark-500 dark:text-mountain-mist-200 dark:placeholder-mountain-mist-200`}
                        id="filenameId"
                        type="text"
                        placeholder={t('enterFilename')}
                        required
                        minLength={2}
                        value={filename}
                        onChange={handleFilenameInput}
                        onKeyDown={handleKeyDown}
                        disabled={filetype === null || selectedFolder === ''}
                    />
                    {isFileExists && (
                        <span className="text-sm text-cinnabar-800">{t('fileExists')}</span>
                    )}
                </div>
                <span className="text-mountain-mist-700 text-sm dark:text-mountain-mist-300">
                    {t('final-path')}
                    {selectedFolder}{filename}{filetype === 1 ? '.blocks' : '.py'} 
                </span>
            </form>
            <hr className="w-full border-mountain-mist-600" />
            <DialogFooter
                disabledAccept={!isOkayToSubmit}
                btnAcceptLabel={t('submitBtn')}
                btnAcceptCallback={handleSubmit}
                btnCancelCallback={newFileProps.toggleDialog}
            />
        </div>
    );
}

export default NewFileDlg;
