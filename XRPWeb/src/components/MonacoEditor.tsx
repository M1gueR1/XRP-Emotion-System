import '@codingame/monaco-vscode-python-default-extension';
import '@codingame/monaco-vscode-theme-defaults-default-extension';
import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { initialize } from 'vscode/services';
import getLanguagesServiceOverride from '@codingame/monaco-vscode-languages-service-override';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getTextMateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import getConfigurationServiceOverride, {
    updateUserConfiguration,
} from '@codingame/monaco-vscode-configuration-service-override';
// we need to import this so monaco-languageclient can use vscode-api
import 'vscode/localExtensionHost';
import { ExtensionHostKind, registerExtension } from '@codingame/monaco-vscode-api/extensions';
import { initializedAndStartLanguageClient } from '@components/lsp-client';
import AppMgr, { EventType, Themes } from '@/managers/appmgr';
import { StorageKeys } from '@/utils/localstorage';
import EditorMgr, { EditorSession } from '@/managers/editormgr';
import { FontSize } from '@/utils/types';
import { Constants } from '@/utils/constants';
import { useTranslation } from 'react-i18next';
import { whenReady } from '@codingame/monaco-vscode-python-default-extension';

const languageId = 'python';

export type WorkerLoader = () => Worker;
const workerLoaders: Partial<Record<string, WorkerLoader>> = {
    TextEditorWorker: () =>
        new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), {
            type: 'module',
        }),
    TextMateWorker: () =>
        new Worker(
            new URL('@codingame/monaco-vscode-textmate-service-override/worker', import.meta.url),
            { type: 'module' },
        ),
};

window.MonacoEnvironment = {
    getWorker: function (_moduleId, label) {
        console.log('getWorker', _moduleId, label);
        const workerFactory = workerLoaders[label];
        if (workerFactory != null) {
            return workerFactory();
        }
        throw new Error(`Worker ${label} not found`);
    },
};

let initPromise: Promise<void> | null = null;

const ensureMonacoInitialized = () => {
    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const monacoInstance = (monaco as any).default ?? monaco;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).monaco = monacoInstance;
            console.log('[MonacoEditor] window.monaco:', monacoInstance);
            if (!monacoInstance) {
                throw new Error('monaco instance is null or undefined');
            } else if (!monacoInstance.languages) {
                throw new Error('monaco.languages is undefined');
            }
        }
        try {
            console.log('[MonacoEditor] Calling initialize()');
            await initialize({
                ...getTextMateServiceOverride(),
                ...getThemeServiceOverride(),
                ...getConfigurationServiceOverride(),
                ...getKeybindingsServiceOverride(),
                ...getLanguagesServiceOverride(),
            });
            console.log('[MonacoEditor] initialize() completed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err?.message?.includes('already been initialized')) {
                console.warn('[MonacoEditor] Monaco services already initialized. Ignoring.');
            } else {
                console.error('[MonacoEditor] Error initializing monaco services:', err);
                throw err;
            }
        }
        
        await whenReady();

        // extension configuration derived from:
        // https://github.com/microsoft/pyright/blob/main/packages/vscode-pyright/package.json
        // only a minimum is required to get pyright working
        const extension = {
            name: 'python-client',
            publisher: 'monaco-languageclient-project',
            version: '1.0.0',
            engines: {
                vscode: '^1.78.0',
            },
            contributes: {
                languages: [
                    {
                        id: languageId,
                        aliases: ['Python'],
                        extensions: ['.py', '.pyi'],
                    },
                ],
                commands: [
                    {
                        command: 'pyright.restartserver',
                        title: 'Pyright: Restart Server',
                        category: 'Pyright',
                    },
                    {
                        command: 'pyright.organizeimports',
                        title: 'Pyright: Organize Imports',
                        category: 'Pyright',
                    },
                ],
                keybindings: [
                    {
                        key: 'ctrl+k',
                        command: 'pyright.organizeimports',
                        when: 'editorTextFocus',
                    },
                ],
            },
        };

        registerExtension(extension, ExtensionHostKind.LocalProcess);
        console.log('[MonacoEditor] Extension registered');

        // start web socket lsp client to the Web Worker python server
        initializedAndStartLanguageClient();
    })().catch(err => {
        // Reset promise on error so we can retry
        initPromise = null;
        throw err;
    });

    return initPromise;
};

type MonacoEditorProps = {
    /**
     * id of the editor container
     */
    tabId: string;
    /**
     * name of the editor container
     */
    tabname: string;
    /**
     * Height of the editor container
     */
    width: number | string;
    /**
     * Width of the editor container
     */
    height: number | string;
    /**
     * Class name of the editor container
     */
    className?: string;
    /**
     * Language of the current model
     */
    language?: string;
    /**
     * Value of the current model
     */
    value?: string;
};

