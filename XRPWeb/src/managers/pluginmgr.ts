import { CommandToXRPMgr } from './commandstoxrpmgr';
import AppMgr, { EventType } from './appmgr';
import BlocklyConfigs from '@components/blockly/xrp_blockly_configs';
import * as Blockly from 'blockly/core';

interface PluginBlock {
    kind: string;
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export interface Plugin {
    friendly_name: string;
    blocks_url: string;
    script_url: string;
}

export interface PluginConfig {
    plugins: Plugin[];
}

/*
Outstanding problems.
1 - Until you attach to an XRP programs with 3rd party blocks can not be rendered since we have not loaded the extra blocks.
2 - In Google User mode does the system of record for plugin.json stay with the XRP. 
        The added sensors are specific to the XRP.
        But, we allow offline editing in Google User mode.
*/


export default class PluginMgr {
    private static instance: PluginMgr;
    private cmdToXRPMgr: CommandToXRPMgr = CommandToXRPMgr.getInstance();
    private loadedScripts: Set<string> = new Set();
    private pluginConfig: PluginConfig | null = null;

    constructor() {}

    public static getInstance(): PluginMgr {
        if (!PluginMgr.instance) {
            PluginMgr.instance = new PluginMgr();
        }
        return PluginMgr.instance;
    }

    // --- Public Methods ---
    public async pluginCheck(): Promise<void> {
        let needsUpdate = false;

        // Check for RP2350 board special case
        if (this.cmdToXRPMgr.getXRPDrive() === "RP2350") {
            await this.configNonBeta();
            needsUpdate = true;
        }

        // Add NanoXRP-specific blocks
        if (this.cmdToXRPMgr.isNanoXRP()) {
            this.configNanoXRP();
            needsUpdate = true;
        }

        // Load and process plugins from plugin.json
        await this.loadPlugins();
        
        if (needsUpdate || this.pluginConfig) {
            this.updateAllBlocklyEditors();
        }
    }

    /**
     * Load plugins from plugin.json file
     */
    private async loadPlugins(): Promise<void> {
        try {
            // Try to read plugin.json from the XRP device
            const pluginContent = await this.cmdToXRPMgr.getFileContents('lib/plugins/plugins.json');
            if (pluginContent && pluginContent.length > 0) {
                const pluginText = new TextDecoder().decode(new Uint8Array(pluginContent));
                this.pluginConfig = JSON.parse(pluginText);
                await this.processPlugins();
            }
        } catch (error) {
            console.log('No plugin.json found or error loading plugins:', error);
        }
    }

    /**
     * Process loaded plugins and add blocks to toolbox
     */
    private async processPlugins(): Promise<void> {
        if (!this.pluginConfig) return;

        // Ensure "3rd Party" category exists
        this.ensureThirdPartyCategory();

        // Process each plugin
        for (const plugin of this.pluginConfig.plugins) {
            await this.addPluginToToolbox(plugin);
        }
    }

    /**
     * Ensure "3rd Party" category exists in toolbox
     */
    private ensureThirdPartyCategory(): void {
        const toolbox = BlocklyConfigs.ToolboxJson;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contents = toolbox.contents as any[];

        // Check if "3rd Party" category already exists
        const thirdPartyCategory = contents.find(cat => 
            cat.kind === "CATEGORY" && cat.name === "3rd Party"
        );

        if (!thirdPartyCategory) {
            // Add "3rd Party" category after the Gamepad category
            const thirdPartyCat = {
                "kind": "CATEGORY",
                "name": "3rd Party",
                "colour": "#5b80a5", // blue color
                "contents": []
            };

            // Find the Gamepad category and insert after it
            let gamepadIndex = -1;
            for (let i = 0; i < contents.length; i++) {
                if (contents[i].kind === "CATEGORY" && contents[i].name === "Gamepad") {
                    gamepadIndex = i;
                    break;
                }
            }
            if (gamepadIndex !== -1) {
                contents.splice(gamepadIndex + 1, 0, thirdPartyCat);
            } else {
                // If Gamepad category not found, add at the end before the last separator
                let lastSepIndex = -1;
                for (let i = contents.length - 1; i >= 0; i--) {
                    if (contents[i].kind === "SEP") {
                        lastSepIndex = i;
                        break;
                    }
                }
                if (lastSepIndex !== -1) {
                    contents.splice(lastSepIndex, 0, thirdPartyCat);
                } else {
                    contents.push(thirdPartyCat);
                }
            }
        }
    }

    /**
     * Add a plugin's blocks to the toolbox
     */
    private async addPluginToToolbox(plugin: Plugin): Promise<void> {
        const toolbox = BlocklyConfigs.ToolboxJson;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contents = toolbox.contents as any[];

        // Find the "3rd Party" category
        const thirdPartyCategory = contents.find(cat => 
            cat.kind === "CATEGORY" && cat.name === "3rd Party"
        );

        if (!thirdPartyCategory) {
            console.error('3rd Party category not found');
            return;
        }

        // Load blocks from the blocks URL
        const blocks = await this.loadPluginBlocks(plugin.blocks_url);
        if (!blocks) {
            console.error(`Failed to load blocks from ${plugin.blocks_url}`);
            return;
        }

        // Create plugin subcategory
        const pluginCategory = {
            "kind": "CATEGORY",
            "name": plugin.friendly_name,
            "colour": "#7b5ba5", // purple color for plugins
            "contents": blocks
        };

        thirdPartyCategory.contents.push(pluginCategory);

        // Load the supporting script (normalized path)
        await this.loadScript(plugin.script_url);
    }

