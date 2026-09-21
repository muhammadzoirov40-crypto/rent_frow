import { create } from 'zustand';

interface UIState {
  isMobileMenuOpen: boolean;
  isFilterOpen: boolean;
  toggleMobileMenu: () => void;
  toggleFilter: () => void;
  closeMobileMenu: () => void;
  closeFilter: () => void;
}

const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  isFilterOpen: false,

  toggleMobileMenu: () => {
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen }));
  },

  toggleFilter: () => {
    set((state) => ({ isFilterOpen: !state.isFilterOpen }));
  },

  closeMobileMenu: () => {
    set({ isMobileMenuOpen: false });
  },

  closeFilter: () => {
    set({ isFilterOpen: false });
  },
}));

export default useUIStore;
