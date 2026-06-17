import { MenuDataItem } from "@/widgets/menutypes";
import { useTranslation } from "react-i18next";

export type MenuItemProps = {
    item: MenuDataItem;
    isConnected: boolean;
    isOther: boolean;
};

/**
 * MenuItem component - create the menu item on the menu
 * @param item 
 * @returns 
 */
function MenuItem({ item, isConnected, isOther }: MenuItemProps) {
    const { t } = useTranslation();
    return (
        <>
            {/** menu item */}
            {item.link ? (
                <a href={item.link ?? '#'} target="_blank">
                    <div className={`flex flex-row gap-1 ${(item.isFile && !isConnected) || (item.isView && isOther) ? 'opacity-30': 'opacity-100'}`}>
                        {/** Image */}
                        {item.iconImage && <img src={item.iconImage} alt={t('menuicon')} />}
                        <span className="whitespace-nowrap pl-2">{item.label}</span>
                    </div>
                </a>
            ) : (
                <div className={`flex flex-row gap-1 ${(item.isFile && !isConnected) || (item.isView && isOther) ? 'opacity-30': 'opacity-100'}`}>
                    {/** Image */}
                    {item.iconImage && <img src={item.iconImage} alt={t('menuicon')} />}
                    <span className="whitespace-nowrap pl-2">{item.label}</span>
                </div>
            )}
        </>
    );
}

export default MenuItem;