    /**
     * Load plugin blocks from a JSON file
     */
    private async loadPluginBlocks(blocksUrl: string): Promise<PluginBlock[] | null> {
        
        if (process.env.NODE_ENV === 'development') {
                blocksUrl = '/public/' + blocksUrl;
            }
        
        try {
            const response = await fetch(blocksUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blocks = await response.json();
            return blocks;
        } catch (error) {
            console.error(`Error loading plugin blocks from ${blocksUrl}:`, error);
            return null;
        }
    }

    /**
     * Load a script dynamically (module import with fallback)
     */
    private async loadScript(scriptUrl: string): Promise<void> {
        if (process.env.NODE_ENV === 'development') {
            scriptUrl = '/public/' + scriptUrl;
        } else {
            scriptUrl = '../' + scriptUrl;
        }
        
        if (this.loadedScripts.has(scriptUrl)) {
            return; // Already loaded
        }

        try {
            // Dynamic import of the plugin script
            await import(/* @vite-ignore */ scriptUrl);
            this.loadedScripts.add(scriptUrl);
        } catch (error) {
            console.error(`Error loading script ${scriptUrl}:`, error);
        }
    }

    
    /**
     * Add NanoXRP-specific blocks to the toolbox (middle reflectance sensor)
     */
    private configNanoXRP(): void {
        const toolbox = BlocklyConfigs.ToolboxJson;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contents = toolbox.contents as any[];

        const sensorsCategory = contents.find(cat =>
            cat.kind === "CATEGORY" && cat.name === "Sensors"
        );

        if (sensorsCategory) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reflectanceCategory = sensorsCategory.contents.find((cat: any) =>
                cat.kind === "CATEGORY" && cat.name === "Reflectance"
            );

            if (reflectanceCategory) {
                reflectanceCategory.contents.push({
                    "kind": "BLOCK",
                    "type": "xrp_m_refl"
                });
            }
        }
    }

    /**
     * Configure non-beta blocks for RP2350 board
     */
    private async configNonBeta(): Promise<void> {
        const pluginRootUrl = 'plugins/2350/';
        // Add color LED block to Control Board category
        const toolbox = BlocklyConfigs.ToolboxJson;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contents = toolbox.contents as any[];

        const controlBoardCategory = contents.find(cat => 
            cat.kind === "CATEGORY" && cat.name === "Control Board"
        );

        if (controlBoardCategory) {
            const colorLEDBlock = await this.loadPluginBlocks(pluginRootUrl + 'nonbeta_blocks.json');
            controlBoardCategory.contents.push(colorLEDBlock);
        }

        // Extend servo array to support 4 servos for RP2350
        this.extendServoArrayForRP2350();

        // Load the supporting script (use Vite public root)
        await this.loadScript(pluginRootUrl + 'nonbeta_blocks.js');
    }

    /**
     * Extend the servo array to support 4 servos for RP2350 board
     */
    private extendServoArrayForRP2350(): void {
        // Dynamically update the servo block to support 4 servos
        // This needs to be done after the xrp_blocks.js is loaded
        setTimeout(() => {
            if (Blockly.Blocks['xrp_servo_deg']) {
                // Redefine the servo block with 4 servo options
                Blockly.Blocks['xrp_servo_deg'] = {
                    init: function () {
                        this.appendDummyInput()
                            .appendField('Servo:')
                            .appendField(new Blockly.FieldDropdown([["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]]), "SERVO")
                            .appendField('Deg:');
                        this.appendValueInput("degrees")
                            .setCheck("Number")
                        this.setInputsInline(true);
                        this.setPreviousStatement(true, null);
                        this.setNextStatement(true, null);
                        this.setColour(300); // light purple
                        this.setTooltip("");
                        this.setHelpUrl("");
                    }
                };
            }
        }, 100); // Small delay to ensure xrp_blocks.js is loaded
    }

    /**
     * Update all open Blockly editors to show new blocks
     */
    private updateAllBlocklyEditors(): void {
        // Emit an event to notify that the toolbox has been updated
        AppMgr.getInstance().emit(EventType.EVENT_BLOCKLY_TOOLBOX_UPDATED, '');
        
    }

    /**
     * Get the current toolbox configuration
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getToolboxConfiguration(): any {
        return BlocklyConfigs.ToolboxJson;
    }

    /**
     * Check if a script has been loaded
     */
    public isScriptLoaded(scriptUrl: string): boolean {
        return this.loadedScripts.has(scriptUrl);
    }

    /**
     * Get loaded plugins information
     */
    public getLoadedPlugins(): Plugin[] {
        return this.pluginConfig?.plugins || [];
    }
}