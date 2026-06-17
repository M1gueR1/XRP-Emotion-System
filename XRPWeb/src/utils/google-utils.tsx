import AppMgr, { EventType } from "@/managers/appmgr";
import { FolderItem } from "./types";
import { Constants } from "./constants";
import { GoogleDriveFile } from "@/services/google-drive";

/**
 * transformGDriveTreeToFolderTree - recursively convert the GoogleDriveFile tree to FolderItem tree
 * @param username - username to be used in XRP Robot path
 * @param driveItem - tree items from Google Drive
 * @returns - A FolderItem structure
 */
const transformGDriveTreeToFolderTree = (username: string, path: string, driveItem: GoogleDriveFile): FolderItem => {
    const itemType: 'file' | 'folder' = 
        driveItem.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file';
    
    const folderItem: FolderItem = {
        name: driveItem.name,
        id: driveItem.id,
        fileId: driveItem.id,
        gparentId: driveItem.parents ? driveItem.parents[0] : undefined,
        isReadOnly: false, 
        path: path,
        createdTime: driveItem.createdTime,
        modifiedTime: driveItem.modifiedTime,
        children: itemType === 'folder' ? [] : null,
    }

    if (driveItem.children && driveItem.children.length > 0 && itemType === 'folder') {
        const folderName = path.split('/').at(-2);
        const fullpath = folderName=== folderItem.name ? `${folderItem.path}` : `${path}${folderItem.name}/`;
        folderItem.children = driveItem.children.map(child =>
            transformGDriveTreeToFolderTree(username, fullpath, child)
        );
    }
    return folderItem;
};

/**
 * fireGoogleUserTree - get a list of Google files in XRPCode folder and generate a folder tree
 */
export const fireGoogleUserTree = async (username: string) => {
    const driveService = AppMgr.getInstance().driveService;

    await driveService.buildTree(Constants.XRPCODE).then((tree) => {
        if (tree) {
            const folderTree = transformGDriveTreeToFolderTree(username, `/${tree.name}/`, tree);
            AppMgr.getInstance().emit(EventType.EVENT_FILESYS, JSON.stringify([folderTree]));
        };
    });
}

/**
 * getUsernameFromEmail - extract username from email
 * @param email email address
 * @returns username part of the email
 */
export const getUsernameFromEmail = (email: string): string | undefined => {
    if (typeof email !== 'string' || !email.includes('@')) {
        return undefined;
    }
    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
        return undefined;
    }
    return email.substring(0, atIndex);
};