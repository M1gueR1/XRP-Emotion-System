// Copyright (c) Experiential Inc. and other XRP contributors.
// Open Source Software; you can modify and share it under the terms of the
// GNU General Public License v.3.
// See https://www.gnu.org/licenses/
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details
import Connection from '@/connections/connection';
import { FolderItem, Versions } from '@/utils/types';
import AppMgr, { EventType } from '@/managers/appmgr';
import logger from '@/utils/logger';

declare global {
    interface Window {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<any>;
    }
  }

/**
 * CommandsToXRPMgr - manages routines that send commands to the XRP REPL
 **/
export class CommandToXRPMgr {
    private static instance: CommandToXRPMgr;
    private cmdLogger = logger.child({module: 'command'})
    // private xrpDataMgr: XRPDataMgr = XRPDataMgr.getInstance();
    private connection: Connection | null = null;

    //private DIR_DATA: string[] | undefined;
    //private DIR_STRUCT: any; // TODO: unsure of type
    //private DIR_INDEX: number = 0;
    //private LAST_RUN: string | undefined;

    private PROCESSOR: number | undefined = undefined;
    private lastRun: string | undefined = undefined;

    public BUSY: boolean = false;

    // Set true so most terminal output gets passed to javascript terminal
    private DEBUG_CONSOLE_ON: boolean = true;
    private HAS_MICROPYTHON: boolean = false;
    private is_XRP_MP: boolean = false;
    private is_NanoXRP: boolean = false;

    private latestLibraryVersion: string = "";

    private mpVersion: string | number[] = [];
    private mpBuild: string | undefined = undefined;
    private mpFilename: string | undefined = undefined;
    phewList = ["__init__.py","dns.py","logging.py","server.py","template.py"];
    bleList = ["__init__.py","blerepl.py", "ble_uart_peripheral.py", "isrunning"] 
    XRPId:string | undefined = undefined;

    constructor(){
        this.getLibVersion();
        this.getMicropythonVersion();
    }

    /**
     * getLibVersion - get the XRP library version
     */
    async getLibVersion(){
        const response = await fetch("lib/package.json"); // do we need to cache bust? + "?version=" + showChangelogVersion //need an await?
        const responseTxt = await response.text();
        const jresp = JSON.parse(responseTxt);
        const v = jresp.version
        // This should match what is in /lib/XRPLib/version.py as '__version__'
        this.latestLibraryVersion = v.split(".");
    }

    /**
     * getMicropythonVersion - get the micropython version
     */
    async getMicropythonVersion(){
        const response = await fetch("micropython/package.json"); 
        const responseTxt = await response.text();
        const jresp = JSON.parse(responseTxt);
        const v = jresp.version
        this.mpVersion = v.split(".");
        this.mpBuild = jresp.firmwareBuild;
        this.mpFilename = jresp.firmwareFilename;
    }

    public CommandsToXRPMgr() {
        //constructor
        //resetTerminal
        //clearIsRunning
        //batteryVoltage
        //checkIfNeedUpdate
        //getVersionInfo
       
        //getOnBoardFSTree
        //deleteFileOrDir
        //renameFile
        //downloadFile
        //buildPath
        //uploadFile
        //uploadFiles
        //getFileContents
        //checkFileExists (do we need this?)
        
        //updateMainFile 
        //executeLines
        //resetBot
    }

    public static getInstance(): CommandToXRPMgr {
        if (!CommandToXRPMgr.instance) {
            CommandToXRPMgr.instance = new CommandToXRPMgr();
        }
        return this.instance;
    }

    /**
     * setConnection - set the proper connection for the command to work with
     * @param connection 
     */
    public setConnection(connection: Connection) {
        this.connection = connection;
    }

    /*** Initial utilities  ***/

    // if we attached via the cable then make sure we are not trying to output to via the BLE
    async resetTerminal() {
        if (this.BUSY == true) {
            return;
        }
        this.BUSY = true;

        const cmd = "import os\n" +
            "os.dupterm(None)\n";
      
        await this.connection?.writeUtilityCmdRaw(cmd, true, 1);

        await this.connection?.getToNormal(3);
        this.BUSY = false;
    }

    async clearIsRunning() {
        if (this.BUSY == true) {
            return;
        }
        this.BUSY = true;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: in clearIsRunning");;


        // Got through and make sure entire path already exists
        const cmd = "import sys\n" +
            "FILE_PATH = '/lib/ble/isrunning'\n" +
            "try:\n" +
            "   with open(FILE_PATH, 'r+b') as file:\n" +
            "      file.write(b'\\x00')\n" +
            "except Exception as err:\n" +
            "    print('Some kind of error clearing is running..' + err)\n";

        await this.connection?.writeUtilityCmdRaw(cmd, true, 1);

        // Get back into normal mode and omit the 3 lines from the normal message,
        // don't want to repeat (assumes already on a normal prompt)
        await this.connection?.getToNormal(3);

        this.BUSY = false;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: out of clearIsRunning");
    }

