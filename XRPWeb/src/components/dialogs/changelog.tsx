import { useEffect, useState } from 'react';
import MarkdownIt from 'markdown-it';

type changelogProps = {
    /**
     * A function to close the dialog.
     */
    closeDialog: () => void;
};

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
});

/**
 * ChangeLogDlg - A component that displays the changelog of the application.
 * @returns ChangeLogDlg
 */
function ChangeLogDlg({ closeDialog }: changelogProps) {
    const [markdown, setMarkdown] = useState<string>('');

    useEffect(() => {
        const fetchMarkdown = async () => {
            const response = await fetch('CHANGELOG.txt');
            if (!response.ok) {
                console.error('Failed to fetch changelog:', response.statusText);
                return;
            }
            const text = await response.text();
            // Convert the text to HTML using markdown-it
            const html = md.render(text);
            setMarkdown(html);
        };
        fetchMarkdown();
    }, []);

    return (
        <>
            <div
                id="default-modal"
                className="h-[calc(100%-1rem)] max-h-full w-full items-center justify-center overflow-hidden md:inset-0"
            >
                <div className="relative max-h-full w-full max-w-2xl">
                    <div className="bg-white relative rounded-lg shadow-sm dark:bg-gray-700">
                        {/* Modal header */}
                        <div className="flex items-center justify-between rounded-t border-b border-gray-200 md:p-4 dark:border-gray-600">
                            <h3 className="dark:text-white text-2xl font-semibold text-gray-400">
                                Change Log
                            </h3>
                            <button
                                type="button"
                                onClick={closeDialog}
                                className="bg-transparent dark:hover:text-white ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600"
                            >
                                <svg
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 14 14"
                                >
                                    <path
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                                    />
                                </svg>
                            </button>
                        </div>
                        {/* Modal body */}
                        <div className="max-h-[85vh] overflow-y-auto overflow-x-hidden p-4">
                            <div className="prose prose-lg max-[767px]:prose dark:prose-invert prose-headings:font-semibold prose-h1:text-curious-blue-600 prose-h2:text-curious-blue-700 prose-h3:text-curious-blue-800 prose-p:leading-relaxed prose-p:text-mountain-mist-800 prose-a:text-curious-blue-600 hover:prose-a:text-curious-blue-700 prose-strong:text-mountain-mist-900 prose-code:bg-curious-blue-50 prose-code:text-curious-blue-700 prose-ol:my-4 prose-ul:my-4 prose-li:text-mountain-mist-800 dark:prose-li:text-mountain-mist-300">
                                <div dangerouslySetInnerHTML={{ __html: markdown }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ChangeLogDlg;
