/**
 * Platform-agnostic storage interface
 * Implementations provided by web (localStorage) and mobile (AsyncStorage)
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SecureStorageAdapter extends StorageAdapter {
  // SecureStore for mobile, encrypted storage for web
}
