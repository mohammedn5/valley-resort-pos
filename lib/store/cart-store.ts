"use client";

import { create } from "zustand";

export type CartItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (product: { id: string; name: string; price: number }) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.productId === product.id);

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1 },
        ],
      };
    }),

  incrementItem: (productId) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    })),

  decrementItem: (productId) =>
    set((state) => ({
      items: state.items
        .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    })),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),

  clear: () => set({ items: [] }),
}));

// دوال اشتقاق بسيطة، تُستخدم كـ selectors بدلاً من تخزين قيم محسوبة داخل الحالة
export function selectCartTotalAmount(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function selectCartTotalQuantity(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.quantity, 0);
}
