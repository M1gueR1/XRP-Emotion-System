import { StorageKeys } from '@/utils/localstorage';
import { useLocalStorage } from 'usehooks-ts';
import DialogFooter from '@components/dialogs/dialog-footer';
import AppMgr, { Themes } from '@/managers/appmgr';
import { useTranslation } from 'react-i18next';
import TabList from '../tab-list';
import TabItem from '../tab-item';
import AnimatedThemeToggle from '@/widgets/animated-theme-toggle';

type SettingsProps = {
    /**
     * Function to toggle the visibility of the dialog
     */
    toggleDialog: () => void;
};

function SettingsDlg({ toggleDialog }: SettingsProps) {
    const { t, i18n } = useTranslation();
    const [,setTheme] = useLocalStorage(StorageKeys.THEME, Themes.LIGHT);

    const languageOptions = [
        { code: 'en', label: 'English', nativeName: 'English' },
        { code: 'es', label: 'Spanish', nativeName: 'Español' },
    ];

    /**
     * handleLanguageChange - handles language selection change
     */
    const handleLanguageChange = (event: { target: { value: string } }) => {
        const newLanguage = event.target.value;
        i18n.changeLanguage(newLanguage);
    };

    /**
     * handleSave - saving the settings into localstorage
     */
    const handleSave = async () => {
        toggleDialog();
    };

    /**
     * onThemeToggle - toggle theme callback
     * @param state 
     */
    const onThemeToggle = (state: Themes) => {
        // 1. Update the class for Tailwind CSS theming
        if (state === Themes.DARK) {
            document.documentElement.classList.add(Themes.DARK);
            document.documentElement.classList.remove(Themes.LIGHT);
        } else if (state === Themes.LIGHT) {
            document.documentElement.classList.add(Themes.LIGHT);
            document.documentElement.classList.remove(Themes.DARK);
        }
        setTheme(state);

        // 2. Emit a global event to notify other components (like flexlayout)
        AppMgr.getInstance().setTheme(state);
    };

    return (
        <div className="flex flex-col items-center gap-4 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex w-[80%] flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">{t('settings')}</h1>
                <p className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">{t('settingDescription')}</p>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <TabList activeTabIndex={0}>
                <TabItem label={t('language')} isActive={false}>
                    <div className="flex w-full flex-col gap-2 mt-2">
                        <span className='text-mountain-mist-900 dark:text-curious-blue-100'>{t('languageSelection')}</span>
                        <select
                            id="languageSelectedId"
                            className="dark:text-white block rounded border border-s-2 border-shark-300 border-s-curious-blue-500 bg-mountain-mist-100 p-2.5 text-sm text-mountain-mist-700 focus:border-mountain-mist-500 focus:ring-curious-blue-500 dark:border-shark-600 dark:border-s-shark-500 dark:bg-shark-500 dark:text-mountain-mist-200 dark:placeholder-mountain-mist-400 dark:focus:border-matisse-500 dark:focus:ring-shark-300"
                            value={i18n.language}
                            onChange={handleLanguageChange}
                        >
                            {languageOptions.map((option) => (
                                <option key={option.code} value={option.code}>
                                    {option.nativeName} ({option.label})
                                </option>
                            ))}
                        </select>
                    </div>
                </TabItem>
                <TabItem label={t('theme.label')} isActive={false}>
                    <div className="flex w-full flex-col gap-2 mt-2">
                        <AnimatedThemeToggle
                            labelLeft={t('theme.light')}
                            labelRight={t('theme.dark')}
                            initial={document.documentElement.classList.contains('dark')}
                            onToggle={onThemeToggle}
                        />
                    </div>
                </TabItem>
            </TabList>
            <hr className="w-full border-mountain-mist-600" />
            <DialogFooter
                btnAcceptLabel={t('save')}
                btnAcceptCallback={handleSave}
                btnCancelCallback={toggleDialog}
            />
        </div>
    );
}

export default SettingsDlg;
