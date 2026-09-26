import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const readInitial = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('rentflow_sidebar_open') === '1';
};

const persist = (open: boolean) => {
  localStorage.setItem('rentflow_sidebar_open', open ? '1' : '0');
};

const useUiStore = create<UiState>((set) => ({
  sidebarOpen: readInitial(),
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarOpen;
      persist(next);
      return { sidebarOpen: next };
    }),
  setSidebarOpen: (open) => {
    persist(open);
    set({ sidebarOpen: open });
  },
}));

export default useUiStore;
