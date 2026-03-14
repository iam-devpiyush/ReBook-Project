'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CartItem {
    listingId: string;
    title: string;
    author: string;
    price: number;
    image?: string;
    conditionScore: number;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (listingId: string) => void;
    clearCart: () => void;
    isInCart: (listingId: string) => boolean;
    count: number;
    open: boolean;
    setOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [open, setOpen] = useState(false);

    const addItem = useCallback((item: CartItem) => {
        setItems(prev => prev.find(i => i.listingId === item.listingId) ? prev : [...prev, item]);
        setOpen(true);
    }, []);

    const removeItem = useCallback((listingId: string) => {
        setItems(prev => prev.filter(i => i.listingId !== listingId));
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const isInCart = useCallback((listingId: string) => items.some(i => i.listingId === listingId), [items]);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, clearCart, isInCart, count: items.length, open, setOpen }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
