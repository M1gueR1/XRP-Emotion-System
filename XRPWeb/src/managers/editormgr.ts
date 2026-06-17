import { EditorType } from "@/utils/types";
import { CommandToXRPMgr } from "@/managers/commandstoxrpmgr";
import { Actions, Model } from "flexlayout-react";
import AppMgr, { EventType } from "@/managers/appmgr";
import { StorageKeys } from "@/utils/localstorage";
import { Constants } from "@/utils/constants";
import { Workspace } from "react-blockly";
import i18n from "@/utils/i18n";
import { GoogleDriveFile } from "@/services/google-drive";

/**
 * EditorSession - Editor session object
 */

export type EditorSession = {
    id: string;
    name: string;
    path: string;
    gpath?: string,
    gparentId?: string,
    type: EditorType;
    isSubscribed: boolean;
    isModified: boolean;
    hasBeenLoaded?: boolean;
    fontsize: number;
    content?: string;
    workspace?: Workspace;
    lastUpdated?: Date;
};

/**
 * EdSearchParams - editor session search parameters by name and path
 * @property {string} name - editor name or filename
 * @property {string} path - file path (should be unique)
 */
export type EdSearchParams = {
    name: string;
    path: string;
};

/**
 * EditorStore - editor session localstorage object
 * @typedef {Object} EditorStore
 * @property {string} id - editor session id
 * @property {string} name - editor session name
 * @property {string} path - editor session path
 * @property {string} content - editor content
 * @property {boolean} isBlockly - editor is blockly
 * @property {boolean} isSavedToXRP - editor content is saved to XRP
 */
export type EditorStore = {
    id: string;
    name: string,
    path: string;
    gpath?: string;
    isBlockly: boolean;
    isSavedToXRP: boolean;
    content: string;
};

/**
 * Live content for an editor
 */
export type LiveEditorContent = {
    id: string;
    name: string,
    type: EditorType;
    path: string;
    content: string;
    lastUpdated: Date;
};

/**
 * EditorMgr class - manages editor session for Blockly and Python
 */
export default class EditorMgr {
    private static instance: EditorMgr;
    private editorSessions = new Map<string, EditorSession>();
    private layoutModel?: Model;

    /**
     * Constructor
     */
    public EditorMgr() {}

    public static getInstance(): EditorMgr {
        if (!EditorMgr.instance) {
            EditorMgr.instance = new EditorMgr();
        }
        return this.instance;
    }

    /**
     * set the layout model for managing editor sesions
     * @param model 
     */
    public setLayoutModel(model: Model) {
        this.layoutModel = model;
    }

    /**
     * getLayoutModel - return the layout model
     * @returns 
     */
    public getLayoutModel(): Model | undefined{
        return this.layoutModel;
    }

    /**
     * AddEditor - Add a new editor session
     * @param session - Editor session object
     */
    public AddEditor(session: EditorSession ): void {
        console.log('AddEditor: ', session);
        if (!this.editorSessions.has(session.id)) {
            this.editorSessions.set(session.id, session);
        }
    }

    /**
     * RemoveEditor - Remove an editor session
     * @param session - Editor session object
     */
    public RemoveEditor(id: string ): string | undefined{
        console.log('RemoveEditor: ', id);
        if (this.editorSessions.has(id)) {
            const sesion = this.editorSessions.get(id);
            // clean up the event subscriptions
            const appMgr = AppMgr.getInstance();
            appMgr.eventOff(EventType.EVENT_THEME);
            appMgr.eventOff(EventType.EVENT_EDITOR_LOAD);
            if (sesion?.type === EditorType.BLOCKLY) {
                appMgr.eventOff(EventType.EVENT_GENPYTHON);
            } else if (sesion?.type === EditorType.PYTHON) {
                appMgr.eventOff(EventType.EVENT_FONTCHANGE);
            }
            appMgr.eventOff(EventType.EVENT_SAVE_EDITOR); 
            this.editorSessions.delete(id);
            this.RemoveFromLocalStorage(id);
        }
        if (this.editorSessions.size > 0) {
            const session = Array.from(this.editorSessions.values()).pop();
            if (session) {
                AppMgr.getInstance().emit(
                    EventType.EVENT_EDITOR,
                    session.type === EditorType.BLOCKLY ? EditorType.BLOCKLY : EditorType.PYTHON,
                );
                this.layoutModel?.doAction(Actions.selectTab(session.id));     
                return session?.id;
            }
        }
        return undefined;
    }

