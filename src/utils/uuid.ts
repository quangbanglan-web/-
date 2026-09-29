/**
 * Безопасная утилита генерации UUID v4.
 * Работает как в защищенном HTTPS контексте (window.crypto.randomUUID),
 * так и в небезопасных HTTP / non-secure contexts (по IP-адресу без SSL).
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback to manual RFC4122 v4 UUID generator
    }
  }

  // Универсальный генератор UUID v4 для HTTP / non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
