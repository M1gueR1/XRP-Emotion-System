// lsp-client.ts
import * as vscode from 'vscode';
import { CloseAction, ErrorAction, MessageTransports } from 'vscode-languageclient/browser.js';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { whenReady } from '@codingame/monaco-vscode-python-default-extension';
import {
    BrowserMessageReader,
    BrowserMessageWriter,
} from 'vscode-languageserver-protocol/browser.js';
import { Uri } from 'vscode';
import * as JSZip from 'jszip';

const languageId = 'python';
let files: { [id: string]: string } = {};

/**
 * read file contents from zip file using jszip
 * @param url url of the zip file
 * @returns object with file path and file contents
 */
async function readZipFile(url: string) {
    try {
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        const results: { [id: string]: string } = {};
        const zip = await JSZip.loadAsync(data);
        // eslint-disable-next-line prefer-const
        for (let [filename, file] of Object.entries(zip.files)) {
            // skip directories which suffixed with '/'
            if (filename.endsWith('/')) {
                // console.info(`Skip directory ${filename}`);
                continue;
            }
            if (filename.startsWith('__MACOSX')) {
                // skip internal files
                continue;
            }
            // filename = filename.replace(/^stdlib/, '/workspace/typings');
            filename = filename.replace(/^(stdlib|stubs)/, '/$1');
            // filename = filename.replace(/^(stdlib|stubs)/, '/workspace/$1');
            //console.info(`Reading ${filename}`);
            results[filename] = await file.async('text');
        }
        console.info(`Read ${Object.keys(results).length} files`);
        // console.info(results);
        return results;
    } catch (error) {
        console.error(error);
        return {};
    }
}

export const initializedAndStartLanguageClient = async () => {
    console.log('Initialized and Start Language Client');

    let files1: { [id: string]: string } = {};
    let files2: { [id: string]: string } = {};
    files1 = await readZipFile(
        new URL('./stdlib-source-with-typeshed-pyi.zip', window.location.href).href,
    );
    files2 = await readZipFile(new URL('./XRPLib.zip', window.location.href).href);
    files = Object.assign({}, files1, files2);

    await whenReady();

    const pythonWorkerUrl = new URL(
        '@typefox/pyright-browser/dist/pyright.worker.js',
        import.meta.url,
    );
    console.info(`lsp-client.ts, pythonWorkerUrl: ${pythonWorkerUrl}`);
    const worker = new Worker(pythonWorkerUrl, { type: 'module' });
    worker.postMessage({
        type: 'browser/boot',
        mode: 'foreground',
    });
    const reader = new BrowserMessageReader(worker);
    const writer = new BrowserMessageWriter(worker);

    const languageClient = createLanguageClient({
        reader,
        writer,
    });
    languageClient.start();
    reader.onClose(() => languageClient.stop());

    const registerCommand = async (cmdName: string, handler: (...args: unknown[]) => void) => {
        // commands should not be there, but it demonstrates how to retrieve list of all external commands
        const commands = await vscode.commands.getCommands(true);
        if (!commands.includes(cmdName)) {
            vscode.commands.registerCommand(cmdName, handler);
        }
    };
    // always exectute the command with current language client
    await registerCommand('pyright.restartserver', (...args: unknown[]) => {
        languageClient.sendRequest('workspace/executeCommand', {
            command: 'pyright.restartserver',
            arguments: args,
        });
    });
    await registerCommand('pyright.organizeimports', (...args: unknown[]) => {
        languageClient.sendRequest('workspace/executeCommand', {
            command: 'pyright.organizeimports',
            arguments: args,
        });
    });
};

const createLanguageClient = (messageTransports: MessageTransports): MonacoLanguageClient => {
    return new MonacoLanguageClient({
        name: 'Python Language Client',
        clientOptions: {
            // use a language id as a document selector
            documentSelector: [languageId],
            // disable the default error handler
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart }),
            },
            workspaceFolder: {
                index: 0,
                name: '/',
                uri: Uri.file('/'),
            },
            synchronize: {
                fileEvents: [vscode.workspace.createFileSystemWatcher('**')],
            },
            initializationOptions: {
                files,
            },
        },
        // create a language client connection from the JSON RPC connection on demand
        messageTransports: messageTransports,
    });
};
