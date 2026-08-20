import React, { useState } from 'react';
import { User, SystemDatabase } from '../types';
import { loginUser } from '../services/authService';
import { Snowflake, Lock, User as UserIcon, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  db: SystemDatabase;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ db, onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const result = loginUser(db, username, password);
      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    }, 250);
  };

  const handleQuickSelect = (accUsername: string, accPass: string) => {
    setUsername(accUsername);
    setPassword(accPass);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 text-center relative border-b border-slate-800">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 font-bold text-xl text-white shadow-sm">
            P
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            PAC ENGINEERING
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            ระบบจัดการฐานข้อมูลและติดตามสถานะงานโครงการ
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="เช่น admin, sales, engineer"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Login)'}
            </button>
          </form>

          {/* Demo User Selection Shortcuts */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
              เลือกบัญชีผู้ใช้ทดสอบระดับต่างๆ:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickSelect('admin', 'admin123')}
                className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-left transition font-medium"
              >
                <div className="font-bold flex items-center justify-between">
                  <span>admin</span>
                  <span className="text-[9px] bg-purple-600 text-white px-1 rounded">Admin</span>
                </div>
                <div className="text-[10px] text-purple-700 mt-0.5">ผู้ดูแลระบบสูงสุด</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('sales', 'sales123')}
                className="p-2 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-left transition font-medium"
              >
                <div className="font-bold flex items-center justify-between">
                  <span>sales</span>
                  <span className="text-[9px] bg-cyan-600 text-white px-1 rounded">Sales</span>
                </div>
                <div className="text-[10px] text-cyan-700 mt-0.5">ฝ่ายขาย / BOQ</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('engineer', 'engineer123')}
                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-left transition font-medium"
              >
                <div className="font-bold flex items-center justify-between">
                  <span>engineer</span>
                  <span className="text-[9px] bg-blue-600 text-white px-1 rounded">Tech</span>
                </div>
                <div className="text-[10px] text-blue-700 mt-0.5">วิศวกร / ช่างติดตั้ง</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('viewer', 'viewer123')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-left transition font-medium"
              >
                <div className="font-bold flex items-center justify-between">
                  <span>viewer</span>
                  <span className="text-[9px] bg-slate-600 text-white px-1 rounded">Viewer</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">ผู้ดูอย่างเดียว</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
