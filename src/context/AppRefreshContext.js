import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { productCategories, products } from '../data/products';
import { submittedManuals } from '../content/contentRegistry';
import { getCatalogIndex } from '../services/catalogContentService';
import { getCompletedWorkbooks, getCurrentUser, getDrafts } from '../storage/storage';

const AppRefreshContext = createContext({
  refreshVersion: 0,
  isRefreshing: false,
  refreshAppData: async () => {},
  registerRefreshHandler: () => () => {},
});

export function AppRefreshProvider({ children }) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handlersRef = useRef(new Set());

  const registerRefreshHandler = useCallback((handler) => {
    if (typeof handler !== 'function') return () => {};
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  const refreshAppData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        getCurrentUser(),
        getDrafts(),
        getCompletedWorkbooks(),
      ]);
      getCatalogIndex();
      void productCategories.length;
      void products.length;
      void Object.keys(submittedManuals).length;

      const handlers = Array.from(handlersRef.current);
      for (const handler of handlers) {
        await handler();
      }
      setRefreshVersion((version) => version + 1);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const value = useMemo(() => ({
    refreshVersion,
    isRefreshing,
    refreshAppData,
    registerRefreshHandler,
  }), [isRefreshing, refreshAppData, refreshVersion, registerRefreshHandler]);

  return <AppRefreshContext.Provider value={value}>{children}</AppRefreshContext.Provider>;
}

export function useAppRefresh() {
  return useContext(AppRefreshContext);
}
