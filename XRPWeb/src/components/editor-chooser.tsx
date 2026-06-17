import React from 'react';
import blocklyImage from '@assets/images/blockly.svg';
import pythonImage from '@assets/images/micropython.png';
import { Actions, IJsonTabNode, Layout } from 'flexlayout-react';

type EditorChooserProps = {
    flref: React.RefObject<Layout>;
};

/**
 *
 * @param EditorChooserProps - React props contain the reference to the Layout object
 * @returns TSX
 */
function EditorChooser({ flref }: EditorChooserProps) {
    const layoutRef = flref;
    const chooserId = 'chooserId';

    /**
     *
     * @param tabId - Id of the tab to be removed
     */
    function removeTab(tabId: string) {
        const model = layoutRef.current?.props.model;
        model!.doAction(Actions.deleteTab(tabId));
    }

    /**
     *
     * @param tabInfo - JSON structure of the tab component to be created
     * @returns - TabNode
     */
    function createTab(tabInfo: IJsonTabNode) {
        let tabNode = null;
        if (tabInfo) {
            tabNode = layoutRef!.current?.addTabToActiveTabSet(tabInfo);
        }
        return tabNode;
    }

    /**
     * onPythonBtnClicked handler for the MicroPython button
     */
    const onPythonBtnClicked = () => {
        console.log('Python Button clicked!', layoutRef.current?.getRootDiv());

        const tabNode = createTab({ component: 'editor', name: 'untitle.py' });

        if (tabNode) {
            // remove the chooser tab after new tab is added
            removeTab(chooserId);
        }
    };

    /**
     * onBlocklyBtnClicked handler for the Blockly button
     */
    const onBlocklyBtnClicked = () => {
        console.log('Blockly button clicked!');

        const tabNode = createTab({ component: 'blockly', name: 'untitle' });

        if (tabNode) {
            // remove the chooser tab after new tab is added
            removeTab(chooserId);
        }
    };

    return (
        <div className="flex flex-row h-full justify-evenly">
            <button
                id="blockly"
                className="bg-curious-blue-600 hover:bg-curious-blue-400 dark:bg-mountain-mist-950 w-full dark:hover:bg-[#666]"
                onClick={onBlocklyBtnClicked}
                title="Load a blockly Editor for visual block-based coding"
            >
                <div className="flex flex-col items-center gap-2">
                    <img src={blocklyImage} alt="Blockly Visual Editor" />
                    <span>BLOCKLY</span>
                    <span>(VISUAL BLOCK EDITOR)</span>
                </div>
            </button>
            <button
                id="pythonBtn"
                className="bg-curious-blue-600 hover:bg-curious-blue-400 dark:bg-mountain-mist-950 w-full dark:hover:bg-[#666]"
                onClick={onPythonBtnClicked}
                title="Load a MicroPython Editor for normal text-based coding."
            >
                <div className="flex flex-col items-center gap-2">
                    <img
                        src={pythonImage}
                        className="p-7"
                        alt="MicroPython image"
                        width="190"
                        height="190"
                    />
                    <span>MICRO PYTHON</span>
                    <span>(TEXT CODE EDITOR)</span>
                </div>
            </button>
        </div>
    );
}

export default EditorChooser;
