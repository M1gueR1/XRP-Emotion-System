import logger from "@/utils/logger";
import { googleLogout } from "@react-oauth/google";

export type UserProfile = {
    id: string;
    email: string;
    verified_email?: boolean;
    family_name?: string;
    given_name?: string;
    locale?: string;
    hd?: string; // hosted domain
    name: string;
    picture: string;
};

export type UserInfo = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
};

/**
 * GoogleAuthService is a service to handle Google authentication,
 * including obtaining access tokens and refreshing them.
 */
class GoogleAuthService {
    private _googleAuthBackendUrl: string;
    private _handshakeToken: string | null = null;
    private _isLogin: boolean = false;
    private _isAdmin: boolean = false;
    private _code: string | null = null;
    private _refreshToken: string | null = null;
    private _expiresIn: number | null = null;
    private _accessToken: string | null = null;
    private _timeoutId: NodeJS.Timeout | undefined;
    private _userProfile: UserProfile;
    private _modeLogger = logger.child({ module: 'googleapi' });
    

    constructor() {
        this._googleAuthBackendUrl = import.meta.env.GOOGLE_AUTH_URL;
        this._userProfile = { id: '', email: '', name: '', picture: '' };
        this.initHandshake(); // Initiate handshake on service creation
    }

    dispose() {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = undefined;
        }
    }

    /**
     * isLogin - checks if the user is logged in.
     */
    get isLogin() {
        return this._isLogin;
    }

    /**
     * Sets the login status of the user.
     * @param isLogin sets the login status of the user.
     */
    set isLogin(isLogin: boolean) {
        this._isLogin = isLogin;
    }

    /**
     * Sets the user profile information.
     * @param profile The user profile object containing email, name, and picture.
     */
    set userProfile(profile: UserProfile) {
        this._userProfile = profile;
    }

    /**
     * Gets the user profile information.
     * @returns The user profile object containing email, name, and picture.
     */
    get userProfile() {
        return this._userProfile;
    }

    /**
     * Gets the user information including access token, refresh token, and expiration time.
     * @returns An object containing access_token, refresh_token, and expires_in.
     */
    get userInfo(): UserInfo {
        return {
            access_token: this._accessToken ?? '',
            refresh_token: this._refreshToken ?? '',
            expires_in: this._expiresIn ?? 0,
        };
    }

    /**
     * Get the is admin property
     */
    get isAdmin(): boolean {
        return this._isAdmin;
    }

    /**
     * Set the isAdmin property
     */
    set isAdmin(isAdmin: boolean) {
        this._isAdmin = isAdmin;
    }

    private async initHandshake() {
        try {
            const response = await fetch(`${this._googleAuthBackendUrl}/google-auth/handshake`, {
                credentials: 'include', // Include cookies in cross-origin requests
            });
            if (!response.ok) {
                throw new Error(`Handshake failed: ${response.statusText}`);
            }
            const data = await response.json();
            this._handshakeToken = data.handshake_token;
        } catch (error) {
            if (error instanceof Error) {
                this._modeLogger.error(`Error during Google Auth handshake: ${error.stack ?? error.message}`);
            } else {
                this._modeLogger.error(`Error during Google Auth handshake: ${String(error)}`);
            }
        }
    }

    /**
     * Refreshes the access token using the stored refresh token.
     * @returns A Promise that resolves to the new access token.
     */
    private async refreshToken() 
    {        
        if (this._refreshToken && this._handshakeToken) {
            this.getAccessToken().then((token) => {
                this._accessToken = token;
            }).catch((error) => {
                this._modeLogger.error('Error refreshing access token:', error);
            });
        } else {
            this._modeLogger.warn('No refresh token or handshake token available to refresh access token.');
        }
        // Set a timeout to refresh the token again after the current token expires
        this._timeoutId = setTimeout(this.refreshToken.bind(this), this._expiresIn ? this._expiresIn * 1000 * .95 : 3600000); // Default to 1 hour if expires_in is not set
    }

    /**
     * Sets the authorization code received from Google OAuth.
     * @param code The authorization code.
     */
    setCode(code: string) {
        this._code = code;
    }

    /** * Logs out the user from Google.
    * This will clear the stored tokens and redirect the user to the Google logout endpoint.
    */
    async logOut() {
      // Logic to handle Google logout
      googleLogout();
      this._isLogin = false;
      // Also notify backend to clean up session
      if (this._handshakeToken) {
        try {
            await fetch(`${this._googleAuthBackendUrl}/google-auth/session/${this._handshakeToken}`, {
                method: 'DELETE',
                headers: {
                    'X-Handshake-Token': this._handshakeToken,
                },
                credentials: 'include', // Include cookies in cross-origin requests
            });
        } catch (error) {
            if (error instanceof Error) {
                this._modeLogger.error(`Error cleaning up backend session: ${error.stack ?? error.message}`);
            } else {
                this._modeLogger.error(`Error cleaning up backend session: ${String(error)}`);
            }
        }
      }
    }

    /**
     * Retrieves the access token using the stored refresh token.
     * @returns A Promise that resolves to the access token.
     */
    async getAccessToken() {
        if (!this._handshakeToken || !this._refreshToken) {
            throw new Error('Handshake token or refresh token not available.');
        }

        try {
            const response = await fetch(`${this._googleAuthBackendUrl}/google-auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Handshake-Token': this._handshakeToken,
                },
                body: JSON.stringify({ session_id: this._handshakeToken }), // Sending handshakeToken as session_id
                credentials: 'include', // Include cookies in cross-origin requests
            });

            if (!response.ok) {
                throw new Error(`Failed to refresh access token from backend: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.access_token) {
                this._accessToken = data.access_token;
                this._expiresIn = data.expires_in;
                return data.access_token;
            } else {
                throw new Error('Failed to get access token from backend response');
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this._modeLogger.error(`Error fetching access token: ${error.stack ?? error.message}`);
            }
            throw error;
        }
    };

    /**
     * Retrieves a new access token using the authorization code.
     * @returns A Promise that resolves to an object containing access_token, refresh_token, and expires_in.
     */
    async getRefreshToken() {
        if (!this._handshakeToken || !this._code) {
            throw new Error('Handshake token or authorization code not available.');
        }

        try {
            const response = await fetch(`${this._googleAuthBackendUrl}/google-auth/exchange-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Handshake-Token': this._handshakeToken,
                },
                body: JSON.stringify({ code: this._code }),
                credentials: 'include', // Include cookies in cross-origin requests
            });

            if (!response.ok) {
                throw new Error(`Failed to exchange code for tokens from backend: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.access_token) {
                this._timeoutId = setTimeout(() => this.refreshToken(), 1000);
                this._accessToken = data.access_token;
                this._refreshToken = data.refresh_token; // Backend returns refresh token on first exchange
                this._expiresIn = data.expires_in;
                return { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in };
            } else {
                throw new Error('Failed to get refresh token from backend response');
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this._modeLogger.error(`Error fetching refresh token: ${error.stack ?? error.message}`);
            }
            throw error;
        }   
    }
}

export default GoogleAuthService;
