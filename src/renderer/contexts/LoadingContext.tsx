import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface LoadingContextValue {
  /** 画面全体を覆うローディングを表示中か */
  isGlobalLoading: boolean;
  /** 表示中のメッセージ（最後に開始したものを表示） */
  message: string | null;
  beginGlobal: (message: string) => void;
  endGlobal: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export const LoadingProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  // 複数の処理が重なってもよいように参照カウントで管理する
  const [messages, setMessages] = useState<string[]>([]);

  const beginGlobal = useCallback((message: string) => {
    setMessages((current) => [...current, message]);
  }, []);

  const endGlobal = useCallback(() => {
    setMessages((current) => current.slice(0, -1));
  }, []);

  const value = useMemo(
    () => ({
      isGlobalLoading: messages.length > 0,
      message: messages.length > 0 ? messages[messages.length - 1] : null,
      beginGlobal,
      endGlobal,
    }),
    [messages, beginGlobal, endGlobal],
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = (): LoadingContextValue => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading は LoadingProvider の内側で使用してください。');
  }
  return context;
};
