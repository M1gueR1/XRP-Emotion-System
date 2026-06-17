import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DialogFooter from './dialog-footer';
import { Constants } from '@/utils/constants';
import { ListItem } from '@/utils/types';
import pythonicon from '@assets/images/python-svgrepo-com.svg';
import blockIcon from '@assets/images/blockly.svg';
import fileIcon from '@assets/images/file.svg';
import { TiArrowSortedDown } from 'react-icons/ti';
import { FiCheckSquare } from 'react-icons/fi';
import AppMgr from '@/managers/appmgr';

type CreateNodeDlgProps = {
    type: 'internal' | 'leaf';
    parentPath: string;
    onConfirm: (name: string) => void;
    onCancel: () => void;
};

function CreateNodeDlg({ type, parentPath, onConfirm, onCancel }: CreateNodeDlgProps) {
    const { t } = useTranslation();
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [isFileExists, setIsFileExists] = useState(false);
    const [isOkayToSubmit, setIsOkayToSubmit] = useState(false);
    const [filename, setFilename] = useState('');
    const [filetype, setFileType] = useState<number | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState<ListItem | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    /**
     * filetype options
     */
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
     * Toggle popover open/close
     */
    const togglePopover = () => {
        if (parentPath !== '') {
            setIsPopoverOpen(!isPopoverOpen);
        }
    };

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
            const parts = parentPath.split('/').filter((part) => part !== '');
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
     * handleNameInput - handles the filename input from user
     * @param e 
     * @returns 
     */
    const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilename(e.target.value);
        const filename = e.target.value + (type === 'leaf' ? (filetype === 1 ? '.blocks' : '.py') : '');
        setName(filename);
        const isValid = (type === 'leaf') ? Constants.REGEX_FILENAME.test(filename) : Constants.REGEX_DIRNAME.test(filename);
        const parts = parentPath.split('/').filter((part) => part !== '');
        const foldername = parts.length > 0 ? parts[parts.length - 1] : parentPath;
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
     * handleConfirm - handle confirm action
     * @returns 
     */
    const handleConfirm = () => {
        if (!name.trim()) {
            setError(t('filename-required') || 'Filename is required');
            return;
        }
        onConfirm(name);
    };

    return (
        <div className="flex flex-col items-center gap-4 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex w-[90%] flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">{type === 'internal' ? t('newFolder') : t('newFile')}</h1>
                <p className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">{type === 'internal' ? t('chooseNewFolder') : t('chooseNewFile2')}</p>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <form id="fileOptionId" className="flex w-full flex-col gap-2">
                {type === 'leaf' && (
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300" htmlFor="filesId">
                            {t('fileType')}
                        </label>
                        <div className='relative w-full' ref={popoverRef}>
                            <button 
                                type='button' 
                                name='filetypeSelecion' 
                                onClick={togglePopover}
                                disabled={parentPath === ''}
                                className={`relative h-10 w-full p-2 text-left border rounded-md shadow-md cursor-default focus:outline-none focus:ring-2 focus:ring-curious-blue-400 dark:border-shark-600 dark:bg-shark-500 ${
                                    parentPath === '' 
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
                    </div>
                )}
                <span className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">{(type === 'leaf') ? t('filename') : t('foldername')}</span>
                <div className="flex flex-col items-center gap-1">
                    <input
                        className={`w-full rounded border ${isFileExists ? 'border-cinnabar-800' : 'border-shark-300 dark:border-shark-600'} p-2 text-md text-mountain-mist-700 dark:bg-shark-500 dark:text-mountain-mist-200 dark:placeholder-mountain-mist-200`}
                        id="filenameId"
                        type="text"
                        placeholder={(type === 'leaf') ? t('enterFilename') : t('enterFoldername')}
                        required
                        minLength={2}
                        value={filename}
                        onChange={handleNameInput}
                        disabled={(type === 'leaf') ? filetype === null || parentPath === '' : false}
                    />
                    {isFileExists && (
                        <span className="text-sm text-cinnabar-800">{t('fileExists')}</span>
                    )}
                </div>
                <span className="text-mountain-mist-700 text-sm dark:text-mountain-mist-300">
                    {t('final-path')}
                    {parentPath}{filename}{(type === 'leaf') ? (filetype === 1 ? '.blocks' : '.py') : ''} 
                </span>
                {error && <span className="text-cinnabar-500 text-sm">{error}</span>}
            </form>
            <hr className="w-full border-mountain-mist-600" />
            <DialogFooter
                disabledAccept={!isOkayToSubmit}
                btnAcceptLabel={t('create') || 'Create'}
                btnAcceptCallback={handleConfirm}
                btnCancelCallback={onCancel}
            />
        </div>
    );
}

export default CreateNodeDlg;