import { User, UserRole, SystemDatabase } from '../types';
import { saveDatabase, logActivity } from './storageService';
import { thaiToday } from '../utils/formatters';

const ACTIVE_USER_SESSION_KEY = 'pac_eng_logged_in_user';

export function getActiveUser(): User | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_USER_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse session user:', err);
  }
  return null;
}

export function setActiveUserSession(user: User | null): void {
  if (user) {
    sessionStorage.setItem(ACTIVE_USER_SESSION_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(ACTIVE_USER_SESSION_KEY);
  }
}

export function loginUser(
  db: SystemDatabase,
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: User; error?: string } {
  const username = usernameInput.trim().toLowerCase();
  const password = passwordInput.trim();

  const user = db.users.find(u => u.username.toLowerCase() === username);

  if (!user) {
    return { success: false, error: 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ' };
  }

  if (!user.active) {
    return { success: false, error: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน กรุณาติดต่อ Admin' };
  }

  // Passwords verification (Default matching rule: username + '123' or 'admin123' / '123456')
  const validPassword = 
    (user.password && password === user.password) || 
    (!user.password && (password === `${username}123` || password === 'admin123' || password === '123456'));

  if (!validPassword) {
    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  }

  user.lastLogin = `${thaiToday()} ${new Date().toLocaleTimeString('th-TH')}`;
  saveDatabase(db);
  setActiveUserSession(user);

  logActivity(
    db,
    user.username,
    user.name,
    user.role,
    'เข้าสู่ระบบ (Login)',
    'AUTH',
    user.username,
    `ผู้ใช้งาน ${user.name} (${user.role}) เข้าสู่ระบบสำเร็จ`
  );

  return { success: true, user };
}

export function logoutUser(db: SystemDatabase, currentUser: User | null): void {
  if (currentUser) {
    logActivity(
      db,
      currentUser.username,
      currentUser.name,
      currentUser.role,
      'ออกจากระบบ (Logout)',
      'AUTH',
      currentUser.username,
      `ผู้ใช้งาน ${currentUser.name} ออกจากระบบ`
    );
  }
  setActiveUserSession(null);
}

// Permission Helpers
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

export function canManageBOQ(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'sales';
}

export function canManageInstallation(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'engineer';
}

export function canManageInventory(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'sales' || user?.role === 'engineer';
}

export function canManageService(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'engineer';
}

export function canManageUsers(user: User | null): boolean {
  return user?.role === 'admin';
}
