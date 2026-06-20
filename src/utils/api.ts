/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Safe frontend helper containing API fetch requests and global localStorage state
export const TOKEN_KEY = 'olajos_auth_token';
export const USER_KEY = 'olajos_user_payload';
export const CART_KEY = 'olajos_cart_items';

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant_id?: string;
  variant_name?: string;
  customization_notes?: string;
  options?: { option_id: string; name: string; price: number }[];
}

export const api = {
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  getUser: () => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  setAuth: (token: string, user: any) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  request: async (endpoint: string, options: RequestInit = {}) => {
    const token = api.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Neznáma chyba na serveri' }));
      throw new Error(err.error || 'Nastala chyba pri spracovaní požiadavky');
    }

    return res.json();
  }
};
