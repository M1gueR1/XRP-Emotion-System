import MonacoEditor from '../MonacoEditor';
import { useTranslation } from 'react-i18next';

type ViewPythonDlgProps = {
    code: string;
    toggleDlg: () => void;
    clearDlg: () => void;
};

export default function ViewPythonDlg({ code, toggleDlg, clearDlg }: ViewPythonDlgProps) {
    const { t } = useTranslation();

    /**
     * handleDlgClose - handle dialog close action
     */
    const handleDlgClose = () => {
        clearDlg();
        toggleDlg();
    };

    return (
        <div className="flex h-auto w-auto flex-col gap-2 overflow-hidden rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex flex-col items-center">
                <button
                    type="button"
                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                    onClick={handleDlgClose}
                >
                    <svg
                        className="h-3 w-3"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 14 14"
                    >
                        <path
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                        />
                    </svg>
                    <span className="sr-only">Close modal</span>
                </button>
                <h1 className="text-lg font-bold text-mountain-mist-700">
                    {t('viewPythonFile')}
                </h1>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <MonacoEditor
                value={code}
                tabId={t('python-untile')}
                tabname={t('python-untile')}
                width={'80vw'}
                height={'80vw'}
            />
        </div>
    );
}
