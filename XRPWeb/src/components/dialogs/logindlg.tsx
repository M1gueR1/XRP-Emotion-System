import AppMgr from '@/managers/appmgr';
import { CommandToXRPMgr } from '@/managers/commandstoxrpmgr';
import { UserProfile } from '@/services/google-auth';
import { Constants } from '@/utils/constants';
import { fireGoogleUserTree, getUsernameFromEmail } from '@/utils/google-utils';
import { AdminData } from '@/utils/types';
import Login from '@/widgets/login';
import DialogFooter from '@components/dialogs/dialog-footer';
import { useTranslation } from 'react-i18next';

type LoginDgProps = {
    toggleDialog: () => void;
};

function GoogleLoginDlg({ toggleDialog }: LoginDgProps) {
    const { t } = useTranslation();
    const isConnected = AppMgr.getInstance().getConnection()?.isConnected() ?? false;
    const adminFilePath = '/' + Constants.ADMIN_FILE;
    const authService = AppMgr.getInstance().authService;

    const logoutCallback = () => {
        toggleDialog();
    };

    const onSuccess = async (data: UserProfile) => {
        console.log(data);
        if (isConnected) {
            try {
                // check if this is the first user login by comparing the admin.json
                await CommandToXRPMgr.getInstance()
                    .getFileContents(adminFilePath)
                    .then(async (jsondata) => {
                        if (jsondata.length > 0) {
                            const json = new TextDecoder().decode(new Uint8Array(jsondata));
                            const adminData = JSON.parse(json) as AdminData;
                            if (adminData.email === data.email) {
                                authService.isAdmin = true;
                            }
                        }
                    });
                const username = getUsernameFromEmail(authService.userProfile.email);
                fireGoogleUserTree(username ?? '');
            } catch (error) {
                // invalid Admin JSON, that means file doesn't exist OS return errors
                // create the admin.json
                console.log('Invalid Admin JSON', error);
                const content = JSON.stringify({
                    name: data.name,
                    email: data.email,
                });
                await CommandToXRPMgr.getInstance().uploadFile(
                    adminFilePath,
                    content?.toString() ?? '',
                );
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex w-[90%] flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700">{t('login')}</h1>
                <p className="text-sm text-mountain-mist-700">{t('login-desc')}</p>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <Login logoutCallback={logoutCallback} onSuccess={onSuccess} />
            <hr className="w-full border-mountain-mist-600" />
            <DialogFooter
                hideCancelBtn={true}
                btnAcceptLabel={t('closeButton')}
                btnAcceptCallback={toggleDialog}
                btnCancelCallback={toggleDialog}
            />
        </div>
    );
}

export default GoogleLoginDlg;
