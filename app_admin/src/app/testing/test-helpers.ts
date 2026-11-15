// Helpers shared by the unit tests (not part of the application build).
import { BROWSER_STORAGE } from '../storage';

/** An unsigned token with the given claims. Signatures are only checked by the API. */
export function fakeToken(claims: Record<string, unknown>): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.test-signature`;
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

export const adminToken = () =>
  fakeToken({ sub: 'a1', email: 'admin@travlr.test', name: 'Admin', role: 'admin', exp: inOneHour() });
export const customerToken = () =>
  fakeToken({ sub: 'c1', email: 'customer@travlr.test', name: 'Customer', role: 'customer', exp: inOneHour() });
export const expiredAdminToken = () =>
  fakeToken({ sub: 'a1', email: 'admin@travlr.test', name: 'Admin', role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 });

/** In-memory replacement for localStorage, so tests never touch the real browser storage. */
export function createMemoryStorage(initialToken?: string) {
  const data = new Map<string, string>();
  if (initialToken) {
    data.set('travlr-token', initialToken);
  }
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

export const storageProvider = (token?: string) =>
  ({ provide: BROWSER_STORAGE, useValue: createMemoryStorage(token) });

export const sampleTrip = {
  _id: '65f0c0ffee0000000000abcd',
  code: 'GALR210214',
  name: 'Gale Reef',
  length: '4 nights / 5 days',
  start: '2021-02-14T08:00:00.000Z' as unknown as Date,
  resort: 'Emerald Bay, 3 stars',
  perPerson: '799.00',
  image: 'reef1.jpg',
  description: '<p>Gale Reef</p>'
};
