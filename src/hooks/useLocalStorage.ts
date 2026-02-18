'use client';

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // This effect runs once on mount to read from localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.log(error);
    }
  }, [key]);

  // This effect runs whenever the stored value changes to update localStorage
  useEffect(() => {
    try {
      const serializedValue = JSON.stringify(storedValue);
      const item = window.localStorage.getItem(key);
      if (serializedValue !== item) {
        window.localStorage.setItem(key, serializedValue);
      }
    } catch (error) {
      console.log(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
