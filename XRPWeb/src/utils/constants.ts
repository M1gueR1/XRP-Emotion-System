// Copyright (c) Experiential Inc. and other XRP contributors.
// Open Source Software; you can modify and share it under the terms of the
// GNU General Public License v.3.
// See https://www.gnu.org/licenses/
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details.
export class Constants {
    static readonly APP_VERSION = '2.0.3';
    static readonly EDITOR_TABSET_ID = 'editorTabSetId';
    static readonly SHELL_TABSET_ID = 'shellTabSetId';
    static readonly SHELL_TAB_ID = 'shellTabId';
    static readonly FOLDER_TAB_ID = 'folderTabId';
    static readonly AI_CHAT_TAB_ID = 'aiChatTabId';
    static readonly DASHBOARD_TAB_ID = 'dashboardTabId';
    static readonly DEFAULT_FONTSIZE = 14;
    static readonly TRASH_FOLDER = '/trash';
    static readonly SHOW_CHANGELOG = 'show-changelog';
    static readonly SHOW_PROGRESS = 'show-progress';
    static readonly ADMIN_FILE = 'admin.json';
    static readonly GUSERS_FOLDER = '/gusers/';
    static readonly XRPCODE = 'XRPCode';
    static readonly XRPCODE_BACKUP = 'XRPCodeBackup';
    static readonly LIBDIR = '/lib/';
    static readonly CONNECTED = "Connected";
    static readonly DISCONNECTED = "Disconnected";
    static readonly REGEX_FILENAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9 ._-]*[a-zA-Z0-9])?\.[a-zA-Z0-9_-]+$/;
    static readonly REGEX_DIRNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9 _-]*[a-zA-Z0-9])?$/;
    static readonly XRP_PROCESSOR_BETA = "RPI-RP2"
    static readonly LASTSAVETIME_CONFG = '1';
    static readonly XRP_ROOT_FOLDER = '/';
}

export class FlowBiteConstants {
    static readonly DropdownTheme = {
        base: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
        item: 'hover:bg-gray-100 dark:hover:bg-gray-700',
        itemActive: 'bg-blue-500 text-white dark:bg-blue-600',
        itemDisabled: 'text-gray-400 dark:text-gray-500',
        inlineWrapper: 'text-white bg-shark-200 hover:bg-curious-blue-300 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-shark-600 dark:hover:bg-shark-500 dark:focus:ring-blue-800',
  };
}