import TabItem from './tab-item';
import TabList from './tab-list';
import FolderTree from './folder-tree';
import { useTranslation } from 'react-i18next';

function Tabs() {
    const { t } = useTranslation();
    
    return (
        <TabList activeTabIndex={0}>
            <TabItem label={t('myview')}>
                <FolderTree treeData={null} theme="" />
            </TabItem>
            <TabItem label={t('sysview')}>
                <span>System View</span>
            </TabItem>
        </TabList>
    );
}

export default Tabs;
