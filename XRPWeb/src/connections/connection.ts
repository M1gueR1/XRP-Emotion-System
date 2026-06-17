import ConnectionMgr from "@/managers/connectionmgr";
import logger from "@/utils/logger";
import Joystick from '@/managers/joystickmgr';
import TableMgr from '@/managers/tablemgr';


/**
 * connection states:
 *      busy
 *      connected
 */
export enum ConnectionState {
    None,
    Busy,
    Connected,
    Disconnected
};

/**
 * Connection class - abstract class handle common connection
 */
abstract class Connection {
    protected connMgr: ConnectionMgr | null = null;
    protected isManualConnection: boolean = false;  // turn on for manual connection
    protected connectionStates: ConnectionState = ConnectionState.None; // connection busy state
    protected lastProgramRan: string | undefined;
    protected connLogger = logger.child({module: 'connections'});

    protected textEncoder: TextEncoder = new TextEncoder();
    private textDecoder: TextDecoder = new TextDecoder();
    private specialForceOutputFlag: boolean = false;
    private catchOk: boolean = false;
    private isRunBusy = false;
    private runError: string | undefined = undefined;
    private collectedData: string = '';
    private collectedRawData: number[] = [];
    private isCollectedRawData: boolean = false;
    private buffer: Uint8Array = new Uint8Array(0);
    private STOP: boolean = false;

    // Set to something not "" to halt until this.READ_UNTIL_STRING found and collect lines in this.COLLECTED_DATA
    private readUntilStr = '';

    // ### MicroPython Control Commands ###
    // DOCS: https://docs.micropython.org/en/latest/esp8266/tutorial/this.html#other-control-commands
    // UNICODE CTRL CHARS COMBOS: https://unicodelookup.com/#ctrl
    private readonly CTRL_CMD_RAWMODE: string = '\x01'; // ctrl-A (used for waiting to get file information, upload files, run custom python tool, etc)
    private readonly CTRL_CMD_NORMALMODE: string = '\x02'; // ctrl-B (user friendly terminal)
    private readonly CTRL_CMD_KINTERRUPT: string = '\x03'; // ctrl-C (stops a running program)
    readonly CTRL_CMD_SOFTRESET: string = '\x04'; // ctrl-D (soft reset the board, required after a command is entered in raw!)

    readonly XRP_SEND_BLOCK_SIZE: number = 250; // wired can handle 255 bytes, but BLE 5.0 is only 250

    // XPP Protocol constants for packet detection
    protected readonly XPP_START_SEQ: number[] = [0xAA, 0x55];
    protected readonly XPP_END_SEQ: number[] = [0x55, 0xAA];
    protected xppBuffer: Uint8Array = new Uint8Array(0); // Buffer for incomplete XPP packets

    joyStick: Joystick | undefined;

    constructor() {
        this.joyStick  = new Joystick();
    }

    // abstract methods - implement by derived classes
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract isConnected(): boolean;

    private _isNanoXRP: boolean = false;

    isNanoXRP(): boolean { return this._isNanoXRP; }

    setNanoXRP(val: boolean): void { this._isNanoXRP = val; }