    public async batteryVoltage(): Promise<number> {
        if (this.BUSY == true) {
            return 0;
        }
        this.BUSY = true;

        let vpin = '28';
        if (this.is_XRP_MP) {
            vpin = "'BOARD_VIN_MEASURE'";
        }

        const cmd = 'from machine import ADC, Pin\n' + 'print(ADC(Pin(' + vpin + ')).read_u16())\n';

        const hiddenLines = await this.connection?.writeUtilityCmdRaw(cmd, true, 1);

        await this.connection?.getToNormal(3);
        this.BUSY = false;
        const value = parseInt(hiddenLines![0].substring(2)); //get the string after the OK
        return value / ((1024 * 64) / 14); //the voltage ADC is 64k (RP2040 ADC is 0-4095 but micropython adjusts it to 0 - 64K) And while the voltage is a max of 11V, the divider comes out close to 14V
    }

    public async getVersionInfo(): Promise<(string | undefined)[]> {
        if (this.BUSY == true) {
            return [];
        }
        this.BUSY = true;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug('fcg: in getVersionInfo');

        const cmd =
            'import os\n' +
            'import sys\n' +
            'import machine\n' +
            'print(sys.implementation[1])\n' +
            'print(sys.implementation[2])\n' +
            'try:\n' +
            '    f = open("/lib/XRPLib/version.py", "r")\n' +
            '    while True:\n' +
            '        line = f.readline()\n' +
            '        if len(line) == 0:\n' +
            '            print("ERROR EOF")\n' +
            '            break\n' +
            '        if "__version__ = " in line:\n' +
            // eslint-disable-next-line no-useless-escape
            "            print(line.split('\\\'')[1])\n" +
            '            break\n' +
            'except:\n' +
            '    print("ERROR EX")\n' +
            "print(''.join(['{:02x}'.format(b) for b in machine.unique_id()]));";

        const hiddenLines = await this.connection?.writeUtilityCmdRaw(cmd, true, 1);

        await this.connection?.getToNormal(3);
        this.BUSY = false;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug('fcg: out of getVerionINfo');

        if (hiddenLines != undefined && hiddenLines.length > 0) {
            if (hiddenLines[0].substring(2) != 'ERROR') {
                if (this.PROCESSOR == undefined) {
                    if (hiddenLines[1].includes('RP2350')) {
                        this.PROCESSOR = 2350;
                    } else if (hiddenLines[1].includes('RP2040')) {
                        this.PROCESSOR = 2040;
                        this.is_NanoXRP = hiddenLines[1].includes('NanoXRP');
                        this.connection?.setNanoXRP(this.is_NanoXRP);
                    }
                }
                if(hiddenLines[1].includes('XRP')){ //is this an XRP version of microPython?
                    this.is_XRP_MP = true;
                }
                return [
                    hiddenLines[0].substring(2),
                    hiddenLines[2],
                    hiddenLines[3],
                    hiddenLines[1],
                ];
            } else {
                console.error('Error getting version information');
                return [];
            }
        }
        return [];
    }

    async checkIfNeedUpdate():Promise<string | undefined> {
        //This is only called when a new XRP is attached. Reset a few variables.
        this.XRPId = undefined;
        this.lastRun = undefined;
        this.HAS_MICROPYTHON = true;    // this is set after connection is successful
        this.is_NanoXRP = false;
        this.connection?.setNanoXRP(false);

        //get version information from the XRP
        const info = await this.getVersionInfo();

        if (info == undefined || info[0] == undefined || info[1] == undefined) {
            return this.XRPId; //this happens if the XRP is rebooting we are under BLE and no other way to stop it.
        }

        this.XRPId = info[2]; //store off the unique ID for this XRP

        info[0] = info[0]!.replace(/[()]/g, "").replace(/,\s/g, "."); //convert to a semantic version
        //if the microPython is out of date
        if (this.isVersionNewer(this.mpVersion, info[0]!)) {
            // Need to update MicroPython
            
            const mpVersions : Versions = {
                currentVersion: info[0]!,
                newVersion: this.mpVersion[0] + "." + this.mpVersion[1] + "." + this.mpVersion[2] + "." + this.mpBuild
            }
            AppMgr.getInstance().emit(EventType.EVENT_MICROPYTHON_UPDATE, JSON.stringify(mpVersions));
            return this.XRPId;
        }

        //if no library or the library is out of date
        if (Number.isNaN(parseFloat(info[1] as string)) || this.isVersionNewer(this.latestLibraryVersion, info[1] as string)) {
            //from now on we can only update the library if we are on an XRP version of the microPython firmware
            if(!this.is_XRP_MP){
                AppMgr.getInstance().emit(EventType.EVENT_MUST_UPDATE_MICROPYTHON, '');
            }
            if (info[1]) {
                const versions : Versions = {
                    currentVersion: (info[1] as string) === "ERROR EX" ? "None" : info[1] as string,
                    newVersion: this.latestLibraryVersion[0] + "." + this.latestLibraryVersion[1] + "." + this.latestLibraryVersion[2]
                }
                AppMgr.getInstance().emit(EventType.EVENT_XRPLIB_UPDATE, JSON.stringify(versions)); 
            }
        }
        return this.XRPId;
    }

