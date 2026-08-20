import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ROLE_CONFIG, thaiToday } from '../utils/formatters';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit2,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

interface UserManagementViewProps {
  users: User[];
  currentUser: User | null;
  onAddUser: (user: User, password: string) => void;
  onToggleUserActive: (userId: string) => void;
  onChangeUserRole: (userId: string, newRole: UserRole) => void;
  onResetPassword: (userId: string, newPass: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onToggleUserActive,
  onChangeUserRole,
  onResetPassword
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // New User Form State
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [password, setPassword] = useState('123456');
  const [formError, setFormError] = useState('');

  // Role Edit State
  const [newRole, setNewRole] = useState<UserRole>('sales');

  // Reset Password State
  const [newPassword, setNewPassword] = useState('123456');

  const handleOpenAddModal = () => {
    setUsername('');
    setName('');
    setEmail('');
    setRole('sales');
    setPassword('123456');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUsername = username.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      setFormError('ชื่อผู้ใช้งาน (Username) นี้มีอยู่ในระบบแล้ว');
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      username: cleanUsername,
      name: name.trim(),
      email: email.trim(),
      role,
      active: true,
      createdAt: thaiToday()
    };

    onAddUser(newUser, password);
    setIsAddModalOpen(false);
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      onChangeUserRole(selectedUser.id, newRole);
    }
    setIsRoleModalOpen(false);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && newPassword.trim()) {
      onResetPassword(selectedUser.id, newPassword.trim());
    }
    setIsResetModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            การจัดการสิทธิ์ผู้ใช้งาน (User & Role Management)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการบัญชีผู้ใช้งาน เปิด/ปิดการใช้งาน กำหนดระดับสิทธิ์ (Admin, Sales, Engineer, Viewer) และรีเซ็ตรหัสผ่าน
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          + เพิ่มผู้ใช้งานใหม่ (เปิด User)
        </button>
      </div>

      {/* Role Descriptions Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="font-bold text-purple-900 flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-600 rounded-full" />
            Admin (ผู้ดูแลระบบ)
          </div>
          <div className="text-[11px] text-purple-700 mt-1">
            สิทธิ์สูงสุด จัดการ User, ดู Audit Logs, แก้ไข BOQ/งานติดตั้ง/คลัง/Service
          </div>
        </div>

        <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
          <div className="font-bold text-cyan-900 flex items-center gap-1">
            <span className="w-2 h-2 bg-cyan-600 rounded-full" />
            Sales (ฝ่ายขาย / BOQ)
          </div>
          <div className="text-[11px] text-cyan-700 mt-1">
            สร้างและเสนอราคา BOQ, ติดตามการสั่งซื้อสินค้า, ดูคลังสินค้า
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="font-bold text-blue-900 flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-600 rounded-full" />
            Engineer (วิศวกร/ช่าง)
          </div>
          <div className="text-[11px] text-blue-700 mt-1">
            จัดการ checklist งานติดตั้ง, เบิกอะไหล่ service, อัปเดตความคืบหน้า
          </div>
        </div>

        <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <span className="w-2 h-2 bg-slate-600 rounded-full" />
            Viewer (ผู้ดูอย่างเดียว)
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            ดูภาพรวม Dashboard, BOQ, งานติดตั้ง และคลังสินค้า โดยแก้ไขไม่ได้
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-xs font-semibold border-b border-slate-200">
                <th className="p-4">ผู้ใช้งาน (Username)</th>
                <th className="p-4">ชื่อ - นามสกุล</th>
                <th className="p-4">อีเมล</th>
                <th className="p-4">ระดับสิทธิ์ (Role)</th>
                <th className="p-4 text-center">สถานะใช้งาน</th>
                <th className="p-4 text-center">เข้าใช้งานล่าสุด</th>
                <th className="p-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.map(u => {
                const rInfo = ROLE_CONFIG[u.role];
                const isSelf = currentUser?.id === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center font-bold text-xs">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                      {isSelf && (
                        <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.2 rounded font-normal">
                          คุณ
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {u.name}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {u.email || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${rInfo.bg}`}>
                        {rInfo.th}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => !isSelf && onToggleUserActive(u.id)}
                        disabled={isSelf}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        } ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {u.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            เปิดใช้งาน
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" />
                            ปิดใช้งาน
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center text-slate-400 font-mono text-[11px]">
                      {u.lastLogin || 'ยังไม่เคยล็อกอิน'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewRole(u.role);
                            setIsRoleModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                          title="เปลี่ยนระดับสิทธิ์"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewPassword(`${u.username}123`);
                            setIsResetModalOpen(true);
                          }}
                          className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs"
                          title="รีเซ็ตรหัสผ่าน"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-scale-up">
            <div className="bg-purple-900 text-white p-4 font-bold text-sm flex justify-between items-center">
              <span>เพิ่มผู้ใช้งานใหม่ (เปิด User ในระบบ)</span>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-purple-200 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน (Username สำหรับใช้ Login)
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="เช่น somchai"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="นายสมชาย บัวทอง"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อีเมล (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="somchai@pacengineering.co.th"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ระดับสิทธิ์ผู้ใช้งาน (Role)
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="admin">Admin (ผู้ดูแลระบบสูงสุด)</option>
                  <option value="sales">Sales (ฝ่ายขาย / จัดทำ BOQ)</option>
                  <option value="engineer">Engineer (วิศวกร / ช่างติดตั้ง)</option>
                  <option value="viewer">Viewer (ผู้ดูอย่างเดียว)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านเริ่มต้น (Initial Password)
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  เปิด User ใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-scale-up">
            <div className="bg-slate-900 text-white p-4 font-bold text-sm">
              เปลี่ยนระดับสิทธิ์: {selectedUser.name} ({selectedUser.username})
            </div>

            <form onSubmit={handleRoleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกระดับสิทธิ์ใหม่
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="admin">Admin (ผู้ดูแลระบบสูงสุด)</option>
                  <option value="sales">Sales (ฝ่ายขาย / BOQ)</option>
                  <option value="engineer">Engineer (วิศวกร / ช่างติดตั้ง)</option>
                  <option value="viewer">Viewer (ผู้ดูอย่างเดียว)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  บันทึกระดับสิทธิ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-scale-up">
            <div className="bg-slate-900 text-white p-4 font-bold text-sm">
              รีเซ็ตรหัสผ่าน: {selectedUser.name} ({selectedUser.username})
            </div>

            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กรอกรหัสผ่านใหม่
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  ตั้งรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
