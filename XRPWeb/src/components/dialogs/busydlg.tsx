import XRPBusyImage from '@assets/images/logo_x_rotate_in_place.gif';

type BusyDlgProps = {
    title: string;
}

/**
 * Busy Dialog component
 * @param title
 * @returns 
 */
function BusyDialog({title}: BusyDlgProps) {
  return (
    <div className="flex flex-col gap-4 items-center p-4">
        <h2 className='text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300'>{title}</h2>
        <div className="flex flex-col items-center border-shark-800 dark:border-shark-500 dark:bg-shark-950 h-48 rounded-md border p-8 md:w-[500px] xl:w-[600px]">
            <img src={XRPBusyImage} alt="busy" className="self-center h-32 w-auto" />
        </div>
    </div>
  )
}

export default BusyDialog;