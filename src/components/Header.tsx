import React, { useState } from 'react';
import { User, InstallationJob, ServiceJob, Quotation } from '../types';
import { ROLE_CONFIG, qtId } from '../utils/formatters';
import {
  Bell,
  LogOut,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  AlertTriangle,
  User as UserIcon,
  CheckCircle2,
  Menu
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  installations: InstallationJob[];
  services: ServiceJob[];
  quotations: Quotation[];
  onOpenSheetSync: () => void;
  activeTabTitle: string;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  installations,
  services,
  quotations,
  onOpenSheetSync,
  activeTabTitle,
  onToggleMobileMenu
}) => {
  const [showNotif, setShowNotif] = useState(false);

  // Compute urgent tasks <= 2 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const findQt = (uid: string) => quotations.find(q => q.uid === uid);

  const urgentTasks: { type: string; ref: string; days: number; endDate: string; progress: number }[] = [];

  installations.forEach(ins => {
    if (ins.progress < 100 && ins.endDate) {
      const days = Math.ceil((new Date(ins.endDate).getTime() - today.getTime()) / 86400000);
      if (days <= 2) {
        const q = findQt(ins.qtRef);
        urgentTasks.push({
          type: 'ติดตั้ง',
          ref: q ? qtId(q) : ins.id,
          days,
          endDate: ins.endDate,
          progress: ins.progress
        });
      }
    }
  });

  services.forEach(srv => {
    if (srv.progress < 100 && srv.endDate) {
      const days = Math.ceil((new Date(srv.endDate).getTime() - today.getTime()) / 86400000);
      if (days <= 2) {
        urgentTasks.push({
          type: 'Service',
          ref: srv.customer || srv.id,
          days,
          endDate: srv.endDate,
          progress: srv.progress
        });
      }
    }
  });

  const roleInfo = currentUser ? ROLE_CONFIG[currentUser.role] : null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 text-slate-800 flex items-center justify-between px-3 sm:px-6 md:px-8 z-30 shrink-0">
      <div className="flex items-center space-x-2 sm:space-x-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="xl:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-sm sm:text-base md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 truncate">
          {activeTabTitle}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* Google Sheet Sync Status Badge */}
        <button
          onClick={onOpenSheetSync}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 text-xs font-semibold transition-colors"
          title="จัดการการเชื่อมต่อ Google Sheet"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
          <span className="hidden sm:inline">Cloud Sync Active</span>
          <span className="text-[10px] opacity-60 hidden md:inline">Connected</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition relative"
            title="การแจ้งเตือนงานใกล้กำหนด"
          >
            <Bell className="w-4 h-4" />
            {urgentTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {urgentTasks.length}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-3 bg-slate-900 text-white font-semibold text-xs flex items-center justify-between border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  งานใกล้กำหนด (≤ 2 วัน)
                </span>
                <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px]">
                  {urgentTasks.length} รายการ
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto p-2 space-y-2">
                {urgentTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    ไม่มีงานที่ต้องเร่งด่วนในขณะนี้
                  </div>
                ) : (
                  urgentTasks.map((task, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs ${
                        task.days <= 0
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="font-semibold flex items-center justify-between mb-1">
                        <span>[{task.type}] {task.ref}</span>
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          คืบหน้า {task.progress}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] opacity-80">
                        <Clock className="w-3 h-3" />
                        {task.days < 0
                          ? `เลยกำหนดมาแล้ว ${Math.abs(task.days)} วัน`
                          : task.days === 0
                          ? 'กำหนดเสร็จวันนี้!'
                          : `เหลือเวลาอีก ${task.days} วัน (${task.endDate})`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Role Badge */}
        {currentUser && (
          <div className="flex items-center space-x-2.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <div className="w-7 h-7 rounded bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-bold text-blue-600 uppercase">
                {currentUser.role}
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition border border-slate-200"
          title="ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
