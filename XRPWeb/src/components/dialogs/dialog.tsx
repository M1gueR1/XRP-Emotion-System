import React, { forwardRef } from 'react';

type DialogProps = {
    children: React.ReactNode;
    isOpen: boolean;
    toggleDialog: () => void;
};

const Dialog = forwardRef<HTMLDialogElement, DialogProps>((dlgProps, ref) => {
    return (
        <dialog
            style={{zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}
            open={dlgProps.isOpen}
            className="rounded-md shadow-md border-shark-400 backdrop:bg-mountain-mist-500 backdrop:opacity-40 dark:border dark:border-shark-600 dark:bg-shark-950 transition-all overflow-hidden"
            ref={ref}
            onClick={(e) => {
                if (e.currentTarget === e.target) {
                    dlgProps.toggleDialog();
                }
            }}
        >
            {dlgProps.children}
        </dialog>
    );
});
export default Dialog;
