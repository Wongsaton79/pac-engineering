import React, { useState } from 'react';
import { AuditLog, AuditCategory } from '../types';
import { ROLE_CONFIG } from '../utils/formatters';
import {
  History,
  Search,
  Download,
  ShieldCheck,
  UserCheck,
  FileText,
  Wrench,
  Boxes,
  Headphones,
  Settings
} from 'lucide-react';

interface AuditLogViewProps {
  auditLogs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories: { key: string; label: string; icon: any }[] = [
    { key: 'ALL', label: 'ทั้งหมด', icon: History },
    { key: 'AUTH', label: 'เข้า/ออกระบบ', icon: UserCheck },
    { key: 'BOQ', label: 'ใบเสนอราคา BOQ', icon: FileText },
    { key: 'INSTALL', label: 'งานติดตั้ง', icon: Wrench },
    { key: 'INVENTORY', label: 'คลังสินค้า', icon: Boxes },
    { key: 'SERVICE', label: 'งาน Service', icon: Headphones },
    { key: 'USER', label: 'จัดการ User', icon: ShieldCheck },
    { key: 'SYSTEM', label: 'ระบบ', icon: Settings }
  ];

  const filteredLogs = auditLogs.filter(log => {
    const text = `${log.username} ${log.name} ${log.action} ${log.target} ${log.details}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || log.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Username', 'Name', 'Role', 'Category', 'Action', 'Target', 'Details'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.username}"`,
      `"${l.name}"`,
      `"${l.role}"`,
      `"${l.category}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.target.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PAC_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            ประวัติการแก้ไขข้อมูลทั้งหมด (Audit Logs)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกทุกกิจกรรมและการเปลี่ยนแปลงข้อมูลในระบบโดยผู้ใช้งานทุกระดับสำหรับ Admin ตรวจสอบ
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          Export CSV (รายงานประวัติ)
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                  isSelected
                    ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อผู้ใช้งาน, กิจกรรม, Target, หรือรายละเอียด..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-xs font-semibold border-b border-slate-200">
                <th className="p-4 w-40">วันเวลา (Timestamp)</th>
                <th className="p-4 w-44">ผู้ใช้งาน (User / Role)</th>
                <th className="p-4 w-28 text-center">หมวดหมู่</th>
                <th className="p-4 w-48">กิจกรรม (Action)</th>
                <th className="p-4">รายละเอียด (Details)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    ไม่พบประวัติการแก้ไขข้อมูลตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const rInfo = ROLE_CONFIG[log.role] || ROLE_CONFIG.viewer;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{log.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${rInfo.bg}`}>
                            {log.role.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400">({log.username})</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px] border">
                          {log.category}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {log.action}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
