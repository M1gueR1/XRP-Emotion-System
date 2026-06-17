type BleParingProps = {
    url: string;
};

/**
 * Bluetooth Paring Dialog
 * @param bleParingProps
 * @returns
 */
function BleParingDlg({ url }: BleParingProps) {
    return (
        <div className="flex flex-col gap-2">
            <h2>{url}</h2>
            <div className="border-shark-800 dark:border-shark-500 dark:bg-shark-950 h-64 rounded-md border p-8 md:w-[500px] xl:w-[600px]">
                <ul>
                    <li>
                        <span>XRP=ef5d0</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default BleParingDlg;
