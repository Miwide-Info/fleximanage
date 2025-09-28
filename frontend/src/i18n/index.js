import { en } from './en';
import { zh } from './zh';

const dictionaries = { en, zh };

export function getLocale() {
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || 'en').toLowerCase();
    if (lang.startsWith('zh')) return 'zh';
  }
  return 'en';
}

export function t(path, ...args) {
  const locale = getLocale();
  const dict = dictionaries[locale] || dictionaries.en;
  const segments = path.split('.');
  let cur = dict;
  for (const s of segments) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, s)) {
      cur = cur[s];
    } else {
      cur = null;
      break;
    }
  }
  if (typeof cur === 'function') return cur(...args);
  return cur || path; // fallback to key
}

export function currentDict() {
  return dictionaries[getLocale()] || dictionaries.en;
}
