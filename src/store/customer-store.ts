import { create } from 'zustand';

const CUSTOMER_TOKEN_KEY = 'diaz-customer-token';

export interface SavedRecipient {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  deliveryZoneId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  country: string;
  address: string;
  deliveryZoneId: string | null;
  deliveryZoneName: string | null;
  savedRecipients: SavedRecipient[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerState {
  customer: Customer | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;

  hydrate: () => void;
  setSession: (customer: Customer, token: string) => void;
  logout: () => void;
  updateCustomer: (customer: Customer) => void;
}

export const useCustomerStore = create<CustomerState>()((set) => ({
  customer: null,
  token: null,
  loading: false,
  hydrated: false,

  hydrate: () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem(CUSTOMER_TOKEN_KEY) : null;
      if (token) {
        set({ token });
        // Cargar el perfil del servidor
        fetch('/api/customers/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.customer) {
              set({ customer: data.customer, hydrated: true });
            } else {
              // Token inválido: limpiar
              localStorage.removeItem(CUSTOMER_TOKEN_KEY);
              set({ token: null, customer: null, hydrated: true });
            }
          })
          .catch(() => set({ hydrated: true }));
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  setSession: (customer, token) => {
    try {
      localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    set({ customer, token });
  },

  logout: () => {
    try {
      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    } catch {
      /* ignore */
    }
    set({ customer: null, token: null });
  },

  updateCustomer: (customer) => set({ customer }),
}));
