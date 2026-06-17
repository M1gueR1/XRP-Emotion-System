import { FolderItem } from '@/utils/types';
import { Tree, NodeApi, NodeRendererProps } from 'react-arborist';
import { RiArrowDownSFill, RiArrowRightSFill } from 'react-icons/ri';
import { useEffect, useRef, useState } from 'react';
import AppMgr, { EventType, LoginStatus } from '@/managers/appmgr';
import useResizeObserver from 'use-resize-observer';
import { FaRegFolder } from 'react-icons/fa';
import { FaFileAlt } from 'react-icons/fa';
import BlocklyIcon from '@/components/icons/blockly-icon';
import MicropythonIcon from '@/components/icons/micropython-icon';
import { MdEdit } from 'react-icons/md';
import { MdDeleteOutline } from 'react-icons/md';
import FolderHeader from './folder-header';
import uniqueId from '@/utils/unique-id';
import { CommandToXRPMgr } from '@/managers/commandstoxrpmgr';
import logger from '@/utils/logger';
import { Constants } from '@/utils/constants';
import { ConnectionState } from '@/connections/connection';
import { useTranslation } from 'react-i18next';
import Dialog from './dialogs/dialog';
import ConfirmationDlg from './dialogs/confirmdlg';
import AlertDialog from './dialogs/alertdlg';
import { fireGoogleUserTree, getUsernameFromEmail } from '@/utils/google-utils';
import EditorMgr, { EdSearchParams } from '@/managers/editormgr';
import Login from '@/widgets/login';
import { UserProfile } from '@/services/google-auth';
import CreateNodeDlg from './dialogs/create-node-dlg';
import { StorageKeys } from '@/utils/localstorage';

type TreeProps = {
    treeData: string | null;
    onSelected?: (selectedItem: FolderItem) => void;
    theme: string;
    isHeader?: boolean;
};

/**
 * Folder component
 * @param treeProps
 * @returns
 */
