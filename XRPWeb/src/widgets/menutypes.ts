export type MenuDataItem = {
    label: string;
    isFile?: boolean;
    isView?: boolean;
    link?: string;
    iconImage?: string;
    clicked?: () => void;
    children?: MenuDataItem[];
    childrenExt?: MenuDataItem[];
};