    /**
     * HandleEsc 
     * @param value 
     * @returns 
     */
    private HandleEsc(value: Uint8Array): Uint8Array {
        this.buffer = this.concatUint8Arrays(this.buffer, value);
        let temp: Uint8Array = new Uint8Array(0);
        let x = this.buffer.lastIndexOf(27); //is there an escape in this string
        if (x == -1) {
            temp = this.buffer;
            this.buffer = new Uint8Array(0);
            return temp;
        } else {
            let escEnded = false;
            x++;
            for (x; x < this.buffer.length; x++) {
                const char = this.buffer[x];
                if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
                    escEnded = true;
                    break;
                }
            }
            if (escEnded) {
                temp = this.buffer;
                this.buffer = new Uint8Array(0);
            } else {
                temp = new Uint8Array(0);
            }
            return temp;
        }
    }

    /**
     * concatUint8Arrays - concatenate Unit8 array
     * @param a
     * @param b 
     * @returns 
     */
    protected concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
        const result = new Uint8Array(a.length + b.length);
        result.set(a, 0);
        result.set(b, a.length);
        return result;
    }

    /**
     * Extracts complete XPP packets from the buffer and returns them.
     * XPP packet format: [0xAA 0x55] [Type] [Length] [Payload] [0x55 0xAA]
     * @param data - New data to add to the buffer
     * @returns Array of complete XPP packets
     * 
     * regularData anything that is not part of a XPP packet
     * packets are the complete XPP packets
     * anything before start sequence is regular data
     * anything after an end with no other start sequence is regular data
     * 
     */
    protected extractCompleteXPPPackets(data: Uint8Array): { packets: Uint8Array[], regularData: Uint8Array } {
        // Add new data to buffer
        this.xppBuffer = this.concatUint8Arrays(this.xppBuffer, data);
        let regularData: Uint8Array = new Uint8Array(0);
              
        const completePackets: Uint8Array[] = [];
        
        // Process buffer to extract packets and regular data
        while (this.xppBuffer.length > 0) {
            // If buffer is too small to be a complete packet, check if we can pass through regular data
            if (this.xppBuffer.length < 4) {
                // Check if buffer could potentially start an XPP packet
                if (this.xppBuffer.length === 1) {
                    // Single byte: if it's 0xAA, might be start of XPP, keep it
                    // Otherwise, it's definitely regular data
                    if (this.xppBuffer[0] !== this.XPP_START_SEQ[0]) {
                        regularData = this.concatUint8Arrays(regularData, this.xppBuffer);
                        this.xppBuffer = new Uint8Array(0);
                    }
                    break; // Need more data to determine
                } else if (this.xppBuffer.length === 2) {
                    // Two bytes: check if it's [0xAA, 0x55]
                    if (this.xppBuffer[0] === this.XPP_START_SEQ[0] && 
                        this.xppBuffer[1] === this.XPP_START_SEQ[1]) {
                        // Could be start of XPP packet, keep it
                        break; // Need more data
                    } else if (this.xppBuffer[0] === this.XPP_START_SEQ[0]) {
                        // First byte is 0xAA but second isn't 0x55, pass first byte as regular data
                        regularData = this.concatUint8Arrays(regularData, this.xppBuffer.subarray(0, 1));
                        this.xppBuffer = this.xppBuffer.subarray(1);
                        // Continue processing the remaining byte
                    } else {
                        // First byte is not 0xAA, both bytes are regular data
                        regularData = this.concatUint8Arrays(regularData, this.xppBuffer);
                        this.xppBuffer = new Uint8Array(0);
                        break;
                    }
                } else if (this.xppBuffer.length === 3) {
                    // Three bytes: check if it starts with [0xAA, 0x55]
                    if (this.xppBuffer[0] === this.XPP_START_SEQ[0] && 
                        this.xppBuffer[1] === this.XPP_START_SEQ[1]) {
                        // Could be start of XPP packet, keep it
                        break; // Need more data
                    } else if (this.xppBuffer[0] === this.XPP_START_SEQ[0]) {
                        // First byte is 0xAA but second isn't 0x55, pass first byte as regular data
                        regularData = this.concatUint8Arrays(regularData, this.xppBuffer.subarray(0, 1));
                        this.xppBuffer = this.xppBuffer.subarray(1);
                        // Continue processing the remaining 2 bytes
                    } else {
                        // First byte is not 0xAA, check if second byte is 0xAA (could be start of XPP)
                        if (this.xppBuffer[1] === this.XPP_START_SEQ[0]) {
                            // Second byte might be start, pass first byte as regular data
                            regularData = this.concatUint8Arrays(regularData, this.xppBuffer.subarray(0, 1));
                            this.xppBuffer = this.xppBuffer.subarray(1);
                            // Continue processing the remaining 2 bytes
                        } else {
                            // No potential XPP start, pass all as regular data
                            regularData = this.concatUint8Arrays(regularData, this.xppBuffer);
                            this.xppBuffer = new Uint8Array(0);
                            break;
                        }
                    }
                }
                continue; // Re-check buffer after modifications
            }
            
            // Buffer has at least 4 bytes, look for start sequence [0xAA 0x55]
            const startIndex = this.xppBuffer.findIndex((val, idx) => 
                idx < this.xppBuffer.length - 1 && 
                val === this.XPP_START_SEQ[0] && 
                this.xppBuffer[idx + 1] === this.XPP_START_SEQ[1]
            );
            
            if (startIndex === -1) {
                // No start sequence found
                // Check if last byte is 0xAA (might be start of next XPP packet)
                const lastByte = this.xppBuffer[this.xppBuffer.length - 1];
                if (lastByte === this.XPP_START_SEQ[0]) {
                    // Keep last byte in buffer, pass rest as regular data
                    regularData = this.concatUint8Arrays(regularData, this.xppBuffer.subarray(0, this.xppBuffer.length - 1));
                    this.xppBuffer = this.xppBuffer.subarray(this.xppBuffer.length - 1);
                } else {
                    // No potential XPP start, clear buffer
                    regularData = this.concatUint8Arrays(regularData, this.xppBuffer);
                    this.xppBuffer = new Uint8Array(0);
                }
                break;
            }
            
            // Remove any data before the start sequence
            if (startIndex > 0) {
                regularData = this.concatUint8Arrays(regularData, this.xppBuffer.subarray(0, startIndex));
                this.xppBuffer = this.xppBuffer.subarray(startIndex);
            }
            
            // Check if we have enough data for type and length (at least 4 bytes: start + type + length)
            if (this.xppBuffer.length < 4) {
                break; // Need more data
            }
            
            // Extract length (byte 3 after start sequence)
            // Type is at byte 2, but we don't need it for packet extraction
            const payloadLength = this.xppBuffer[3];
            
            // Calculate total packet size: start(2) + type(1) + length(1) + payload + end(2)
            const totalPacketSize = 2 + 1 + 1 + payloadLength + 2;
            
            // Check if we have the complete packet
            if (this.xppBuffer.length < totalPacketSize) {
                break; // Need more data
            }
            
            // Verify end sequence
            const endIndex = totalPacketSize - 2;
            if (this.xppBuffer[endIndex] === this.XPP_END_SEQ[0] && 
                this.xppBuffer[endIndex + 1] === this.XPP_END_SEQ[1]) {
                // Complete packet found
                const completePacket = this.xppBuffer.subarray(0, totalPacketSize);
                completePackets.push(completePacket);
                
                // Remove processed packet from buffer
                this.xppBuffer = this.xppBuffer.subarray(totalPacketSize);
            } else {
                // Invalid end sequence, skip this start sequence and continue
                regularData = this.concatUint8Arrays(regularData, this.xppBuffer.subarray(0, 2));
                this.xppBuffer = this.xppBuffer.subarray(2);
            }
        }
        
        return { packets: completePackets, regularData };
    }

    /**
     * Processes a complete XPP packet by routing it to the appropriate handlers.
     * @param packet - Complete XPP packet
     * @param tableMgr - Optional TableMgr instance for handling table-related XPP messages
     */
    protected processXPPPacket(packet: Uint8Array, tableMgr?: TableMgr): void {
        this.joyStick?.handleXPPMessage(packet);
        tableMgr?.readFromDevice(packet);
    }

    

    /**
     * readData - read data from the XRP connection
     * @param values 
     */
    protected readData(values: Uint8Array | undefined = undefined) {
        if (values) {
            // Reading from serial is done in chunks of a inconsistent/non-guaranteed size,
            this.connLogger.debug(this.textDecoder.decode(values));
            //console.log(this.textDecoder.decode(values));

            //We need to handle the case where esc sequences are broken up into multiple reads.
            // look for esc sequences that mean something to us:
            // Data to be graphed
            // Switch input modes:
            //     controller (keyboard or joystick)
            //     standard keyboard input
            let tempValue = values;
            tempValue = this.HandleEsc(tempValue);
            if (tempValue.length > 0) {
                const index = tempValue.lastIndexOf(27);
                //TODO: how to check if it is in runmode? Should it be handle this here?
                if (index != -1 && this.isRunBusy === true) {
                    //ignore these escapes if not in run mode.
                    if (tempValue[index + 1] == 101) {
                        //start getting Joystick packets on the input stream
                        this.joyStick?.startJoyPackets();
                        //this.startJoyPackets?.();
                        values = tempValue = new Uint8Array(0);
                    }
                    if (tempValue[index + 1] == 102) {
                        //Stop Joystick packets on the input stream
                        this.joyStick?.stopJoyPackets();
                        //this.stopJoyPackets?.();
                        values = tempValue = new Uint8Array(0);
                    }
                }
            }

            // Collect lines when read until active, otherwise, output to terminal
            if (this.readUntilStr == '') {
                if (tempValue.length > 0) {
                    this.onData(this.textDecoder.decode(new Uint8Array(tempValue)));
                }
            } else {
                // There are two things going on here.
                //     1 - When we are running a program, we want all incoming lines to be pushed to the terminal
                //     2 - Except the very first 'OK'. There are timing issues and this was the best place to catch it.
                //            This makes the user output look a lot nicer without the 'OK' showing up.
                if (this.specialForceOutputFlag) {
                    if (this.catchOk) {
                        const v = this.textDecoder.decode(values);
                        if (v.startsWith('OK')) {
                            this.catchOk = false;
                            this.onData(v.slice(2));
                        } else {
                            this.onData(this.textDecoder.decode(values));
                        }
                    } else {
                        this.onData(this.textDecoder.decode(values));
                    }
                }

                this.collectedData += this.textDecoder.decode(values);

                // If raw flag set true, collect raw data for now
                if (this.isCollectedRawData == true) {
                    for (let i = 0; i < values.length; i++) {
                        this.collectedRawData.push(values[i]);
                    }
                }
            }
        }
    }

    /**
     * onData - data received from XRP
     *   This gets overridden in xrpShell
     * @param data 
     */
    public onData(data: string) {
        //this.connLogger.debug('Received data from XRP: ' + data);
        console.log(data);
    }

    startReaduntil(str: string) {
        this.readUntilStr = str;
        this.collectedData = '';
    }

    // Will stall js until finds line set by startReaduntil().
    // Providing an offset will skip subsequent lines after the
    // found line set by startReaduntil.
    // Loops forever if never finds line set by startReaduntil()
    async haltUntilRead(omitOffset: number = 0, waitTime: number = -1): Promise<string[]> {
        let waitOmitOffset = 0;
        let numTimes = waitTime;

        // Re-evaluate collected data for readUntil line every 85ms
        while (this.connectionStates === ConnectionState.Connected && numTimes != 0) {
            const tempLines = this.collectedData.split('\r\n');

            for (let i = 0; i < tempLines.length; i++) {
                if (
                    tempLines[i] == this.readUntilStr ||
                    this.readUntilStr == '' ||
                    tempLines[i].indexOf(this.readUntilStr) != -1 ||
                    tempLines[i] == '>'
                ) {
                    // Keyboard interrupt
                    // Wait for omitOffset lines
                    if (i > tempLines.length - omitOffset && waitOmitOffset < 5) {
                        waitOmitOffset++;
                        break;
                    }
                    this.readUntilStr = '';

                    // Output the rest of the lines that should not be hidden
                    // Should find a way to do this without adding newlines again

                    for (let j = i + omitOffset; j < tempLines.length; j++) {
                        if (j != tempLines.length - 1) {
                            this.onData(tempLines[j] + '\r\n');
                        } else {
                            this.onData(tempLines[j]);
                        }
                    }

                    return tempLines.slice(0, i + omitOffset); // Return all lines collected just before the line that switched off haltUntil()
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 85));
            
            if (waitTime === -2 && this.isRunBusy === false) {
                return tempLines;
            }

            if (waitTime != -1 && waitTime != -2 ) {
                numTimes--;
            }
        }
        return [];
    }

    private async softReset() {
        return;
        //this.startReaduntil("MPY: soft reboot");
        //await this.writeToDevice(this.CTRL_CMD_SOFTRESET);
        //await this.haltUntilRead(3);
    }

    async getToRaw() {
        this.startReaduntil('raw REPL; CTRL-B to exit');
        // Refer to pyboard.py for "\r" https://github.com/micropython/micropython/blob/master/tools/pyboard.py#L326-L334
        await this.writeToDevice('\r' + this.CTRL_CMD_KINTERRUPT + this.CTRL_CMD_KINTERRUPT); // ctrl-C twice: interrupt any running program
        await this.writeToDevice('\r' + this.CTRL_CMD_RAWMODE);
        await this.haltUntilRead(2);

        await this.softReset();
    }

    // Wait until an OK is received, else write ctrl-c since raw sometimes gets stuck? Seems to work for upload files
    private async waitUntilOK() {
        let times = 0;

        while (this.connectionStates === ConnectionState.Connected) {
            const tempLines = this.collectedData.split('\r\n');

            for (let i = 0; i < tempLines.length; i++) {
                if (tempLines[i] == 'OK' || tempLines[i] == '>') {
                    return;
                }
            }

            times = times + 1;
            if (times >= 20) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
    }

    // https://github.com/micropython/micropython/blob/master/tools/pyboard.py#L325
    public async getToNormal(omitOffset: number = 0) {
        await this.getToRaw(); // Get to raw first so that unwanted messages are not printed (like another intro message)

        //this.startReaduntil("Raspberry Pi Pico W with RP2040");
        this.startReaduntil('MicroPython');
        //this.startReaduntil("information.");
        // https://github.com/micropython/micropython/blob/master/tools/pyboard.py#L360 for "\r"
        await this.writeToDevice('\r' + this.CTRL_CMD_NORMALMODE);
        await this.haltUntilRead(omitOffset);
    }


    /**
     * writeToDevice - write data to device
     *    This is extended and handled in usbconnection and bluetoothconnection.
     * @param str 
     */
    public async writeToDevice(str: string | Uint8Array) {
        this.connLogger.debug('Writing to device' + str);
    }

    // Goes into raw mode and writes a command according to the XRP_SEND_BLOCK_SIZE then executes
    public async writeUtilityCmdRaw(
        cmdStr: string,
        waitForCmdEnd: boolean = false,
        omitAmount: number = 0,
        customWaitForStr: string = '>',
    ): Promise<string[] | undefined> {
        // Get into raw mode
        await this.getToRaw();

        // Send the cmd string
        const numberOfChunks = Math.ceil(cmdStr.length / this.XRP_SEND_BLOCK_SIZE) + 1;
        for (let b = 0; b < numberOfChunks; b++) {
            const writeDataCMD = cmdStr.slice(
                b * this.XRP_SEND_BLOCK_SIZE,
                (b + 1) * this.XRP_SEND_BLOCK_SIZE,
            );
            // console.log(writeDataCMD);
            await this.writeToDevice(writeDataCMD);
        }

        if (waitForCmdEnd) {
            this.startReaduntil(customWaitForStr);
            await this.writeToDevice(this.CTRL_CMD_SOFTRESET);
            if (customWaitForStr == '>') await this.waitUntilOK();
            return await this.haltUntilRead(omitAmount, 300); //added timeout since micropython 1.19 sometimes will not get the soft reset and hang
        } else {
            await this.writeToDevice(this.CTRL_CMD_SOFTRESET);
        }
        return;
    }

    async goCommand(lines: string) {
        
        // Get into raw mode
        await this.getToRaw();

        // Not really needed for hiding output to terminal since raw does not echo
        // but is needed to only grab the FS lines/data

        this.isRunBusy = true;
        this.startReaduntil(">");

        // Send the cmd string
        const numberOfChunks = Math.ceil(lines.length / this.XRP_SEND_BLOCK_SIZE) + 1;
        for (let b = 0; b < numberOfChunks; b++) {
            const writeDataCMD = lines.slice(b * this.XRP_SEND_BLOCK_SIZE, (b + 1) * this.XRP_SEND_BLOCK_SIZE);
            await this.writeToDevice(writeDataCMD);
        }

        await this.writeToDevice("\x04");
        this.specialForceOutputFlag = true;  //you see the OK, but also get any fast output
        this.catchOk = true;
        //await this.waitUntilOK();
        const result = await this.haltUntilRead(1, -2);

        /*
                This is where errors can be checked for that were returned incase we want to give a better explanation
                The error information is put into a global variable for end processing if needed.

                If we get an exception here it means that the unplugged or reset the XRP while the program was running.
        */
        this.runError = undefined;
        try {
            for (let i = 0; i < result.length; i++) {
                if (result[i].includes("[Errno", 0)) {
                    this.runError = result[i];
                    console.log("run time error: " + this.runError);
                }
            }
        }
        catch {
            this.specialForceOutputFlag = false;
            this.isRunBusy = false;
            return;
        }

        // Get back into normal mode and omit the 3 lines from the normal message,
        // don't want to repeat (assumes already on a normal prompt)
        this.specialForceOutputFlag = false;
        await this.getToRaw();
        this.specialForceOutputFlag = true;

        //TODO: this.doPrintSeparator?.();

        this.startReaduntil("MicroPython");
        await this.writeToDevice("\r" + this.CTRL_CMD_NORMALMODE);
        await this.haltUntilRead(3);

        // if they pushed the stop button while lines was executing
        if (this.STOP) {
            this.specialForceOutputFlag = false;
            this.STOP = false
            //We were hammering on ctrl-c up to get the program to stop (because timer routines don't stop).
            //Meaning finally did not run. We will run the resetbot routine
            const cmd = "import sys\n" +
                "if 'XRPLib.resetbot' in sys.modules:\n" +
                "   del sys.modules['XRPLib.resetbot']\n" +
                "from XRPLib.resetbot import reset_hard\n" +
                "reset_hard()\n"
            await this.writeUtilityCmdRaw(cmd, true, 1);
        }

        //TODO: this.stopJoyPackets?.(); //just incase they were running.

        this.isRunBusy = false;
        // Make sure to update the filesystem after modifying it
        this.specialForceOutputFlag = false;
    }
    

    /**
     * isBusy
     * @returns 
     */
    public isBusy(): boolean {
        return this.connectionStates === ConnectionState.Busy;
    }

    public async getToREPL():Promise<boolean> {
        this.connLogger.debug('Getting to REPL');
        return false;
    }

    async checkPrompt(): Promise<boolean> {
        this.startReaduntil(">>>");
        await this.writeToDevice("\r"); //do a linefeed and see if the REPL responds
        const result = await this.haltUntilRead(1, 10); //this should be fast
        if(result.length == 0){
            return false;
        }
        else{
            return true;
        }

    }

     /**
     * stopTheRobot - Get the robot to the REPL and not running a program.
     * @returns boolean
     */
    async stopTheRobot(): Promise<boolean> {
        //This is a complicated task since the different conditions. The Micropython could be in one of 2 states
        //  1 - Sitting at the REPL prompt ready to go
        //  2 - Running a program
        //
        //    If running a program then we need to send a ctrl-c to stop the program.
        //    This brings up 3 conditions:
        //       1 - The ctrl-c stopped the program and we are back at the prompt
        //       2 - We were in RAW mode, so try going to NORMAL mode(get REPL output again), if we get a prompt then done
        //       3 - It took the ctrl-c but since the program was in a different thread (timers are the most likely) it didn't stop the program
        //          For this one we need to try a few more times in hopes the program will be in a state we can interrupt. If not ask the user to
        //             reset and try again.
        //
        //  3 - We are connecting via Bluetooth. In that case we will use the Bluetooth STOP if not at the REPL


        // We already checked if it was at the prompt 

        this.startReaduntil("KeyboardInterrupt:");
        await this.writeToDevice("\r" + this.CTRL_CMD_KINTERRUPT);  // ctrl-C to interrupt any running program
        let result = await this.haltUntilRead(1, 20);
        if (result == undefined) {
            this.startReaduntil(">>>");
            await this.writeToDevice("\r" + this.CTRL_CMD_NORMALMODE);  // ctrl-C to interrupt any running program
            result = await this.haltUntilRead(1, 20);
            if (result != undefined) {
                return true;
            }
        }
        //try multiple times to get to the prompt
        let gotToPrompt = false;
        for (let i = 0; i < 20; i++) {
            this.startReaduntil(">>>");
            await this.writeToDevice("\r" + this.CTRL_CMD_KINTERRUPT);
            result = await this.haltUntilRead(2, 5); //this should be fast
            if (result != undefined) {
                gotToPrompt = true;
                break;
            }
        }
        return gotToPrompt;
    }
    async prepareForStop() {

        if(this.isBusy() && this.isRunBusy === false){    //don't try and STOP if the code is BUSY but not from Running a user program.
            return;
        }
        if(this.isRunBusy){  //if the program is running do ctrl-c until we know it has stopped
            this.STOP = true;  //let the executeLines code know when it stops, it stopped because the STOP button was pushed
            this.specialForceOutputFlag = false; //turn off showing output so they don't see the keyboardInterrupt and stack trace.
            this.isRunBusy = false;
            return
        }
    }

}



export default Connection;