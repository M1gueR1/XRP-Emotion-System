import AppMgr, { EventType } from '@/managers/appmgr';
import ProgressBar from 'react-customizable-progressbar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type ProgressDlgProps = {
    title: string;
};

/**
 *  SavewToXRPDlg component - Save active document to XRP.
 * @returns none
 */
function ProgressDlg({title}: ProgressDlgProps) {
    const { t } = useTranslation();
    const [completed, setCompleted] = React.useState<number>(0);
    const [progressItem, setProgressItem] = React.useState<string | undefined>(undefined);

    useEffect(() => {
        AppMgr.getInstance().on(EventType.EVENT_PROGRESS, (percent) => {
            setCompleted(Math.round(parseFloat(percent)));
        });

        AppMgr.getInstance().on(EventType.EVENT_PROGRESS_ITEM, (item) => {
            setProgressItem(item);
        });
    }, []);

    return (
        <div className="border rounded-md border-mountain-mist-700 dark:border-shark-500 dark:bg-shark-950 flex items-center h-auto w-96 flex-col gap-4 p-8 shadow-md transition-all">
            <div className='flex flex-col items-center'>
                <h1 className="text-lg font-bold text-mountain-mist-700">{t(title)}</h1>
                { progressItem && (
                    <span className="text-sm text-mountain-mist-700 dark:text-mountain-mist-100">{t('progress-item')} {progressItem}</span>
                )}
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <ProgressBar
                radius={100}
                progress={completed}
                strokeColor="#0a96ed"
                strokeLinecap='square'
                trackStrokeWidth={18}
            >
                <div className='flex items-center justify-center top-0 w-full h-full absolute'>
                    <div className='text-2xl text-mountain-mist-700'>{completed}%</div>
                </div>
            </ProgressBar>
        </div>
    );
}

export default ProgressDlg;
