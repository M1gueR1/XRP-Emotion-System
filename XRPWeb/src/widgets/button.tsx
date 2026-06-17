type ButtonProps = {
    disabled?: boolean;
    children: React.ReactNode;
    tooltip?: string;
    onClicked: () => void;
};
/**
 * Button widget
 * @param btnProps
 * @returns
 */
function Button(btnProps: ButtonProps) {
    return (
        <div className="relative group inline-block">
            <button
                id='btn'
                type="button"
                aria-label='btn'
                data-testid='btn'
                className={`bg-matisse-600 text-curious-blue-50 hover:bg-matisse-500 dark:bg-shark-600 dark:hover:bg-shark-500 dark:border-shark-500 flex h-10 w-auto items-center rounded-3xl border px-8 py-2 text-lg ${btnProps.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer opacity-100'}`}
                onClick={btnProps.onClicked}
                disabled={btnProps.disabled}
            >
                {btnProps.children}
            </button>
            { btnProps.tooltip && (
                <div className="absolute opacity-0 group-hover:opacity-100 invisible group-hover:visible w-full mt-1 rounded-md bg-shark-100 dark:bg-shark-500 shadow-md px-2 py-1 text-mountain-mist-800 dark:text-mountain-mist-100 text-sm border border-shark-400 dark:border-shark-100 z-10">
                    {btnProps.tooltip}
                </div>
            )}
        </div>
    );
}

export default Button;
