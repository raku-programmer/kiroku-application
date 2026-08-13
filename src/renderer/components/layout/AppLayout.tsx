import type { ReactNode } from 'react';
import {
  LoadingOverlay,
  OVERLAY_VARIANTS,
} from '@renderer/components/feedback/LoadingOverlay';
import { SideMenu } from '@renderer/components/layout/SideMenu';
import { MENU_HIGHLIGHT, SCREEN_TITLES, type ScreenId } from '@renderer/constants/navigation';
import { useLoading } from '@renderer/contexts/LoadingContext';
import './AppLayout.css';

interface AppLayoutProps {
  currentScreenId: ScreenId;
  collapsed: boolean;
  /** 画面遷移中のローディング */
  screenLoading: boolean;
  onSelectScreen: (screenId: ScreenId) => void;
  onToggleMenu: () => void;
  children: ReactNode;
}

export const AppLayout = ({
  currentScreenId,
  collapsed,
  screenLoading,
  onSelectScreen,
  onToggleMenu,
  children,
}: AppLayoutProps): JSX.Element => {
  const { isGlobalLoading, message } = useLoading();

  return (
    <div className="app-layout">
      <SideMenu
        currentScreenId={MENU_HIGHLIGHT[currentScreenId]}
        collapsed={collapsed}
        onSelect={onSelectScreen}
        onToggle={onToggleMenu}
      />

      <div className="app-layout__main">
        <header className="app-layout__header">
          <h1 className="app-layout__title">{SCREEN_TITLES[currentScreenId]}</h1>
        </header>

        <main className="app-layout__content">
          {children}
          <LoadingOverlay visible={screenLoading} variant={OVERLAY_VARIANTS.SCREEN} />
        </main>
      </div>

      <LoadingOverlay
        visible={isGlobalLoading}
        variant={OVERLAY_VARIANTS.GLOBAL}
        message={message}
      />
    </div>
  );
};
