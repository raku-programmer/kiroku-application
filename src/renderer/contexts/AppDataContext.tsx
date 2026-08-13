import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, unwrap } from '@renderer/api/client';
import { DEFAULT_SETTINGS } from '@shared/constants/setting-keys';
import type { AppSettings } from '@shared/types/settings';
import type { AccountCategory, PaymentMethod, PresetBundle } from '@shared/types/preset';

interface AppDataContextValue {
  /** 初期データ（設定・プリセット）の読み込みが終わったか */
  initialized: boolean;
  settings: AppSettings;
  accountCategories: AccountCategory[];
  paymentMethods: PaymentMethod[];
  /** 入力フォームで選択できる（有効な）プリセットのみ */
  activeAccountCategories: AccountCategory[];
  activePaymentMethods: PaymentMethod[];
  reloadPresets: () => Promise<void>;
  applySettings: (settings: AppSettings) => void;
  applyPresets: (presets: PresetBundle) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [initialized, setInitialized] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [presets, setPresets] = useState<PresetBundle>({
    accountCategories: [],
    paymentMethods: [],
  });

  const reloadPresets = useCallback(async () => {
    setPresets(await unwrap(api.presets.list()));
  }, []);

  useEffect(() => {
    let canceled = false;
    const load = async (): Promise<void> => {
      const [loadedSettings, loadedPresets] = await Promise.all([
        unwrap(api.settings.get()),
        unwrap(api.presets.list()),
      ]);
      if (canceled) {
        return;
      }
      setSettings(loadedSettings);
      setPresets(loadedPresets);
      setInitialized(true);
    };
    void load();
    return () => {
      canceled = true;
    };
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      initialized,
      settings,
      accountCategories: presets.accountCategories,
      paymentMethods: presets.paymentMethods,
      activeAccountCategories: presets.accountCategories.filter((item) => item.isActive),
      activePaymentMethods: presets.paymentMethods.filter((item) => item.isActive),
      reloadPresets,
      applySettings: setSettings,
      applyPresets: setPresets,
    }),
    [initialized, settings, presets, reloadPresets],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = (): AppDataContextValue => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData は AppDataProvider の内側で使用してください。');
  }
  return context;
};
