import React from 'react';
import { User } from '../types';
import { isAdmin } from '../services/authService';
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Boxes,
  Headphones,
  Users,
  History,
  FileSpreadsheet,
  Snowflake,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const userRole = (currentUser?.role || 'viewer').toLowerCase();
  const adminAccess = isAdmin(currentUser);

  const handleSelect = (tab: string) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard ภาพรวม',
      icon: LayoutDashboard,
      roles: ['admin', 'sales', 'engineer', 'viewer']
    },
    {
      id: 'design-purchase',
      label: '1. ใบเสนอราคา / สั่งซื้อ',
      icon: FileText,
      roles: ['admin', 'sales', 'viewer']
    },
    {
      id: 'installation',
      label: '2. ติดตั้ง (งานโครงการ)',
      icon: Wrench,
      roles: ['admin', 'sales', 'engineer', 'viewer']
    },
    {
      id: 'service',
      label: '3. บริการ / เบิกอะไหล่',
      icon: Headphones,
      roles: ['admin', 'sales', 'engineer', 'viewer']
    },
    {
      id: 'inventory',
      label: 'คลังสินค้า (วัสดุเหลือ)',
      icon: Boxes,
      roles: ['admin', 'sales', 'viewer']
    }
  ];

  const visibleMenuItems = menuItems.filter(item =>
    item.roles.includes(userRole)
  );

  const adminItems = [
    {
      id: 'users',
      label: 'จัดการผู้ใช้งาน (Users)',
      icon: Users
    },
    {
      id: 'audit',
      label: 'ประวัติการแก้ไขข้อมูล',
      icon: History
    },
    {
      id: 'sheet',
      label: 'เชื่อมต่อ Google Sheet',
      icon: FileSpreadsheet
    }
  ];

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 xl:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed xl:static inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col h-screen shrink-0 border-r border-slate-800 z-50 select-none transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'
        }`}
      >
        {/* Brand Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shrink-0 shadow-sm">
              P
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                PAC Engineering
              </h1>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-medium">
                System Tracking & BOQ
              </span>
            </div>
          </div>
          {/* Close button on mobile/tablet */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="xl:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Project Operations
          </div>

          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* System & Admin Section (Only visible to Admin) */}
          {adminAccess && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Administration</span>
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              </div>

              {adminItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      Admin
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

      {/* User Info / Footer */}
      {currentUser && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border-2 border-green-500 shrink-0">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
              <p className="text-slate-400 text-[10px] truncate">{currentUser.email || currentUser.role.toUpperCase()}</p>
            </div>
          </div>
        </div>
      )}
      </aside>
    </>
  );
};