    isVersionNewer(v1: string | number[], v2: string) {
          if(typeof v1 == "string"){
              return false;
          }
        const v1parts = v1;
        const v2parts = v2.split('.').map(Number);

        while (v1parts.length < v2parts.length) v1parts.push(0);
        while (v2parts.length < v1parts.length) v2parts.push(0);

        for (let i = 0; i < v1parts.length; ++i) {
            if (v1parts[i] > v2parts[i]) {
                return true;
            } else if (v1parts[i] < v2parts[i]) {
                return false;
            }
        }
        return false;
    }

    async updateLibrary() {

        const response = await fetch("lib/package.json");
        const responseTxt = await response.text();
        const jresp = JSON.parse(responseTxt);
        const urls = jresp.urls;

        AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '0');
        const percent_per = Math.round(99 / (urls.length + this.phewList.length + this.bleList.length + 1));
        let cur_percent = 1 + percent_per;

        await this.deleteFileOrDir("/lib/XRPLib");  //delete all the files first to avoid any confusion.
        //BUGBUG: should we delete the /XRPExamples?
        for (let i = 0; i < urls.length; i++) {
            //added a version number to ensure that the browser does not cache it.
            const next = urls[i];
            let parts = next[0];
            parts = parts.replace("XRPLib", "lib/XRPLib");
            await this.uploadFile(parts, await this.downloadFile(parts.replace("XRPExamples", "lib/XRPExamples") + "?version=" + this.latestLibraryVersion[2]));
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, cur_percent.toString());
            cur_percent += percent_per;
        }

        //create a version.py file that has the version in it for future checks
        await this.uploadFile("lib/XRPLib/version.py", "__version__ = '" + this.latestLibraryVersion[0] + "." + this.latestLibraryVersion[1] + "." + this.latestLibraryVersion[2] + "'\n");
        cur_percent += percent_per;

        await this.deleteFileOrDir("/lib/ble");  //delete all the files first to avoid any confusion.
        for (let i = 0; i < this.bleList.length; i++) {
            //added a version number to ensure that the browser does not cache it.
            await this.uploadFile("lib/ble/" + this.bleList[i], await this.downloadFile("lib/ble/" + this.bleList[i] + "?version=" + this.latestLibraryVersion[2]));
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, cur_percent.toString());
            cur_percent += percent_per;
        }

        await this.deleteFileOrDir("/lib/phew");  //delete all the files first to avoid any confusion.
        for (let i = 0; i < this.phewList.length; i++) {
            //added a version number to ensure that the browser does not cache it.
            await this.uploadFile("lib/phew/" + this.phewList[i], await this.downloadFile("lib/phew/" + this.phewList[i] + "?version=" + this.latestLibraryVersion[2]));
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, cur_percent.toString());
            cur_percent += percent_per;
        }

        //needed for this BLE release. Replace the main.py file so that the BLE support will be available.
        cur_percent = 100;
        AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, cur_percent.toString());
        await this.uploadFile("/main.py", await this.downloadFile("lib/main.py" + "?version=" + this.latestLibraryVersion[2]));


        await this.getOnBoardFSTree();
    }

    async restartXRP() {
        await this.connection?.writeToDevice(this.connection!.CTRL_CMD_SOFTRESET);
    }

    async enterBootSelect() {
        if (this.HAS_MICROPYTHON) {
            const cmd = "import machine\n" +
                "machine.bootloader()\n";

            await this.connection?.getToRaw();

            this.connection?.startReaduntil("OK");
            await this.connection?.writeToDevice(cmd + this.connection!.CTRL_CMD_SOFTRESET);
        }
    }

    async  downloadFile(filePath:string) {
        const response = await fetch(filePath);
    
        if(response.status != 200) {
            throw new Error("Server Error");
        }
        // read response stream as text
        return await response.text();
    }
    
    /*** File Routines  ***/

    async getInstalledDrivers(): Promise<string[]> {
        const installedDrivers: string[] = [];
        if (this.BUSY == true) {
            return installedDrivers;
        }
        this.BUSY = true;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: in getInstalledDrivers");

        const cmd = "import os\n" +
            "try:\n" +
            "    files = os.listdir('lib')\n" +
            "    for file in files:\n" +
            "        print(file)\n" +
            "except Exception as err:\n" +
            "    print('Some kind of error while listing drivers...' + err)\n";

        const hiddenLines = await this.connection?.writeUtilityCmdRaw(cmd, true, 1);

        await this.connection?.getToNormal(3);
        this.BUSY = false;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: out of getInstalledDrivers");

        if (hiddenLines != undefined && hiddenLines.length > 0) {
            hiddenLines[0] = hiddenLines[0].substring(2); //remove the first line which is the OK
            for (let i = 0; i < hiddenLines.length; i++) {
                installedDrivers.push(hiddenLines[i]);
            }
        }
        return installedDrivers;
    }

    async getOnBoardFSTree(notify: boolean = true) : Promise<string> {
        if (this.BUSY == true) {
            return "";
        }
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: in getOnBoardFSTree");

        this.BUSY = true;

        //window.setPercent(1, "Fetching filesystem...");

        const getFilesystemCmd =
            "import os\n" +
            //"import ujson\n" +
            "import gc\n" +
            "outstr = ''\n" +
            "gc.collect()\n" +  //this is needed for the ble it seems like we run out of memory otherwise
            "def walk(top, structure, dir):\n" +
            "    global outstr\n" +
            "    extend = \"\";\n" +
            "    if top != \"\":\n" +
            "        extend = extend + \"/\"\n" +

            "    item_index = 0\n" +
            "    structure[dir] = {}\n" +

            "    for dirent in os.listdir(top):\n" +                        // Loop through and create structure of on-board FS
            "        if(os.stat(top + extend + dirent)[0] == 32768):\n" +   // File
            //"            print(str(count) + ',' + dir + ',' + str(item_index) + ',F,' + dirent)\n" +
            "            outstr = outstr + dir + ',' + str(item_index) + ',F,' + dirent + ';'\n" +
            //"            structure[dir][item_index] = {\"F\": dirent}\n" +
            "            item_index = item_index + 1\n" +
            "        elif(os.stat(top + extend + dirent)[0] == 16384):\n" + // Dir
            //"            print(str(count) + ',' + dir + ',' + str(item_index) + ',D,' + dirent)\n" +
            "            outstr = outstr + dir + ',' + str(item_index) + ',D,' + dirent + ';'\n" +
            //"            structure[dir][item_index] = {\"D\": dirent}\n" +
            "            item_index = item_index + 1\n" +
            "            walk(top + extend + dirent, structure[dir], dirent)\n" +
            "    return structure\n" +
            "struct = {}\n" +
            "walk(\"\", struct, \"\")\n" +
            "print(outstr)\n";
        //"print(walk(\"\", struct, \"\"))\n";
        //"print(ujson.dumps(walk(\"\", struct, \"\")))\n";

        const sizeCmd =
            "a = os.statvfs('/')\n" +
            "print(a[0], a[2], a[3])\n";


        //window.setPercent(25, "Fetching filesystem...");
        const hiddenLines: string[] | undefined = await this.connection?.writeUtilityCmdRaw(getFilesystemCmd + sizeCmd, true, 1);

        if (hiddenLines != undefined && hiddenLines.length > 0) {
            this.changeToJSON(hiddenLines);
            const fsData = JSON.stringify(this.treeData);
            const szData = hiddenLines[1].split(' ');
            this.calculateAvaiableSpace(parseInt(szData[0]), parseInt(szData[1]), parseInt(szData[2]));
            if (notify) {
                AppMgr.getInstance().emit(EventType.EVENT_FILESYS, fsData);
            } else {
                await this.connection?.getToNormal(3);
                this.BUSY = false;
                return fsData;
            }
        }

        //window.setPercent(65, "Fetching filesystem...");

        // Get back into normal mode and omit the 3 lines from the normal message,
        // don't want to repeat (assumes already on a normal prompt)
        await this.connection?.getToNormal(3);
        this.BUSY = false;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: out of getOnBoardFSTree");
        //window.setPercent(100);
        //window.resetPercentDelay();
        return "";
    }

    calculateAvaiableSpace(blockSizeBytes: number, totalBlockCount: number, totalBlocksFree: number) {
        const totalBytes = blockSizeBytes * totalBlockCount;
        const freeBytes = blockSizeBytes * totalBlocksFree;
        const usedBytes = totalBytes - freeBytes;
        const percent = Math.round((usedBytes / totalBytes) * 100);
        const usedTotal = usedBytes / 1000000;
        const totalTotal = totalBytes / 1000000;
        const storageCapacity = {
            used: usedTotal.toFixed(2),
            total: totalTotal.toFixed(2),
            percent: percent
        }
        AppMgr.getInstance().emit(EventType.EVENT_FILESYS_STORAGE, JSON.stringify(storageCapacity));
    }

    private DIR_DATA: string[] = [];
    //private DIR_STRUCT = {};
    private DIR_INDEX:number = 0;

    // Initial tree structure
    treeData: FolderItem[] = [];

    changeToJSON(data: string[]) {
        this.treeData = [
            {
                id: "root",
                name: "/",
                isReadOnly: false,
                path: "/",
                children: []
            }
        ];
        data[0] = data[0].slice(2);
        this.DIR_DATA = data[0].split(';');
        this.DIR_INDEX = 0;
        this.dirRoutine("", "", this.treeData[0].children);
    }

    dirRoutine(dir: string, curPath: string, tree:FolderItem[] | null) {
        let dir_struct: FolderItem;
        while (this.DIR_INDEX < (this.DIR_DATA!.length - 1)) {

            const [path, index, type, name] = this.DIR_DATA![this.DIR_INDEX].split(',');
            if (dir === path) {
                this.DIR_INDEX++;
                
                let newPath = curPath;
                if (curPath === "/"){
                    newPath += path;
                }
                else{
                    newPath +=  "/" + path;
                }

                if (type == 'F') {
                    if( newPath + name != "/main.py"){  //TODO:if we want a setting to show /main.py then here is the location
                        dir_struct={
                            id: path+index,
                            name: name,
                            isReadOnly: false,
                            path: newPath,
                            children: null
                        }
                        tree?.push(dir_struct);  
                    }                  
                }
                else {
                    dir_struct={
                        id: path+index,
                        name: name,
                        isReadOnly: false,
                        path: newPath,
                        children: []
                    }
                    tree?.push(dir_struct);
                    this.dirRoutine(name, newPath, dir_struct.children);
                   // dir_struct[dir] = { ...dir_struct[dir], ...this.dirRoutine(name) };
                }

            }
            else {
                break;
            }
        }
        return; //dir_struct;
    }

    async renameFile(oldPath: string, newName: string) {
        if (oldPath != undefined && newName != undefined && newName != null && newName != "") {
            if (this.BUSY == true) {
                return;
            }
            this.BUSY = true;
            //window.setPercent?.(1, "Renaming file..."); TODO:

            let newPath;
            if (newName.includes('/')) {
                newPath = newName;
            } else {
                newPath = oldPath.substring(0, oldPath.lastIndexOf("/") + 1) + newName;
            }
            const cmd = "import uos\n" +
                "exists = 1\n" +
                "try:\n" +
                "   f = open('" + newPath + "', 'r')\n" +
                "   exists = 1\n" +
                "   f.close()\n" +
                "except  OSError:\n" +
                "   exists = 0\n" +
                "if exists == 0:\n" +
                "   uos.rename('" + oldPath + "', '" + newPath + "')\n" +
                "   print('no_rename_error')\n" +
                "else:\n" +
                "   print('rename_error')\n";

            //window.setPercent?.(2); TODO:
            await this.connection?.writeUtilityCmdRaw(cmd, true, 1);
            //window.setPercent?.(55); TODO:

            // Get back into normal mode and omit the 3 lines from the normal message,
            // don't want to repeat (assumes already on a normal prompt)
            await this.connection?.getToNormal(3);
            this.BUSY = false;

            // Make sure to update the filesystem after modifying it
            await this.getOnBoardFSTree();
            //window.setPercent?.(100); TODO:
            //window.resetPercentDelay?.();
        }
    }

    async buildPath(path: string) {
        if (this.BUSY == true) {
            return;
        }
        this.BUSY = true;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: in buildPath");;


        // Got through and make sure entire path already exists
        const cmd = "import uos\n" +
            "try:\n" +
            "    path = '" + path + "'\n" +
            "    path = path.split('/')\n" +
            "    builtPath = path[0]\n" +
            "    for i in range(1, len(path)+1):\n" +
            "        try:\n" +
            "            uos.mkdir(builtPath)\n" +
            "        except OSError:\n" +
            "            print('Directory already exists, did not make a new folder')\n" +
            "        if i < len(path):\n" +
            "            builtPath = builtPath + '/' + path[i]\n" +
            "except Exception as err:\n" +
            "    print('Some kind of error while building path...' + err)\n";

        await this.connection?.writeUtilityCmdRaw(cmd, true, 1);

        // Get back into normal mode and omit the 3 lines from the normal message,
        // don't want to repeat (assumes already on a normal prompt)
        await this.connection?.getToNormal(3);

        this.BUSY = false;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: out of buildPath");

    }


    async uploadFile(filePath: string, fileContents: string | Uint8Array, usePercent: boolean = false) {
        if (this.BUSY == true) {
            return true;
        }

        const pathToFile = filePath.substring(0, filePath.lastIndexOf('/'));
        await this.buildPath(pathToFile);

        this.BUSY = true;
        if (usePercent)
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '0');

        // Convert strings to binary
        let bytes: Uint8Array | undefined = undefined;
        if (typeof fileContents == "string") {
            bytes = new Uint8Array(fileContents.length);
            for (let i = 0; i < fileContents.length; i++) {
                bytes[i] = fileContents.charCodeAt(i);
            }
        } else {
            bytes = fileContents;
        }

        //[TODO] - This should be just the length of what is available. Not just 2MB
        if ( this.PROCESSOR == 2040 && bytes.length >= 2000000) {
            alert("This file is at least 2MB, too large, not uploading");
            return;
        }


        // https://forum.micropython.org/viewtopic.php?t=10659&p=58710
        const writeFileScript = "import micropython\n" +
            "import sys\n" +
            "import time\n" +
            "blocksize = " + this.connection?.XRP_SEND_BLOCK_SIZE + "\n" +
            "micropython.kbd_intr(-1)\n" +
            "time.sleep(0.035)\n" +
            "print('started')\n" +
            "w = open('" + filePath + "','wb')\n" +

            "byte_count_to_read = " + bytes.length + "\n" +
            "read_byte_count = 0\n" +
            "read_buffer = bytearray(blocksize)\n" +
            "specialStartIndex = 0\n" +
            "specialEndIndex = blocksize \n" +
            "if byte_count_to_read > 0:\n" +
            "  while True:\n" +
            "    read_byte_count = read_byte_count + sys.stdin.buffer.readinto(read_buffer, blocksize)\n" +

            //"    if byte_count_to_read == -1:\n" +
            //"        byte_count_to_read = int(read_buffer[0:7].decode('utf-8'))\n" +
            //"        print(byte_count_to_read)\n" +
            // "        sys.stdout.write('EOF')\n" +
            //"        specialIndex = 7\n" +

            "    if read_byte_count >= byte_count_to_read:\n" +
            "        specialEndIndex = blocksize - (read_byte_count - byte_count_to_read)\n" +
            "        read_byte_count = read_byte_count - blocksize + specialEndIndex\n" +

            "    w.write(bytearray(read_buffer[0:specialEndIndex]))\n" +
            //"    specialIndex = 0\n" +
            // "    print(read_byte_count)\n" +
            // "    sys.stdout.write('EOF')\n" +
            //"    print('counts ' + str(read_byte_count) + ' of ' + str(byte_count_to_read))\n" +
            "    if read_byte_count >= byte_count_to_read:\n" +
            "        break\n" +
            //"print('upload file done')\n" +
            "w.close()\n" +

            "micropython.kbd_intr(0x03)\n";



        await this.connection?.writeUtilityCmdRaw(writeFileScript, true, 1, "started");  //we wait until we print started, otherwise we may write a binary ctl character before the micropython.kbd_intr(-1)

        // https://stackoverflow.com/a/1127966
        //var bytesLenStr = "" + bytes.length;
        //while (bytesLenStr.length < 7) {
        //    bytesLenStr = "0" + bytesLenStr;
        //}
        //await this.writeToDevice(bytesLenStr);

        if(usePercent) {
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '3');
        }

        const numberOfChunks = Math.ceil(bytes.length / this.connection!.XRP_SEND_BLOCK_SIZE);
        let currentPercent = 3;
        const endingPercent = 100;
        const percentStep = (endingPercent - currentPercent) / numberOfChunks;


        let bytesSent = 0;
        for (let b = 0; b < numberOfChunks; b++) {
            let writeDataCMD = bytes.slice(b * this.connection!.XRP_SEND_BLOCK_SIZE, (b + 1) * this.connection!.XRP_SEND_BLOCK_SIZE);

            bytesSent = bytesSent + writeDataCMD.length;

            if (bytesSent == bytes.length && writeDataCMD.length < this.connection!.XRP_SEND_BLOCK_SIZE) {
                const fillerArray = new Uint8Array(this.connection!.XRP_SEND_BLOCK_SIZE - writeDataCMD.length);
                for (let i = 0; i < fillerArray.length; i++) {
                    fillerArray[i] = 255;
                }

                const finalArray = new Uint8Array(writeDataCMD.length + fillerArray.length);
                finalArray.set(writeDataCMD, 0);
                finalArray.set(fillerArray, writeDataCMD.length);
                writeDataCMD = finalArray;
            }

            await this.connection?.writeToDevice(writeDataCMD);

            /*
                        if(this.WRITER != undefined){
                            // this.startReaduntil("EOF");
                            await this.WRITER.write(writeDataCMD);
                            //console.log("Sent file chunk: " + b);
                            // await this.haltUntilRead(0);
                        }else{
                            if(this.DEBUG_CONSOLE_ON) console.log("%cNot writing to device, none connected", "color: red");
                        }
            */

            currentPercent = currentPercent + percentStep;
            this.cmdLogger.debug('UploadFile current percent: ' + currentPercent);
            //if (usePercent) window.setPercent?.(currentPercent); TODO: show percentage
            if (usePercent) 
                AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, currentPercent.toString());    
        }

        // await this.haltUntilRead(1);
        await this.connection?.getToNormal(3);
        this.BUSY = false;
    }

    async uploadFiles(path: string, fileHandles: FileSystemFileHandle[]) {
        if (this.BUSY == true) {
            return;
        }
        //UIkit.modal(document.getElementById("IDProgressBarParent")).show(); TODO:

        //window.setPercent?.(1, "Saving files...");
        const percent_per = 99 / fileHandles.length;
        let cur_percent = 1 + percent_per;

        for (let i = 0; i < fileHandles.length; i++) {
            //window.setPercent?.(cur_percent);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            cur_percent += percent_per;
            const file = await fileHandles[i].getFile();

            //const bytes = new Uint8Array(await file.arrayBuffer());
            //[TODO] Should we be doing this check? - it seems yes so that .mpy files get binary encoded.
            if (file.name.indexOf(".py") != -1 || file.name.indexOf(".txt") != -1 || file.name.indexOf(".text") != -1 || file.name.indexOf(".cfg") != -1) {
                await this.uploadFile(path + file.name, await file.text(), true);
            } else {
                await this.uploadFile(path + file.name, new Uint8Array(await file.arrayBuffer()), true);
            }
        }

        //window.resetPercentDelay?.(); TODO:
        //UIkit.modal(document.getElementById("IDProgressBarParent")).hide();  TODO:

        await this.getOnBoardFSTree();
    }

    async getFileContents(filePath: string): Promise<number[]> {
        if (this.BUSY == true) {
            return [];
        }
        this.BUSY = true;

        const cmd = "import sys\n" +
            "chunk_size = 200\n" +
            "onboard_file = open('" + filePath + "', 'rb')\n" +
            "while True:\n" +
            "    data = onboard_file.read(chunk_size)\n" +
            "    if not data:\n" +
            "        break\n" +
            "    sys.stdout.buffer.write(data)\n" +
            //"    sys.stdout.write('read more')\n" +
            "onboard_file.close()\n" +
            "sys.stdout.write('###DONE READING FILE###')\n";

        const hiddenLines = await this.connection?.writeUtilityCmdRaw(cmd, true, 1, "###DONE READING FILE###");
        let lines = hiddenLines!.join('\r\n');
        if(lines.length > 0){ 
            lines = lines.slice(2, lines[0].length - 27);  // Get rid of 'OK' and '###DONE READING FILE###'
        }

        this.BUSY = false;
        await this.connection?.getToNormal(3);
        return Array.from(new TextEncoder().encode(lines));

    }
    

    // Given a path, delete it on XRP
    async deleteFileOrDir(path: string) {
        if (path != undefined) {
            if (this.BUSY == true) {
                return;
            }
            this.BUSY = true;

            //window.setPercent?.(1, "Deleting..."); TODO:
            const cmd = "import os\n" +
                "def rm(d):  # Remove file or tree\n" +
                "   try:\n" +
                "       if os.stat(d)[0] & 0x4000:  # Dir\n" +
                "           for f in os.ilistdir(d):\n" +
                "               if f[0] not in ('.', '..'):\n" +
                "                   rm('/'.join((d, f[0])))  # File or Dir\n" +
                "           os.rmdir(d)\n" +
                "       else:  # File\n" +
                "           os.remove(d)\n" +
                "       print('rm_worked')\n" +
                "   except:\n" +
                "       print('rm_failed')\n" +
                "rm('" + path + "')\n";


            //window.setPercent?.(2); TODO:
            await this.connection?.writeUtilityCmdRaw(cmd, true, 1);
            //window.setPercent?.(55); TODO:

            // Get back into normal mode and omit the 3 lines from the normal message,
            // don't want to repeat (assumes already on a normal prompt)
            await this.connection?.getToNormal(3);
            this.BUSY = false;

            // Make sure to update the filesystem after modifying it
            await this.getOnBoardFSTree();
            //window.setPercent?.(100); TODO:
            //window.resetPercentDelay?.();
        }
    }
    /*** Run Program routines  ***/

    
    async updateMainFile(fileToEx: string): Promise<string> {

        if (this.BUSY == true) {
            return "";
        }
        this.BUSY = true;

        let fileToEx2 = fileToEx;
        if (fileToEx.startsWith('/')) {
            fileToEx2 = fileToEx.slice(1);
        }

        const value = "import os\n" +
            "import sys\n" +
            //"from machine import Pin\n" +
            "import time\n" +
            "FILE_PATH = '/lib/ble/isrunning'\n" +
            "doNothing = False\n" +
            "x = os.dupterm(None, 0)\n" +
            "if(x == None):\n" +
            "   import ble.blerepl\n" +
            "else:\n" +
            "   os.dupterm(x,0)\n" +
            //"button = Pin(22, Pin.IN, Pin.PULL_UP)\n" +
            //"time.sleep(0.1)\n" +
            //"if(button.value() == 0):\n" +
            //"   sys.exit()\n" +
            "try:\n" +
            "   with open(FILE_PATH, 'r+b') as file:\n" +
            "      byte = file.read(1)\n" +
            "      if byte == b'\\x01':\n" +
            "         file.seek(0)\n" +
            "         file.write(b'\\x00')\n" +
            "         doNothing = True\n" +
            //"      else:\n" +
            //"         file.seek(0)\n" +
            //"         file.write(b'\\x01')\n" +
            "   if(not doNothing):\n" +
            "       with open('" + fileToEx + "', mode='r') as exfile:\n" +
            "           code = exfile.read()\n" +
            "       execCode = compile(code, '" + fileToEx2 + "', 'exec')\n" +
            "       exec(execCode)\n" +
            //"       with open(FILE_PATH, 'r+b') as file:\n" +
            //"           file.write(b'\\x00')\n" +
            "except Exception as e:\n" +
            "   import sys\n" +
            "   sys.print_exception(e)\n" +
           // "   with open(FILE_PATH, 'r+b') as file:\n" +
           // "      file.write(b'\\x00')\n" +
            "finally:\n" +
            "   import gc\n" +
            "   gc.collect()\n" +
            "   if 'XRPLib.resetbot' in sys.modules:\n" +
            "      del sys.modules['XRPLib.resetbot']\n" +
            "   import XRPLib.resetbot";

        if (this.lastRun == undefined || this.lastRun != fileToEx) {
            this.BUSY = false; // make sure we are not busy before uploading the file
            await this.uploadFile("//main.py", value, true); //no need to save the main file again if it is the same file to execute.
            this.BUSY = true; // make sure we are busy after uploading the file
        }
        this.lastRun = fileToEx;
        this.BUSY = false;

        return value;
    }

    async executeLines(lines: string) {
        if (this.BUSY == true) {
            return;
        }
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: in executeLines");

        this.BUSY = true;
        //TODO: force a Terminal line feed

        //when running from the IDE, let's clean up all the memory before the program runs to give maximum space to run (especially on the beta board)
        const cleanUp = "import sys\n" +
        "ble_modules = ['ble.blerepl', 'ble', 'ble.ble_uart_peripheral']\n" +
        "for module in list(sys.modules.keys()):\n" +
        "    if module not in ble_modules and 'XRPLib' not in module:\n" +
        "        del sys.modules[module]\n" +
        "essential_vars = ['ble_modules', 'gc', 'sys', 'rp2' , 'essential_vars', 'FILE_PATH']\n" +
        "all_vars = dir()\n" +
        "for var in all_vars:\n" +
        "    if var not in essential_vars and not var.startswith('__'):\n" +
        "        exec(f'del {var}')\n" +
        "import gc\n" +
        "gc.collect()\n";
        //"print(gc.mem_free())\n"; 

        lines = cleanUp + lines;

        await this.connection?.goCommand(lines);
        this.BUSY = false;
        if (this.DEBUG_CONSOLE_ON) this.cmdLogger.debug("fcg: out of executeLines");

        // Make sure to update the filesystem as there is a small chance that the program saved something like a log file.
        setTimeout(() => {
            this.getOnBoardFSTree().then(() => {
                // File system tree updated after execution
                AppMgr.getInstance().emit(EventType.EVENT_PROGRAM_EXECUTED, '');
            });
        });
    }

    /**
     * stopProgram - stop program execution on the XRP because they pushed the STOP button
     */
    stopProgram() {
        if (this.connection) {
            this.connection.prepareForStop();
            this.connection.getToREPL();
            this.BUSY = false;
        }
    }

    /**
     * getXRP
     * @returns the XRP drive name
     */
    getXRPDrive(): string {
        return (this.PROCESSOR! === 2350) ? "RP2350" : "RPI-RP2";
    }

    /**
     * getFirmwareFilename
     * @returns the firmware filename for the connected robot
     */
    getFirmwareFilename(): string {
        if (this.PROCESSOR === 2350) return 'firmware2350.uf2';
        if (this.is_NanoXRP) return 'firnware2040nanoxrp.uf2';
        return 'firmware2040.uf2';
    }

    isNanoXRP(): boolean {
        return this.is_NanoXRP;
    }

    /**
     * getMPFilename
     * @returns the MicroPython filename
     */
    getMPFilename(): string | undefined{
        if (this.mpFilename != undefined) {
            return this.mpFilename;
        }
        return undefined;
    }
}