    /**
     * RemoveEditorByName - Remove an editor session by name
     * @param searchParams - Editor session search parameters
     */
    public RemoveEditorByName(searchParams: EdSearchParams): string | undefined{
        for (const session of this.editorSessions.values()) {
            if (session.name === searchParams.name && session.path === searchParams.path) {
                return this.RemoveEditor(session.id);
            }
        };
        return undefined;
    }

    /**
     * RemoveEditorTabByName - Remove an editor Tab by name
     * @param searchParams - Editor session search parameters
     * @returns 
     */
    public RemoveEditorTabByName(searchParams: EdSearchParams) {
        for (const session of this.editorSessions.values()) {
            if (session.name === searchParams.name && session.path === searchParams.path) {
                return this.RemoveEditorTab(session.id);
            }
        };
    }

    /**
     * SelectEditorTabByName
     * @param searchParams - Editor session search parameters
     * @returns 
     */
    public SelectEditorTabByName(searchParams: EdSearchParams) {
        for (const session of this.editorSessions.values()) {
            if (session.name === searchParams.name && session.path === searchParams.path) {
                return this.SelectEditorTab(session.id);
            }
        };
    }

    /**
     * SelectEditorTab - select the editor tab in the layout
     * @param id
     */
    public SelectEditorTab(id: string) {
        this.layoutModel?.doAction(Actions.selectTab(id));
    }

    /**
     * RemoveEditorTab - remove specified editor id from the Editor layout
     * @param id 
     */
    public RemoveEditorTab(id: string) {
        this.layoutModel?.doAction(Actions.deleteTab(id));
    }

    /**
     * RenameEditorTab - rename editor tab
     * @param searchParams - Editor session search parameters
     * @param newId 
     */
    public RenameEditorTab(searchParams: EdSearchParams, newId: string) {
        const oldId = searchParams.name;
        const session = this.getEditorSessionByName(searchParams);
        if (session) {
            // update the session id
            session.name = newId;
            // update the session XRP path
            if (session.path) {
                session.path = session.path.replace(oldId, newId);
            }
            // update the tab name
            this.layoutModel?.doAction(Actions.renameTab(session.id, newId));
            // remove the old session from localstorage
            this.RemoveFromLocalStorage(session.id);
            // save the new session to localstorage
            this.SaveToLocalStorage(session, session.content || '');

            const names = {
                oldId: oldId,
                newId: newId
            };
            AppMgr.getInstance().emit(EventType.EVENT_EDITOR_NAME_CHANGED, JSON.stringify(names));
        }
    }

    /**
     * getEditorSession - Get an editor session
     * @param id 
     * @returns EditorSession | undefined
     */
    public getEditorSession(id: string): EditorSession | undefined {
        return this.editorSessions.get(id);
    }

    /**
     * getEditorSessionByName - Get an editor session by name
     * @param searchParams - Editor session search parameters
     */
    public getEditorSessionByName(searchParams: EdSearchParams): EditorSession | undefined {
        for (const session of this.editorSessions.values()) {
            if (session.name === searchParams.name && session.path === searchParams.path) {
                return session;
            }
        }
        return undefined;
    }

    /**
     * hasEditorSession - Check if an editor session exists
     * @param id - Editor session id
     * @returns true if the editor session exists
     */
    public hasEditorSession(id: string): boolean {
        return this.editorSessions.has(id);
    }

    /**
     * hasEditorSessionByName - Check if an editor session exists by name
     * @param searchParams - Editor session search parameters
     * @returns 
     */
    public hasEditorSessionByName(searchParams: EdSearchParams): boolean {
        for (const session of this.editorSessions.values()) {
            if (session.name === searchParams.name && session.path === searchParams.path) {
                return true;
            }
        }
        return false;
    }

    /**
     * hasSessionChange - check if an editor session has change
     */
    public hasSessionChanged(id: string): boolean {
        const session = this.editorSessions.get(id);
        return session?.isModified === true;
    }

