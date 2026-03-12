/**
 * Simple file-based JSON store for users and donations.
 * Server-side only — never import this in client components.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // hex: scrypt(password, salt, 64) + ':' + salt(hex)
  createdAt: string;
}

export interface Donation {
  id: string;
  userId: string;
  username: string;
  xmrAmount: number;
  txId: string;
  note: string;
  createdAt: string;
}

function readJson<T>(file: string): T[] {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T[];
  } catch {
    return [];
  }
}

function writeJson<T>(file: string, data: T[]): void {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}

export const getUsers = (): User[] => readJson<User>('users.json');
export const saveUsers = (users: User[]): void => writeJson('users.json', users);

export const getDonations = (): Donation[] => readJson<Donation>('donations.json');
export const saveDonations = (d: Donation[]): void => writeJson('donations.json', d);
