import { useSyncExternalStore } from 'react';
import english from './en.json';

export type Language = 'fr' | 'en';
const key = 'haske-language';
let language: Language = 'fr';
try { if (localStorage.getItem(key) === 'en') language = 'en'; } catch { /* Storage is optional. */ }
const listeners = new Set<() => void>();
const translations: Record<string, string> = english;

export function t(text: string): string {
  return language === 'en' ? translations[text] ?? text : text;
}

function applyLanguage() { document.documentElement.lang = language; }
applyLanguage();

export function setLanguage(next: Language) {
  language = next;
  applyLanguage();
  try { localStorage.setItem(key, next); } catch { /* Keep the choice for this visit. */ }
  listeners.forEach(listener => listener());
}

window.addEventListener('storage', event => {
  if (event.key !== key) return;
  language = event.newValue === 'en' ? 'en' : 'fr';
  applyLanguage();
  listeners.forEach(listener => listener());
});

export function useLanguage() {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => language,
    () => 'fr' as Language,
  );
}