const MonacoEditor = ({
    tabId,
    tabname,
    width,
    height,
    language = 'python',
    value,
    className,
}: MonacoEditorProps) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<HTMLDivElement | null>(null);
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [childWidth, setChildWidth] = useState(width);
    const [childHeight, setChildHeight] = useState(height);
    const [name, setName] = useState<string>(tabname);
    const nameRef = useRef(name);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let mounted = true;
        console.log('[MonacoEditor] useEffect mounting');

        ensureMonacoInitialized().then(() => {
            console.log('[MonacoEditor] init() resolved');
            if (mounted) setIsReady(true);
        }).catch((err) => {
            console.error('[MonacoEditor] init failed', err);
        });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        nameRef.current = name;
    }, [name]);

    useEffect(() => {
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                // we only expect one element to be observed
                if (!entries || entries.length === 0) {
                    return;
                }
                const {clientWidth, clientHeight} = entries[0].target as HTMLDivElement;
                setChildWidth(clientWidth);
                setChildHeight(clientHeight);
                if (editor.current) {
                    editor.current.layout({ width: clientWidth, height: clientHeight });
                }
            });
            resizeObserver.observe(containerRef.current);
            return () => {
                resizeObserver.disconnect();
            };
        }
    }, []);

    useEffect(() => {
        /**
         * SaveEditor save the current editor session to XRP
         * @param code
         */
        async function SaveEditor(code: string) {
            const activeTab = localStorage.getItem(StorageKeys.ACTIVETAB)?.replace(/^"|"$/g, '');
            if (activeTab === tabId) {
                await EditorMgr.getInstance().saveEditor(tabId, code);
                EditorMgr.getInstance().SaveToLocalStorage(
                    EditorMgr.getInstance().getEditorSession(tabId) as EditorSession,
                    code,
                );
            }
        }

        if (
            EditorMgr.getInstance().hasEditorSession(tabId) &&
            !EditorMgr.getInstance().hasSubscription(tabId)
        ) {
            AppMgr.getInstance().on(EventType.EVENT_THEME, (theme) => {
                console.log('Monaco set theme to ${selectedTheme}');
                if (editor.current != null)
                    monaco.editor.setTheme(theme === Themes.DARK ? 'Default Dark Modern' : 'vs');
            });

            AppMgr.getInstance().on(EventType.EVENT_EDITOR_LOAD, (content) => {
                console.log('Editor Content', content);
                const session: EditorSession | undefined =
                    EditorMgr.getInstance().getEditorSession(tabId);
                const loadContent = JSON.parse(content);
                if (loadContent.name !== nameRef.current || loadContent.path !== session?.path) return;
                if (editorRef.current && editor.current) {
                    const model = monaco.editor.createModel(loadContent.content, languageId);
                    editor.current.setModel(model);
                }
                if (session) {
                    EditorMgr.getInstance().SaveToLocalStorage(session, loadContent.content);
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_FONTCHANGE, (change) => {
                const activeTab = localStorage
                    .getItem(StorageKeys.ACTIVETAB)
                    ?.replace(/^"|"$/g, '');
                if (activeTab !== tabId) return;
                if (change === FontSize.INCREASE) {
                    const fontsize = EditorMgr.getInstance().getFontsize(tabId) + 1;
                    EditorMgr.getInstance().setFontsize(tabId, fontsize);
                    editor.current?.updateOptions({ fontSize: fontsize });
                } else if (change === FontSize.DESCREASE) {
                    const fontsize = EditorMgr.getInstance().getFontsize(tabId) - 1;
                    EditorMgr.getInstance().setFontsize(tabId, fontsize);
                    editor.current?.updateOptions({ fontSize: fontsize });
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_SAVE_EDITOR, () => {
                const code = editor.current?.getValue();
                if (code !== undefined) {
                    SaveEditor(code);
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_EDITOR_NAME_CHANGED, (names) => {
                const newNames = JSON.parse(names);
                if (newNames.oldId !== nameRef.current) return;
                setName(newNames.newId);
            });

            EditorMgr.getInstance().setFontsize(tabId, Constants.DEFAULT_FONTSIZE);
            EditorMgr.getInstance().setSubscription(tabId);
        }

        if (isReady && editorRef.current) {
            if (editor.current === null) {
                updateUserConfiguration(`{
                    "editor.fontSize": ${Constants.DEFAULT_FONTSIZE},
                    "workbench.colorTheme": "${AppMgr.getInstance().getTheme() === Themes.DARK ? 'Default Dark Modern' : 'vs'}"
                }`);

                editor.current = monaco.editor.create(editorRef.current, {
                    value: value,
                    language: language,
                });

                monaco.editor.onDidCreateEditor((codeEditor) => {
                    console.log('Editor created', codeEditor.getId());
                });

                const editorSession = EditorMgr.getInstance().getEditorSession(tabId);
                if (editorSession && editorSession.content) {
                    const model = monaco.editor.createModel(editorSession.content, languageId);
                    editor.current?.setModel(model);
                    // Update live content with session content
                }
    
                editor.current.onDidChangeModelContent(() => {
                    const code = editor.current?.getValue();
                    if (code) {
                        EditorMgr.getInstance().updateEditorSessionChange(tabId, true);
                        EditorMgr.getInstance().SaveToLocalStorage(
                            EditorMgr.getInstance().getEditorSession(tabId) as EditorSession,
                            code,
                        );
                    }
                });

                editor.current.addAction({
                    id: 'save',
                    label: t('save'),
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 1.5,
                    precondition: '',
                    keybindingContext: '',
                    run: (ed) => {
                        console.log('Save', ed);
                        const code = editor.current?.getValue();
                        if (code !== undefined) {
                            SaveEditor(code);
                        }
                    },
                });
            }
        }
    }, [language, value, t, childWidth, childHeight, tabId, isReady]);

    return (
        <>
            <div ref={containerRef} className='w-full h-full'>
                <div ref={editorRef} style={{ width: childWidth, height: childHeight }} className={className} />
            </div>
        </>
    );
};

export default MonacoEditor;
