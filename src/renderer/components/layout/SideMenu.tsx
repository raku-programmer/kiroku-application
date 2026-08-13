import logoWordmark from '@renderer/assets/logo-wordmark.svg';
import { MenuIcon } from '@renderer/components/icons/Icons';
import { LABELS } from '@renderer/constants/labels';
import { NAVIGATION_ITEMS, type ScreenId } from '@renderer/constants/navigation';
import './SideMenu.css';

interface SideMenuProps {
  currentScreenId: ScreenId;
  collapsed: boolean;
  onSelect: (screenId: ScreenId) => void;
  onToggle: () => void;
}

export const SideMenu = ({
  currentScreenId,
  collapsed,
  onSelect,
  onToggle,
}: SideMenuProps): JSX.Element => (
  <nav
    className={`side-menu${collapsed ? ' side-menu--collapsed' : ''}`}
    aria-label={LABELS.app.name}
  >
    <div className="side-menu__head">
      <button
        type="button"
        className="side-menu__toggle"
        onClick={onToggle}
        aria-label={collapsed ? LABELS.nav.toggleOpen : LABELS.nav.toggleClose}
        aria-expanded={!collapsed}
        title={collapsed ? LABELS.nav.toggleOpen : LABELS.nav.toggleClose}
      >
        <MenuIcon />
      </button>
      {!collapsed && (
        <div className="side-menu__brand">
          {/* ロゴがアプリ名そのものなので、代替テキストにも名前を入れる */}
          <img className="side-menu__logo" src={logoWordmark} alt={LABELS.app.name} />
        </div>
      )}
    </div>

    <ul className="side-menu__list">
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;
        const isCurrent = item.id === currentScreenId;
        return (
          <li key={item.id}>
            <button
              type="button"
              className={`side-menu__item${isCurrent ? ' side-menu__item--active' : ''}`}
              onClick={() => onSelect(item.id)}
              aria-current={isCurrent ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon />
              <span className="side-menu__item-label">{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
