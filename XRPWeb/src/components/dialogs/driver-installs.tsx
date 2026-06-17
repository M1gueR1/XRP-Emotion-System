import { CommandToXRPMgr } from '@/managers/commandstoxrpmgr';
import { Constants } from '@/utils/constants';
import { useEffect, useState } from 'react';
import DialogFooter from './dialog-footer';
import AppMgr, { EventType } from '@/managers/appmgr';
import PluginMgr, { Plugin, PluginConfig } from '@/managers/pluginmgr';
import { useTranslation } from 'react-i18next';

interface Driver {
    friendlyName: string;
    name: string;
    manufacturer: string;
    version: string;
    url: string;
    docUrl: string;
    isChecked?: boolean;
    hasInstalled?: boolean;
}

interface XRPDriverInstallsProps {
    toggleDialog: () => void;
}

/**
 * XRPDriverInstallDlg - Component to display and manage third-party driver installations
 * 
 * This component fetches a list of available drivers from a local JSON file and checks which drivers are already installed.
 * Users can select drivers to install, and the installation process handles dependencies as well.
 */
function XRPDriverInstallDlg({toggleDialog}: XRPDriverInstallsProps) {
    const { t } = useTranslation();
    const [drivers, setDrivers] = useState<Driver[]>([]);    

    useEffect(() => {
        // fetch the driver list from the public/drivers folder
        const fetchDrivers = async () => {
            await CommandToXRPMgr.getInstance().getInstalledDrivers().then(async (installedDrivers) => {
                console.log('Installed drivers:', installedDrivers);
                if (installedDrivers.length === 0) {
                    return;;
                }

                try {
                    const response = await fetch('drivers/drivers.json');
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    const drivers = await response.json();
                    drivers.drivers.sort((a: Driver, b: Driver) => a.friendlyName.localeCompare(b.friendlyName));
                    const updatedDrivers = drivers.drivers.map((driver: Driver) => ({
                        ...driver,
                        isChecked: false,
                        hasInstalled: installedDrivers.includes(driver.name),
                    }));
                    setDrivers(updatedDrivers);
                    // Here you can set the drivers to state if needed
                } catch (error) {
                    console.error('Failed to fetch drivers:', error);
                }                
            }).catch((error) => {
                console.error('Failed to get installed drivers:', error);
            });
        };
        fetchDrivers();
    }, []);

    /**
     * updatePlugins - Update the blockly plugins.json in the /lib/plugins directory
     * @param json 
     */
    const updatePlugins = async (plugin: Plugin) => {
        // create the plugins.json if it doesn't exist
        // or append additional information if it does
        const pluginJsonPath = Constants.LIBDIR + 'plugins/plugins.json';
        await CommandToXRPMgr.getInstance().getFileContents(pluginJsonPath).then(async (content) => {
            const fileData: string = new TextDecoder().decode(new Uint8Array(content));
            const pluginConfig: PluginConfig = { plugins: [] };
            if (fileData.includes('Traceback')) {
                // create the plugins.json
                pluginConfig.plugins.push(plugin);
            } else {
                // append to plugins.json
                pluginConfig.plugins = JSON.parse(fileData).plugins;
                pluginConfig.plugins.push(plugin);
            }
            await CommandToXRPMgr.getInstance().uploadFile(pluginJsonPath, JSON.stringify(pluginConfig), true);
            await CommandToXRPMgr.getInstance().getOnBoardFSTree();
        });
    }


    /**
     * installDriver - Install a single driver by fetching its package.json and processing it
     * @param package
     */
    const installDriver = async (packageStr: string) => {
        const packageData = JSON.parse(packageStr);
        console.log('Installing driver package:', packageData);
        // Here you would add the logic to install the driver using the package data

        if (packageData.urls) {
            AppMgr.getInstance().emit(EventType.EVENT_SHOWPROGRESS, Constants.SHOW_PROGRESS);                   
            for (const url in packageData.urls) {
                const fileUrl = packageData.urls[url];
                await fetch(fileUrl[1])
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                    .then(async (code) => {
                        // upload the file to the XRP Robot
                        const path = Constants.LIBDIR + fileUrl[0];
                        AppMgr.getInstance().emit(EventType.EVENT_PROGRESS_ITEM, path);
                        await CommandToXRPMgr.getInstance().uploadFile(path, code, true).then(async () => {
                            const found = drivers.find(d => d.name === fileUrl[0]);
                            if (found) {
                                found.hasInstalled = true;
                                found.isChecked = false;
                                setDrivers([...drivers]);
                            }
                            await CommandToXRPMgr.getInstance().getOnBoardFSTree();
                        });
                    })
                    .catch((error) => {
                        console.error('Failed to download driver file:', error);
                    });
            }
            toggleDialog();
        }

        // check for dependencies and install them second
        if (packageData.deps) {
            for (const dep in packageData.deps) {
                const depUrl = packageData.deps[dep];
                // check if the dependency is already installed
                if (drivers.find(d => d.name === depUrl[0] && d.hasInstalled))
                    continue;
                else {
                    if (depUrl[0].includes('.py') === false) {
                        // create the dependency folder if it doesn't exist
                        const depFolder = Constants.LIBDIR + depUrl[0];
                        await CommandToXRPMgr.getInstance().buildPath(depFolder);
                    }
                }
                await fetch(depUrl[1])
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                    .then(async (json) => {
                        await installDriver(json);
                    })
                    .catch((error) => {
                        console.error('Failed to download dependency:', error);
                    });
            }
        }
        if(packageData.blocks) {
            for (const block in packageData.blocks) {
                const blockUrl = packageData.blocks[block];
                await updatePlugins(blockUrl);
                setTimeout(async () => {
                    await PluginMgr.getInstance().pluginCheck();
                }, 2000);
            }  
        }
    }

    /**
     * handleInstallDriver - Handle the driver installation process
     */
    const handleInstallDriver = () => {
        console.log('Installing selected drivers...');
        toggleDialog();

        // fetch the package.json file from the specified URL
        drivers.forEach(async (driver) => {
            // build the package.json url
            if (driver.isChecked) {
                const url = driver.url;
                console.log('Fetching package.json from:', url);
                await fetch(url)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                    .then((json) => {
                        installDriver(json);
                    })
                    .catch((error) => {
                        console.error('Failed to download driver:', error);
                    });
            }
        });
    }

    /**
     * toggleCheckbox - Toggle the selected checkboxes
     * @param event 
     */
    const toggleCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = event.target.checked;
        const index = parseInt(event.target.id.split('-').pop() ?? '');
        drivers[index].isChecked = isChecked;
        setDrivers([...drivers]);
        console.log('Checkbox toggled:', drivers[index]);
    };

    /**
     * toggleAllCheckboxes - Toggle all checkboxes
     * @param event 
     */
    const toggleAllCheckboxes = (event: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = event.target.checked;
        const updatedDrivers = drivers.map((driver) => ({
            ...driver,
            isChecked: driver.hasInstalled === false ? isChecked : false,
        }));
        setDrivers(updatedDrivers);
        console.log('All checkboxes toggled:', isChecked);
    };

    return (
        <>
            <div className="flex flex-col border border-mountain-mist-700 rounded-md shadow-md h-auto gap-2 p-8 border-b dark:border-gray-600 dark:bg-shark-950 overflow-hidden transition-all">
                <div className='flex flex-col items-center'>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-shark-200">
                        {t('driver-install-title')}
                    </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('driver-install-desc')}
                </p>
                <hr className="w-full border-mountain-mist-600" />
                <div className="flex flex-col overflow-x-auto shadow-md sm:rounded-lg h-[calc(100vh-300px)] mb-4">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="p-4">
                                    <div className="flex items-center">
                                        <input id="checkbox-all-search" type="checkbox" onChange={toggleAllCheckboxes} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                        <label htmlFor="checkbox-all-search" className="sr-only">checkbox</label>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    {t('driver-name')}
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    {t('driver-manufacturer')}
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    {t('driver-version')}
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    {t('driver-install-doc')}
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    {t('driver-has-installed')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map((driver, index) => (
                                <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="w-4 p-4">
                                        <div className="flex items-center">
                                            <input id={`checkbox-table-search-${index}`} type="checkbox" onChange={toggleCheckbox} checked={!!driver.isChecked} disabled={driver.hasInstalled} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                            <label htmlFor={`checkbox-table-search-${index}`} className="sr-only">checkbox</label>
                                        </div>
                                    </td>
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-shark-200">
                                        {driver.friendlyName}
                                    </th>
                                    <td className="px-6 py-4">
                                        {driver.manufacturer}
                                    </td>
                                    <td className="px-6 py-4">
                                        {driver.version}
                                    </td>
                                    <td className="px-6 py-4">
                                        <a href={driver.docUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 dark:text-blue-500 hover:underline">{driver.docUrl}</a>
                                    </td>
                                    <td className="px-6 py-4">
                                        {driver.hasInstalled ? t('driver-install-yes') : t('driver-install-no')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <DialogFooter
                    btnAcceptCallback={handleInstallDriver}
                    btnCancelCallback={toggleDialog}
                    btnAcceptLabel={t('driver-install')}
                />  
            </div>
        </>
    );
}

export default XRPDriverInstallDlg;
