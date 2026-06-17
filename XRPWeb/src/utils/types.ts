export enum ConnectionType {
    USB,
    BLUETOOTH,
}

export enum FileType {
    BLOCKLY,
    PYTHON,
    OTHER
}

export enum EditorType {
    BLOCKLY = 'blockly',
    PYTHON = 'python',
    OTHER = 'other'
}

export enum ConnectionCMD {
    CONNECT_USB = 'usb-connection',
    CONNECT_BLUETOOTH = 'bluetooth-connection',
    CONNECT_RUN = 'run',
    CONNECT_STOP = 'stop'
}

export enum FontSize {
    INCREASE = 'increase',
    DESCREASE = 'descrease'
}
export interface FolderItem {
    id: string;
    name: string;
    isReadOnly: boolean;
    icon?: React.ComponentType;
    path: string;
    fileId?: string;    // Google Drive file ID
    gparentId?: string; // Google Drive parent IDxs
    createdTime?: string;
    modifiedTime?: string;
    parent?: FolderItem;
    children: FolderItem[] | null;
};

export type ListItem = {
    label: string;
    image?: string;
};

export type NewFileData = {
    id?: string;
    name: string;
    path: string,
    gpath?: string,
    gparentId?: string,
    filetype: FileType
    parentId: string;
    content?: string;
}

export type FileData = {
    name: string;
    content: string;
}

export type Versions = {
    currentVersion: string;
    newVersion: string;
}

// AI Chat Types
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    model?: string;
}

export enum ChatStatus {
    IDLE = 'idle',
    LOADING = 'loading',
    STREAMING = 'streaming',
    ERROR = 'error'
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}

export type AdminData = {
    name: string;
    email: string;
    isAmin: boolean;
};
