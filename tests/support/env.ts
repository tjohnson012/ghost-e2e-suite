export const BASE_URL = process.env.GHOST_URL ?? 'http://localhost:2368';
export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';
export const ADMIN = {
  email: process.env.GHOST_ADMIN_EMAIL ?? 'qa-admin@example.com',
  password: process.env.GHOST_ADMIN_PASSWORD ?? 'Staging-Pass-2026!',
};
export const ADMIN_STATE = '.auth/admin.json';
