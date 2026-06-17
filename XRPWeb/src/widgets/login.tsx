import { useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Button from './button';
import AppMgr from '@/managers/appmgr';
import logger from '@/utils/logger';
import { UserProfile } from '@/services/google-auth';
import { useTranslation } from 'react-i18next';
import { Constants } from '@/utils/constants';
import GoogleLogo from '@assets/images/google-logo.svg';

type LoginProps = {
    logoutCallback: () => void;
    onSuccess: (data: UserProfile) => void;
};

function Login({ logoutCallback, onSuccess }: LoginProps) {
    const { t } = useTranslation();
    const initUserProperties = {
        access_token: '',
        refresh_token: '',
        expire_in: 0,
        id_token: '',
        scope: '',
        token_type: '',
    };

    const initUserProfle = {
        email: '',
        verified_email: false,
        family_name: '',
        given_name: '',
        id: '',
        hd: '',
        locale: '',
        name: '',
        picture: '',
    };

    const [user, setUser] = useState(initUserProperties);
    const [isLogin, setIsLogin] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<UserProfile>(initUserProfle);
    const [tooltip, setTooltip] = useState<string>('');
    const authService = AppMgr.getInstance().authService;
    const driveService = AppMgr.getInstance().driveService;
    const loginLogger = logger.child({ module: 'login' });

    const SCOPE = 'https://www.googleapis.com/auth/drive.file';

    const googleSignIn = useGoogleLogin({
        scope: SCOPE,
        flow: 'auth-code',
        onSuccess: (codeResponse) => {
            setIsLogin(true);
            authService.isLogin = true;
            authService.setCode(codeResponse.code);
            authService.getRefreshToken().then(async (token) => {
                setUser((prev) => ({
                    ...prev,
                    access_token: token.access_token,
                    refresh_token: token.refresh_token,
                    expire_in: token.expires_in,
                }));
                driveService.setAccessToken(token.access_token);

            }).catch((error) => {
                if (error instanceof Error) {
                    loginLogger.error(`Error during token exchange:' ${error.stack ?? error.message}`);
                } else {
                    loginLogger.error(`Error during token exchange: ${String(error)}`);
                }
            });
        },
        onError: (error) => {
            if (error instanceof Error) {
                loginLogger.error(`Login Failed:' ${error.stack ?? error.message}`);
            } else {
                loginLogger.error(`Login Failed: ${String(error)}`);
            }
        },
    });

    /**
     * googleLogut - logout the current Google user
     */
    const googleLogout = () => {
        authService.logOut().then(() => {
            setIsLogin(false);
            authService.userProfile = initUserProfle;
        });
        setUser(initUserProperties);
        setUserProfile(initUserProfle);
        logoutCallback();
    }

    useEffect(() => {
        if (user.access_token && userProfile.email === '') {
            fetch(
                `https://www.googleapis.com/drive/v3/about?fields=user`,
                {
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                        Accept: 'application/json',
                    },
                },
            )
                .then((res) => res.json())
                .then(async (data) => {
                    // Map Drive About API response to UserProfile format
                    const profile: UserProfile = {
                        id: data.user?.permissionId || data.user?.emailAddress || '',
                        email: data.user?.emailAddress || '',
                        name: data.user?.displayName || '',
                        picture: data.user?.photoLink || '',
                        verified_email: true, // Drive API doesn't provide this, assume verified
                    };
                    setUserProfile(profile);
                    authService.userProfile = profile;
                        // check if XRPCode folder exists, if not create it
                        try {
                            const folder = await driveService.findFolderByName(Constants.XRPCODE);
                            if (!folder) {
                                await driveService.createFolder(Constants.XRPCODE);
                            }
                        } catch (error) {
                            if (error instanceof Error) {
                                loginLogger.error(`Error checking or creating XRPCode folder: ${error.stack ?? error.message}`);
                            } else {
                                loginLogger.error(`Error checking or creating XRPCode folder: ${String(error)}`);
                            }   
                        }
                    onSuccess(profile);
                })
                .catch((err) => loginLogger.error('Error fetching user profile:', err));
        }
    }, [user.access_token, userProfile.email]);

    useEffect(() => {
        if (authService.isLogin) {
            setIsLogin(true);
            setUserProfile(authService.userProfile);
            setTooltip('googlogoutTooltip');
        } else {
            setIsLogin(false);
            setTooltip('googleLoginTooltip');
        }
    }, [authService.isLogin, authService.userProfile])

    return (
        <>
            {isLogin && (
                <div className="flex flex-col">
                    {/* <label className="text-mountain-mist-900 dark:text-curious-blue-100">{t('userprofile')}</label> */}
                    <div className="border-1 flex flex-row items-center gap-1 rounded-md bg-mountain-mist-100 p-1 dark:bg-shark-500">
                        <img
                            className="h-10 w-10 rounded-full"
                            src={userProfile.picture}
                            alt="User Profile"
                        />
                        <div className="flex flex-col">
                            <span className="text-mountain-mist-700 dark:text-mountain-mist-100">{userProfile.name}</span>
                            <span className="text-mountain-mist-700 dark:text-mountain-mist-100">{userProfile.email}</span>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col items-end gap-1">
                <Button onClicked={isLogin ? googleLogout : googleSignIn} tooltip={t(tooltip)}>
                    <img src={GoogleLogo} className='h-8 w-8' />
                    {isLogin ? t('gooSignOut') : t('gooSignIn')}
                </Button>
            </div>
        </>
    );
}

export default Login;