function FolderTree(treeProps: TreeProps) {
    const { t } = useTranslation();
    const [isConnected, setConnected] = useState(false);
    const [isLogin, setIsLogin] = useState(false);
    const [treeData, setTreeData] = useState<FolderItem[] | undefined>(undefined);
    const [, setSelectedItems] = useState<FolderItem[] | undefined>(undefined);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const appMgrRef = useRef<AppMgr>();
    const treeRef = useRef(null);
    const { ref, width, height } = useResizeObserver();
    const folderLogger = logger.child({ module: 'folder-tree' });
    const [dialogContent, setDialogContent] = useState<React.ReactNode>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [hasSubscribed, setHasSubscribed] = useState<boolean>(false);
    const [isTreeLoaded, setIsTreeLoaded] = useState(false);

    useEffect(() => {
        // If treeData is passed as a prop, build the tree
        if (treeProps.treeData) {
            const data = JSON.parse(treeProps.treeData);
            setTreeData(data);
        }
    }, [treeProps.treeData]);

    useEffect(() => {

        if (!hasSubscribed) {
            appMgrRef.current = AppMgr.getInstance();

            setConnected(appMgrRef.current.getConnection()?.isConnected() ?? false);

            appMgrRef.current.on(EventType.EVENT_CONNECTION_STATUS, (state: string) => {
                if (state === ConnectionState.Connected.toString()) {
                    setConnected(true);
                } else {
                    setConnected(false);
                }
            });

            appMgrRef.current.on(EventType.EVENT_ISRUNNING, (running: string) => {
                if (running === 'running') {
                    setIsRunning(true);
                } else if (running === 'stopped') {
                    setIsRunning(false);
                }
            });
            
            appMgrRef.current.on(EventType.EVENT_FILESYS, (filesysJson: string) => {
                try {
                    const filesysData = JSON.parse(filesysJson);
                    if (Object.keys(filesysData).length === 0 && AppMgr.getInstance().authService.isLogin === true) {       
                        fireGoogleUserTree(getUsernameFromEmail(AppMgr.getInstance().authService.userProfile.email) ?? '');
                    } else if (Object.keys(filesysData).length == 0) {
                        setTreeData(undefined);
                    } else if (AppMgr.getInstance().authService.isLogin && filesysData[0].id === 'root') {
                        return;
                    } else {
                        setTreeData(filesysData);
                        appMgrRef.current?.setFoderData(filesysJson);
                    }
                } catch (err) {
                    if (err instanceof Error) {
                        folderLogger.error(`Failed to parse filesys data:  ${err.stack ?? err.message}`);
                    }
                    setTreeData(undefined);
                }
            });

            setHasSubscribed(true);
        }
    }, [isConnected]);

    /**
     * Auto select and open the root node when the tree data is loaded
     */
    useEffect(() => {
        if (treeData && treeData.length > 0 && !isTreeLoaded && treeRef.current) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            treeRef.current.select(treeData[0].id);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            treeRef.current.open(treeData[0].id);
            setIsTreeLoaded(true);
        } else if (!treeData) {
            setIsTreeLoaded(false);
        }
    }, [treeData, isTreeLoaded]);

    /**
     * toggleDialog - toggle the dialog open/close state
     */
    const toggleDialog = () => {
        if (!dialogRef.current) {
            return;
        }
        if (dialogRef.current.hasAttribute('open')) {
            dialogRef.current.close();
        }
        else dialogRef.current.showModal();
    };

    /**
     * Input component for renaming nodes
     * @param param0
     * @returns
     */
    function Input({ node }: { node: NodeApi<FolderItem> }) {
        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            const { value } = e.currentTarget;
            const lastDotIndex = value.lastIndexOf('.');

            // If it's a leaf node (a file) and has an extension, select only the name part.
            if (node.isLeaf && lastDotIndex > 0) {
                e.currentTarget.setSelectionRange(0, lastDotIndex);
            } else {
                // Otherwise, select the whole text (for folders or files without extensions).
                e.currentTarget.select();
            }
        };

        return (
            <input
                autoFocus
                type="text"
                defaultValue={node.data.name}
                onFocus={handleFocus}
                onBlur={() => node.reset()}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') node.reset();
                    if (e.key === 'Enter') {
                        const { value } = e.currentTarget;
                        // Submit the value from the input. The onRename handler will manage the extension.
                        node.submit(value);
                    }
                }}
            />
        );
    }

    /**
     * getFilePath - construct the file path
     * @param node
     * @returns filepath
     */
    function getFilePath(node: FolderItem) {
        const username = getUsernameFromEmail(AppMgr.getInstance().authService.userProfile.email);
        const path = node.path.includes('/XRPCode/')
            ? node.path.replace('/XRPCode/', Constants.GUSERS_FOLDER + `${username}/`)
            : node.path === '/' ?  node.path : node.path + '/';
        const filePath = path === '/'
            ? path + node.name
            : path + node.name;
        return filePath;
    }    

    /**     
     * Node component for rendering each tree node
     * @param param0
     * @returns
     */
    function Node({ node, style, dragHandle, tree }: NodeRendererProps<FolderItem>) {
        let Icon = null;
        if (node.data.name.includes('.py')) {
            Icon = MicropythonIcon;
        } else if (node.data.name.includes('.blocks')) {
            Icon = BlocklyIcon;
        } else if (node.children) {
            Icon = FaRegFolder;
        } else {
            Icon = FaFileAlt;
        }

        return (
            <div
                ref={dragHandle}
                style={style}
                className={`group flex flex-row items-center justify-between hover:bg-matisse-400 dark:hover:bg-shark-500 ${node.isSelected ? 'bg-curious-blue-300 dark:bg-shark-400' : ''} ${isRunning ? 'opacity-50 pointer-events-none' : 'opacity-100 pointer-events-auto'}}`}
                onClick={(e) => {
                    if (node.isInternal) node.toggle();
                    if (!(e.detail % 2) && !isRunning) {
                        if (node.children === null) {
                            const filePath = getFilePath(node.data);
                            const filePathData = {
                                xrpPath: filePath,
                                gPath: node.data.fileId,
                                gparentId: node.data.gparentId
                            };
                            AppMgr.getInstance().emit(EventType.EVENT_OPEN_FILE, JSON.stringify(filePathData));
                        }
                    } else {
                        if (node.children === null) {
                            const filePath = getFilePath(node.data);
                            const seachParams: EdSearchParams = {
                                name: node.data.name,
                                path: filePath,
                            }
                            EditorMgr.getInstance().SelectEditorTabByName(seachParams);
                        }
                    }
                }}
            >
                <div className="flex flex-row items-center">
                    {node.isLeaf === false &&
                        (node.isOpen ? <RiArrowDownSFill /> : <RiArrowRightSFill />)}
                    <span>
                        <Icon />
                    </span>
                    <span className="overflow-wrap mx-1 whitespace-nowrap">
                        {node.isEditing ? <Input node={node} /> : node.data.name}
                    </span>
                </div>
                {!treeProps.onSelected && (
                    <div className="invisible flex flex-row items-center gap-1 px-2 group-hover:visible">
                        <button className={`${isRunning ? 'opacity-50 pointer-events-none' : 'opacity-100 pointer-events-auto'}`} onClick={() => node.edit()} title={t('rename')}>
                            <MdEdit size={'1.5em'} />
                        </button>
                        <button className={`${isRunning ? 'opacity-50 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
                            onClick={() => {
                                tree.delete(node.id);
                            }}
                            title={t('delete')}
                        >
                            <MdDeleteOutline size={'1.5em'} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const findNode = (nodes: FolderItem[], id: string): FolderItem | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const findParent = (nodes: FolderItem[], id: string): FolderItem | null => {
        for (const node of nodes) {
            if (node.children?.some(child => child.id === id)) {
                return node;
            }
            if (node.children) {
                const found = findParent(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    /**
     * onDelete - delete tree item callback. Multiple tree items can be deleted at the same time.
     * @param param0
     */
    const onDelete = async ({ ids, nodes }: { ids: string[]; nodes: NodeApi<FolderItem>[] }) => {
        folderLogger.debug(`Deleting nodes with ids: ${ids.join(', ')}`);
        const rootNodes = treeData ? [...treeData] : [];
        if (rootNodes.length === 0) return;

        const found = findNode(rootNodes, nodes[0].data.id);

        /**
         * handleOnDeleteConfirmation - handle the delete confirmation
         */
        const handleOnDeleteConfirmation = async () => {
            toggleDialog();
            if (found) {
                if (isLogin) {
                    // delete the actual file in Google Drive
                    if (found.fileId) {
                        await AppMgr.getInstance().driveService?.DeleteFile(found.fileId);
                        const username = getUsernameFromEmail(AppMgr.getInstance().authService.userProfile.email);
                        if (username) {
                            // refresh the Google Drive tree
                            fireGoogleUserTree(username);
                        }
                    }
                } else if (isConnected) {
                    // delete the actual file in XRP
                    await CommandToXRPMgr.getInstance().deleteFileOrDir(getFilePath(found));
                }

                // remove the node from the tab and editor manager
                const editorMgr = EditorMgr.getInstance();
                const searchParams : EdSearchParams = {
                    name: found.name,
                    path: getFilePath(found),
                }
                const editorSession = editorMgr.getEditorSessionByName(searchParams);
                if (editorSession) {
                    editorMgr.RemoveEditorTabByName(searchParams);
                    editorMgr.RemoveEditorByName(searchParams);
                }
            }
        };

        if (found) {
            setDialogContent(<ConfirmationDlg acceptCallback={handleOnDeleteConfirmation} toggleDialog={toggleDialog} confirmationMessage={t('confirmDeleteFileOrFolder', { name: found.name })} />);
            toggleDialog();
        }
    };

    /**
     * onRename - rename tree item callback
     * @param id, name, and node
     */
    const onRename = async ({
        id,
        name,
        node,
    }: {
        id: string;
        name: string;
        node: NodeApi<FolderItem>;
    }) => {
        folderLogger.debug(`Renaming node with id: ${id}, name: ${name} node: ${node.data}`);
        const rootNodes = treeData ? [...treeData] : [];
        if (rootNodes.length === 0) return;

        const found = findNode(rootNodes, node.data.id);

        if (found) {
            // Preserve file extension if user omits it
            const originalName = found.name;
            const originalExtension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';

            if (originalExtension && !name.endsWith(originalExtension) && !name.includes('.')) {
                name += originalExtension;
            }

            if (isLogin) {
                // rename the actual file in Google Drive
                await AppMgr.getInstance().driveService?.renameFile(found.fileId ?? '', name);
                const username = getUsernameFromEmail(AppMgr.getInstance().authService.userProfile.email);
                if (username) {
                    // refresh the Google Drive tree
                    fireGoogleUserTree(username);
                }
            } else if (isConnected) {
                // rename the actual file in XRP
                await CommandToXRPMgr.getInstance().renameFile(getFilePath(found), found.path + '/' + name);
            }

            const searchParams : EdSearchParams = {
                name: found.name,
                path: getFilePath(node.data),
            }
            EditorMgr.getInstance().RenameEditorTab(searchParams, name);

            // update the name field
            found.name = name;
        }
    };

    /**
     * onCreate - create a new tree item callback
     * @param param0 
     * @returns 
     */
    const onCreate = async ({
        parentId,
        parentNode,
        index,
        type,
    }: {
        parentId: string | null;
        parentNode: NodeApi<FolderItem> | null;
        index: number;
        type: 'internal' | 'leaf';
    }) => {
        folderLogger.debug(`Create node: ${parentId}, ${parentNode}, ${index}, ${type}`);

        if (parentId === null && parentNode === null) {
            folderLogger.error('Cannot create node: parentId and parentNode are both null');
            setDialogContent(<AlertDialog toggleDialog={toggleDialog} alertMessage={t('select-parent-node')} />);
            toggleDialog();
            return null;
        }

        const parentPath = (parentNode?.data.name === '/' || parentNode?.data.name === Constants.XRPCODE)
            ? parentNode.data.path : (isLogin) ? `${parentNode?.data.path}${parentNode?.data.name}/` :
            `${parentNode?.data.path}/${parentNode?.data.name}/`;

        // Ask for filename using a promise-based modal
        const name = await new Promise<string | null>((resolve) => {
            setDialogContent(
                <CreateNodeDlg
                    type={type}
                    parentPath={parentPath}
                    onConfirm={(newName) => {
                        toggleDialog();
                        resolve(newName);
                    }}
                    onCancel={() => {
                        toggleDialog();
                        resolve(null);
                    }}
                />
            );
            toggleDialog();
        });

        if (!name) return null;

        // Generate a unique ID for the new node
        const newId = uniqueId(parentNode?.data.name || `node`);

        // Create the new node object
        const newNode: FolderItem = {
            id: newId,
            name: name,
            isReadOnly: false,
            children: type === 'internal' ? [] : null,
            path: parentPath,
        };

        if (newNode) {
            let parentFileId = null;
            if (parentNode === null) {
                const rootNode = treeData?.at(0);
                parentFileId = rootNode?.fileId;
            } else {
                parentFileId = parentNode.data.fileId;
            }
            if (type === 'internal') {
                if (isLogin) {
                    await AppMgr.getInstance().driveService?.createFolder(newNode.name,  parentFileId ?? undefined).then((data) => {
                        newNode.fileId = data?.id;
                    });
                } else if (isConnected) {
                    // create the actual file in XRP
                    await CommandToXRPMgr.getInstance().buildPath(
                        newNode.path + '/' + newNode.name,
                    );
                } 
            } else if (type === 'leaf') {
                if (isLogin) {
                    const mintetype = newNode.name.includes('.py')
                        ? 'text/x-python' : newNode.name.includes('.blocks')
                        ? 'application/json' : 'text/plain';
                    const blob = new Blob([''], { type: mintetype });
                    await AppMgr.getInstance().driveService?.uploadFile(blob, newNode.name, mintetype, parentFileId ?? undefined).then((file) => {
                        if (file) {
                            newNode.fileId = file.id;
                        }
                    });
                } if (isConnected) {
                    // create the actual file in XRP
                    await CommandToXRPMgr.getInstance().uploadFile(
                        newNode.path + '/' + newNode.name,
                        '',
                        true,
                    );
                } 
            }
        }

        // Update the tree data
        setTreeData((prevTreeData) => {
            if (!prevTreeData) return prevTreeData;

            const rootNode = prevTreeData.at(0);
            if (!rootNode) return prevTreeData;

            if (parentNode) {
                const found = findNode([rootNode], parentNode.data.id);
                if (found) {
                    found.children = found.children || [];
                    found.children.splice(index, 0, newNode);
                }
            } else {
                rootNode.children = rootNode.children || [];
                rootNode.children.splice(index, 0, newNode);
            }

            return [...prevTreeData];
        });

        if (isLogin) {
            const username = getUsernameFromEmail(AppMgr.getInstance().authService.userProfile.email);
            if (username) {
                // refresh the Google Drive tree
                fireGoogleUserTree(username);
            }
        } else if (isConnected) {
            // refresh the XRP onboard tree
            CommandToXRPMgr.getInstance().getOnBoardFSTree();
        }

        return null;
    };

    const onSelected = (nodes: NodeApi<FolderItem>[]) => {
        const selectedItems: FolderItem[] = [];
        nodes.map((node) => selectedItems.push(node.data));
        if (treeProps.onSelected && selectedItems.length > 0) {
            treeProps.onSelected(selectedItems[0]);
        }
        setSelectedItems(selectedItems);
    };

    function onNewFolder(): void {
        if (treeRef.current) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            treeRef.current.createInternal();
        }
    }

    function onNewFile(): void {
        if (treeRef.current) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            treeRef.current.createLeaf();
        }
    }

    /**
     * onGoogleLoginSuccess - callback from Google Login component to handle the login logic
     */
    const onGoogleLoginSuccess = async (data: UserProfile) => {
        AppMgr.getInstance().emit(EventType.EVENT_LOGIN_STATUS, LoginStatus.LOGGED_IN);
        setIsLogin(true);

        const username = getUsernameFromEmail(data.email);

        if (username != undefined) {
            if (isConnected) {
                await CommandToXRPMgr.getInstance().buildPath(Constants.GUSERS_FOLDER + username);
            }
        }

        fireGoogleUserTree(username ?? '');

        const firstTimeLogin = localStorage.getItem(StorageKeys.GOOGLE_FIRST_TIME_LOGIN) === null || localStorage.getItem(StorageKeys.GOOGLE_FIRST_TIME_LOGIN) === 'true';
        if (firstTimeLogin) {
            localStorage.setItem(StorageKeys.GOOGLE_FIRST_TIME_LOGIN, 'false');
            // put up a dialog to inform user that the Google Drive notification about owner created folder and files
            setDialogContent(<AlertDialog toggleDialog={toggleDialog} alertMessage={t('googleDriveNotification')} />);
            toggleDialog();
        }
    }

    /**
     * onGoogleLogout - callback from Google Login component to handle the logout logic
     */
    const onGoogleLogout = async () => {
        setIsLogin(false);
        AppMgr.getInstance().authService.logOut().then(() => {
            AppMgr.getInstance().emit(EventType.EVENT_LOGIN_STATUS, LoginStatus.LOGGED_OUT);
        });

        if (!isConnected) {
            AppMgr.getInstance().emit(EventType.EVENT_FILESYS, '{}');
        } {
            await CommandToXRPMgr.getInstance().getOnBoardFSTree()
        }
    }

    /**
     * Cursor component for rendering the cursor position
     * @param param0 
     * @returns 
     */
    function Cursor({ top, left }: { top: number; left: number }) {
        return (
            <div
                className="absolute w-full h-0 border-dashed border-t-2 bg-mountain-mist-500 dark:bg-mountain-mist-300"
                style={{top, left,}}
            />
        );
    }

    /**
     * onMove - move tree item callback
     * @param args
     */
    async function onMove(args: {
        dragIds: string[];
        dragNodes: NodeApi<FolderItem>[];
        parentId: string | null;
        parentNode: NodeApi<FolderItem> | null;
        index: number;
    }) {
        const { dragNodes, parentNode } = args;

        if (!parentNode) {
            folderLogger.warn('Moving to root is not supported');
            return;
        }

        if (parentNode.isLeaf) {
            return;
        }

        const validDragNodes: NodeApi<FolderItem>[] = [];
        const collisionErrors: string[] = [];

        for (const dragNode of dragNodes) {
            // Prevent dropping a node into its own descendant
            let current: NodeApi<FolderItem> | null = parentNode;
            let isInvalidMove = false;
            while (current) {
                if (current.id === dragNode.id) {
                    isInvalidMove = true;
                    break;
                }
                current = current.parent;
            }

            if (isInvalidMove) {
                continue; // Skip this node, it's an invalid move (e.g. dropping a folder into itself)
            }

            // Check for name collision, but only if it's not a reorder in the same folder
            const isReorder = dragNode.parent?.id === parentNode.id;
            if (!isReorder && parentNode.data.children?.some(child => child.name === dragNode.data.name)) {
                collisionErrors.push(dragNode.data.name);
                continue; // This node will cause a collision, skip it
            }

            validDragNodes.push(dragNode);
        }

        // If there were any collisions, inform the user but proceed with the valid moves.
        if (collisionErrors.length > 0) {
            const message = t('file-exists-error-multi', { filenames: collisionErrors.join(', ') });
            setDialogContent(<AlertDialog toggleDialog={toggleDialog} alertMessage={message} />);
            toggleDialog();
        }

        // If no nodes can be moved, we're done.
        if (validDragNodes.length === 0) {
            return;
        }

        // Backend updates for valid nodes
        for (const dragNode of validDragNodes) {
            if (isLogin) {
                const fileId = dragNode.data.fileId;
                const oldParent = findParent(treeData || [], dragNode.id);
                const oldParentId = oldParent?.fileId;
                const newParentId = parentNode?.data.fileId;

                if (fileId && newParentId && oldParentId) {
                    await AppMgr.getInstance().driveService?.moveFile(fileId, oldParentId, newParentId);
                }
            } else if (isConnected) {
                const oldPath = getFilePath(dragNode.data);
                const newPath = getFilePath(parentNode.data) + '/' + dragNode.data.name;
                await CommandToXRPMgr.getInstance().renameFile(oldPath, newPath);
            }
        }

        if (isLogin) {
            const username = getUsernameFromEmail(AppMgr.getInstance().authService.userProfile.email);
            if (username) {
                // refresh the Google Drive tree
                fireGoogleUserTree(username);
            }
        } else if (isConnected) {
            // refresh the XRP onboard tree
            CommandToXRPMgr.getInstance().getOnBoardFSTree();
        }
    }

    return (
        <div className="flex flex-col gap-1 h-full">
            {treeProps.isHeader && (
                <div className='flex flex-col items-center p-1 gap-1 bg-mountain-mist-100 dark:bg-mountain-mist-950'>
                    <Login onSuccess={onGoogleLoginSuccess} logoutCallback={onGoogleLogout}/>
                </div>
            )}
            {treeProps.isHeader && (isConnected || isLogin) &&(
                <FolderHeader
                    newFileCallback={onNewFile}
                    newFolderCallback={onNewFolder}
                />
            )}
            <div ref={ref} className="flex-1 min-h-0">
                <Tree
                    ref={treeRef}
                    className="text-md border border-shark-200 bg-mountain-mist-100 text-shark-900 dark:border-shark-950 dark:bg-mountain-mist-950 dark:text-shark-200"
                    data={treeData}
                    width={width}
                    height={height}
                    rowHeight={24}
                    renderCursor={Cursor}
                    openByDefault={false}
                    initialOpenState={{ root: true }}
                    paddingBottom={32}
                    disableEdit={(data) => data.isReadOnly}
                    onDelete={onDelete}
                    onRename={onRename}
                    onSelect={onSelected}
                    onCreate={onCreate}
                    onMove={onMove}
                >
                    {Node}
                </Tree>
            </div>
            <Dialog isOpen={false} toggleDialog={toggleDialog} ref={dialogRef}>
                {dialogContent}
            </Dialog>
        </div>
    );
}

export default FolderTree;