    /**
     * hasSubscription - check if subscription has been established
     * @param id 
     * @returns - true / false
     */
    public hasSubscription(id: string): boolean {
        return this.editorSessions.get(id)?.isSubscribed || false;
    }

    /**
     * setSubscription - set subscription state
     * @param id 
     */
    public setSubscription(id: string) {
        const session = this.editorSessions.get(id);
        if (session) {
            session.isSubscribed = true;
        }
    }

    /**
     * getFontsize - retrieve the fontsize of editor session
     * @param id 
     * @returns 
     */
    public getFontsize(id: string) {
        const session = this.editorSessions.get(id);
        if (session) {
            return session.fontsize;
        } else return Number(14);
    }

    /**
     * setFontsize - set the fontsize of the editor session
     * @param id 
     * @param fontsize 
     */
    public setFontsize(id: string, fontsize: number) {
        const session = this.editorSessions.get(id);
        if (session) {
            session.fontsize = fontsize;
        }
    }

    /**
     * saveEditor - save the editor code
     * @param id 
     * @param code 
     */
    public async saveEditor(id: string, code: string) {
        const session = this.editorSessions.get(id);
        if (session) {
            const isConnected = AppMgr.getInstance().getConnection()?.isConnected() ?? false;
            if (!isConnected && !AppMgr.getInstance().authService.isLogin) {
                // show a dialog to inform user to connect to XRP or login to Google Drive
                AppMgr.getInstance().emit(EventType.EVENT_ALERT, i18n.t('editor.saveconnect'));
                return;
            }

            if (isConnected) {
                // save the session to XRP
                AppMgr.getInstance().emit(EventType.EVENT_SHOWPROGRESS, Constants.SHOW_PROGRESS);
                await CommandToXRPMgr.getInstance().uploadFile(session.path, code, true).then(() =>{
                    session.isModified = false;
                    AppMgr.getInstance().emit(EventType.EVENT_UPLOAD_DONE, '');
                    this.SelectEditorTab(id);
                });
            }
            
            if (AppMgr.getInstance().authService.isLogin) {
                if (session.gpath) {
                    const mineType = session.type === EditorType.PYTHON ? 'text/x-python' : 'application/json';
                    const blob = new Blob([code], { type: mineType});
                    const filename = session.path.split('/').pop();

                    AppMgr.getInstance().emit(EventType.EVENT_SHOWPROGRESS, Constants.SHOW_PROGRESS);
                    await AppMgr.getInstance().driveService.upsertFileToGoogleDrive(blob, filename ?? '', mineType, session.gpath).then(() => {
                        session.isModified = false;
                        AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '100');
                        AppMgr.getInstance().emit(EventType.EVENT_UPLOAD_DONE, '');
                        this.SelectEditorTab(id);
                    });
                } else if (!isConnected) {
                    AppMgr.getInstance().emit(EventType.EVENT_ALERT, i18n.t('not-google-drive-file'));
                }
            }
        }
    }

    /**
     * SaveToLocalStorage - save the editor session to local storage
     * @param session - editor session
     * @param code - editor content
     * @returns 
     */
    public SaveToLocalStorage(session: EditorSession, code: string) {
        // save the session to local storage
        const editorStore: EditorStore = {
            id: session.id,
            name: session.name,
            path: session.path,
            gpath: session.gpath,
            isBlockly: session.type === EditorType.BLOCKLY,
            isSavedToXRP: !session.isModified,
            content: code,
        };
        // Update the session content with the new code
        session.content = code;
        session.lastUpdated = new Date();
        let editorStoreJson = localStorage.getItem(StorageKeys.EDITORSTORE);
        let editorStores: EditorStore[];
        if (editorStoreJson) {
            editorStores = JSON.parse(editorStoreJson);
            const index = editorStores.findIndex((store: EditorStore) => store.id === session.id);
            if (index !== -1) {
                editorStores[index] = editorStore;
            } else {
                editorStores.push(editorStore);
            }
        } else {
            editorStores = [];
            editorStores.push(editorStore);
        }
        editorStoreJson = JSON.stringify(editorStores);
        localStorage.setItem(StorageKeys.EDITORSTORE, editorStoreJson);
    }

    /**
     * RemoveFromLocalStorage - remove the editor session from local storage
     * @param id - editor session id
     */
    public RemoveFromLocalStorage(id: string) {
        let editorStoreJson = localStorage.getItem(StorageKeys.EDITORSTORE);
        if (editorStoreJson) {
            const editorStores: EditorStore[] = JSON.parse(editorStoreJson);
            const index = editorStores.findIndex((store: EditorStore) => store.id === id);
            if (index !== -1) {
                editorStores.splice(index, 1);
                editorStoreJson = JSON.stringify(editorStores);
                localStorage.setItem(StorageKeys.EDITORSTORE, editorStoreJson);
            }
        }
    }

    /**
     * getAllEditorSessions - Get all editor sessions
     * @returns Map of all editor sessions
     */
    public getAllEditorSessions(): Map<string, EditorSession> {
        return new Map(this.editorSessions);
    }

    /**
     * getActiveEditorId - Get the currently active editor ID from localStorage
     * @returns active editor ID or null
     */
    public getActiveEditorId(): string | null {
        const activeTab = localStorage.getItem(StorageKeys.ACTIVETAB);
        return activeTab ? activeTab.replace(/^"|"$/g, '') : null;
    }

    /**
     * updateEditorSessionChange - set the isModified value of the session
     */
    public updateEditorSessionChange(id: string, hasChanged: boolean) {
        const session = this.editorSessions.get(id);
        if (session) {
            session.isModified = hasChanged;
            this.SelectEditorTab(id);
        }
    }

    /**
     * Get live content for all open editors
     */
    public getLiveEditorContents(): LiveEditorContent[] {
        const contents: LiveEditorContent[] = [];
        this.editorSessions.forEach((session, id) => {
            if (session.content !== undefined) {
                contents.push({
                    id,
                    name: session.name,
                    type: session.type,
                    path: session.path,
                    content: session.content || '',
                    lastUpdated: session.lastUpdated || new Date(0)
                });
            }
        });
        return contents;
    }

    /**
     * Save all unsaved editors to the robot with progress tracking
     * @returns Promise that resolves when all editors are saved
     */
    public async saveAllUnsavedEditors(activeTab: string): Promise<void> {
        const isConnected = AppMgr.getInstance().getConnection()?.isConnected() ?? false;
        if (!isConnected) {
            return; // Can't save if not connected
        }

        const isLogin = AppMgr.getInstance().authService.isLogin;

        // Get all unsaved editor sessions
        const unsavedSessions: Array<{ id: string; session: EditorSession }> = [];
        this.editorSessions.forEach((session, id) => {
            if (session.isModified) {
                unsavedSessions.push({ id, session });
            }
        });

        if (unsavedSessions.length === 0) {
            return; // Nothing to save
        }

        // Show progress dialog
        AppMgr.getInstance().emit(EventType.EVENT_SHOWPROGRESS, Constants.SHOW_PROGRESS);
        
        try {
            const failedFiles: string[] = [];
            
            // Save each editor sequentially
            for (let i = 0; i < unsavedSessions.length; i++) {
                const { id, session } = unsavedSessions[i];
                
                // Update progress item name
                const fileName = session.path.split('/').pop() || session.name;
                AppMgr.getInstance().emit(EventType.EVENT_PROGRESS_ITEM, fileName);
                
                try {
                    // Get the current content for this editor
                    const content = session.content
                    
                    if (content) {
                        if (isLogin && session.gpath) {
                            // If Google user login, save to Google drive
                            const mineType = session.type === EditorType.PYTHON ? 'text/x-python' : 'application/json';
                            const blob = new Blob([content], { type: mineType});
                            await AppMgr.getInstance().driveService.upsertFileToGoogleDrive(blob, fileName, mineType, session.gpath);
                        }

                        // Save the editor
                        await CommandToXRPMgr.getInstance().uploadFile(session.path, content, true);
                        
                        // Update session as saved
                        session.isModified = false;
                        
                        // Save to localStorage
                        this.SaveToLocalStorage(session, content);
                        
                    }

                    // If Google user login, also save to Google drive

                } catch (error) {
                    console.error(`Error saving editor ${id} (${fileName}):`, error);
                }
            }
            
            if (failedFiles.length > 0) {
                console.warn(`Failed to save ${failedFiles.length} file(s): ${failedFiles.join(', ')}`);
            }
            
            if (unsavedSessions.length > 0) {
                this.SelectEditorTab(activeTab);
            }

            // Set progress to 100%
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '100');
            
            // Close progress dialog
            AppMgr.getInstance().emit(EventType.EVENT_UPLOAD_DONE, '');
        } catch (error) {
            console.error('Error saving unsaved editors:', error);
            // Close progress dialog even on error
            AppMgr.getInstance().emit(EventType.EVENT_UPLOAD_DONE, '');
            throw error;
        }
    }

    /**
     * clearLastFileSaveTime - clear the last file save time for Google Drive files
     */
    public clearLastFileSaveTime() {
        localStorage.removeItem(StorageKeys.LAST_GOOGLE_DRIVE_TO_XRP_SAVE_TIME);
    }

    /**
     * saveAllFilesInGoogleDriveToXRP
     * @param sessionId 
     * @returns 
     */
    public async saveAllFilesInGoogleDriveToXRP(sessionId: string): Promise<void> {
        const lastSaveTime = localStorage.getItem(StorageKeys.LAST_GOOGLE_DRIVE_TO_XRP_SAVE_TIME);
        const lastSaveDate = lastSaveTime ? new Date(parseInt(lastSaveTime)) : null;

        const session = this.editorSessions.get(sessionId);
        if (!session) {
            return;
        }

        const isConnected = AppMgr.getInstance().getConnection()?.isConnected() ?? false;
        if (!isConnected) {
            return; // Can't save if not connected
        }

        if (!AppMgr.getInstance().authService.isLogin) {
            return; // Can't save if not logged in
        }

        try {
            // Get a list of all files in Google Drive parent directory
            const parentId = session.gparentId;
            if (!parentId) {
                return;
            }

            const fileList = await AppMgr.getInstance().driveService.getFileListByFolderId(parentId);

            const googleFilesTobeUploadedToXRP: GoogleDriveFile[] = [];
            
            // Iterate through files and upload to XRP if modified since last save
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                const fileName = file.name;
                AppMgr.getInstance().emit(EventType.EVENT_PROGRESS_ITEM, fileName);

                try {

                    if (file.mimeType === 'application/vnd.google-apps.folder') {
                        // Skip folders
                        continue;
                    }

                    const fileModifiedDateTime = new Date(file.modifiedTime || '');
                    if (lastSaveDate && fileModifiedDateTime <= lastSaveDate) {
                        // Skip files that have not been modified since last save
                        continue;
                    }

                    googleFilesTobeUploadedToXRP.push(file);

                } catch (error) {
                    console.error(`Error identifying Google Drive modified file ${fileName} to XRP:`, error);
                }
            }

            if (googleFilesTobeUploadedToXRP.length === 0) {
                return; // Nothing to save
            }

            // Show progress dialog
            AppMgr.getInstance().emit(EventType.EVENT_SHOWPROGRESS, Constants.SHOW_PROGRESS);

            for (let i = 0; i < googleFilesTobeUploadedToXRP.length; i++) {
                const file = googleFilesTobeUploadedToXRP[i];
                const fileName = file.name;
                AppMgr.getInstance().emit(EventType.EVENT_PROGRESS_ITEM, fileName);

                try {
                    // Get file content from Google Drive
                    await AppMgr.getInstance().driveService.getFileContents(file.id).then(async (fileContent) => {;
                        // Determine XRP path
                        const xrpPath = `${session.path.split('/').slice(0, -1).join('/')}/${fileName}`; // Adjust path as needed

                        // Upload to XRP
                        await CommandToXRPMgr.getInstance().uploadFile(xrpPath, fileContent || '', true);
                    });
                } catch (error) {
                    console.error(`Error saving Google Drive file ${fileName} to XRP:`, error);
                }
            }

            // Update the last save time in local storage
            localStorage.setItem(StorageKeys.LAST_GOOGLE_DRIVE_TO_XRP_SAVE_TIME, Date.now().toString());

            // Set progress to 100%
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '100');
            // Close progress dialog
            AppMgr.getInstance().emit(EventType.EVENT_UPLOAD_DONE, '');
        } catch (error) {
            console.error('Error saving files to XRP:', error);
            // Close progress dialog even on error
            AppMgr.getInstance().emit(EventType.EVENT_UPLOAD_DONE, '');
            throw error;
        }
    }
}