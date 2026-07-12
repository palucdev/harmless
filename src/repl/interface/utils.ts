export const truncate = (s: string, max = 100): string => (s.length > max ? s.slice(0, max) + '…' : s);
