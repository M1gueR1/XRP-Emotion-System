import { useEffect, useRef } from 'react';
import './App.css';
import Navbar from '@components/navbar';
import XRPLayout from '@components/xrplayout';
import AppMgr from '@/managers/appmgr';

function App() {
    const xrpLayoutRef = useRef();
    const appMgrRef = useRef<AppMgr>();

    /**
     * Initialize AppMgr instance and its dependencies
     */
    useEffect(() => {
        if (!appMgrRef.current) {
            appMgrRef.current = AppMgr.getInstance();
            appMgrRef.current.start();
        }
    }, []);

    return (
        <>
            <header className="bg-curious-blue-700 dark:bg-mountain-mist-950">
                <Navbar layoutref={xrpLayoutRef} />
            </header>
            <main className="relative h-[calc(100vh-56px)]">
                <XRPLayout forwardedref={xrpLayoutRef} />
            </main>
        </>
    );
}

export default App;
