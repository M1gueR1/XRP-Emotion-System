type UsbConnProps = {
    url: string;
};

/**
 * UsbConnectionDlg - manage USB connection
 * @param param0
 * @returns
 */
function UsbConnectDlg({ url }: UsbConnProps) {
    return (
        <div className="flex flex-col gap-2">
            <h2>{url}</h2>
            <div className="border-shark-800 dark:border-shark-500 dark:bg-shark-950 h-64 rounded-md border p-8 md:w-[500px] xl:w-[600px]"></div>
        </div>
    );
}

export default UsbConnectDlg;
