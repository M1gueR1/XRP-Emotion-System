import { IJsonTabNode, Layout } from "flexlayout-react";
import { EditorType, FileType, NewFileData } from "./types";
import AppMgr, { EventType } from "@/managers/appmgr";
import { Constants } from "./constants";
import EditorMgr from "@/managers/editormgr";
import { v4 as uuidv4 } from 'uuid';

/**
 * CreateEditorTab - create the editor tabs in the editor tabset
 * @param data - file data
 * @param layoutref - reference to the layout
 */
export function CreateEditorTab(data: NewFileData, layoutref: React.RefObject<Layout>) : string {
    switch (data.filetype) {
        case FileType.BLOCKLY:
            {
                const uniqueId = data.id ? data.id : uuidv4();
                const tabInfo: IJsonTabNode = {
                    component: 'blockly',
                    name: data.name,
                    id: uniqueId,
                    helpText: data.path,
                };
                layoutref!.current?.addTabToTabSet(Constants.EDITOR_TABSET_ID, tabInfo);
                AppMgr.getInstance().emit(EventType.EVENT_EDITOR, EditorType.BLOCKLY);
                EditorMgr.getInstance().AddEditor({
                    id: uniqueId,
                    name: data.name,
                    type: EditorType.BLOCKLY,
                    path: data.path,
                    gpath: data.gpath,
                    gparentId: data.gparentId,
                    isSubscribed: false,
                    fontsize: Constants.DEFAULT_FONTSIZE,
                    content: data.content,
                    lastUpdated: new Date(),
                    isModified: false,
                });
                return uniqueId;
            }
        case FileType.PYTHON:
        case FileType.OTHER:
            {
                const uniqueId = data.id ? data.id : uuidv4();
                const tabInfo: IJsonTabNode = {
                    component: 'editor',
                    name: data.name,
                    id: uniqueId,
                    helpText: data.path,
                };
                layoutref!.current?.addTabToTabSet(Constants.EDITOR_TABSET_ID, tabInfo);
                AppMgr.getInstance().emit(EventType.EVENT_EDITOR, EditorType.PYTHON);
                EditorMgr.getInstance().AddEditor({
                    id: uniqueId,
                    name: data.name,
                    type: EditorType.PYTHON,
                    path: data.path,
                    gpath: data.gpath,
                    gparentId: data.gparentId,
                    isSubscribed: false,
                    fontsize: Constants.DEFAULT_FONTSIZE,
                    content: data.content,
                    lastUpdated: new Date(),
                    isModified: false,
                });
                return uniqueId;
            }
    }
}
