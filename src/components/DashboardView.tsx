import React, { useState } from 'react';
import { Quotation, InstallationJob, ServiceJob, AuditLog } from '../types';
import { fmt, qtId, parseThaiDate } from '../utils/formatters';
import {
  FileCheck2,
  Wrench,
  Headphones,
  AlertOctagon,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  Percent,
  FileText,
  Clock3,
  XCircle,
  HelpCircle,
  MapPin,
  Camera,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  quotations: Quotation[];
  installations: InstallationJob[];
  services: ServiceJob[];
  auditLogs: AuditLog[];
  onSelectTab: (tab: string) => void;
}

type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom_date' | 'custom_range';

export const DashboardView: React.FC<DashboardViewProps> = ({
  quotations,
  installations,
  services,
  auditLogs,
  onSelectTab
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateInFilter = (dateObj: Date | null, filter: DateFilterType) => {
    if (!dateObj) return true; // if cannot parse, include it by default
    if (filter === 'all') return true;
    
    const targetDate = new Date(dateObj);
    targetDate.setHours(0, 0, 0, 0);

    if (filter === 'today') {
      return targetDate.getTime() === today.getTime();
    }
    if (filter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return targetDate.getTime() === yesterday.getTime();
    }
    if (filter === 'week') {
      // From exactly 7 days ago to today
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return targetDate >= weekAgo && targetDate <= today;
    }
    if (filter === 'month') {
      return targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear();
    }
    if (filter === 'year') {
      return targetDate.getFullYear() === today.getFullYear();
    }
    if (filter === 'custom_date') {
      if (!startDate) return true;
      const [sY, sM, sD] = startDate.split('-').map(Number);
      const sObj = new Date(sY, sM - 1, sD);
      sObj.setHours(0, 0, 0, 0);
      return targetDate.getTime() === sObj.getTime();
    }
    if (filter === 'custom_range') {
      let isMatch = true;
      if (startDate) {
        const [sY, sM, sD] = startDate.split('-').map(Number);
        const sObj = new Date(sY, sM - 1, sD);
        sObj.setHours(0, 0, 0, 0);
        if (targetDate < sObj) isMatch = false;
      }
      if (endDate) {
        const [eY, eM, eD] = endDate.split('-').map(Number);
        const eObj = new Date(eY, eM - 1, eD);
        eObj.setHours(23, 59, 59, 999);
        if (targetDate > eObj) isMatch = false;
      }
      return isMatch;
    }
    return true;
  };

  // 1. Filter all quotations by selected date range first
  const allFilteredQuotations = quotations.filter(q => {
    const d = parseThaiDate(q.meta.date);
    return isDateInFilter(d, dateFilter);
  });

  // 2. Categorize quotations by status
  const approvedQuotations = allFilteredQuotations.filter(q => q.meta.status === 'Approved');
  const pendingQuotations = allFilteredQuotations.filter(q => q.meta.status === 'Pending');
  const draftQuotations = allFilteredQuotations.filter(q => q.meta.status === 'Draft');
  const cancelledQuotations = allFilteredQuotations.filter(q => q.meta.status === 'Cancelled');

  // Helper calculation for before VAT (total), VAT (vat), and grand total (grand)
  const calcTotals = (list: Quotation[]) => {
    const beforeVat = list.reduce((sum, q) => sum + (q.calc?.total || 0), 0);
    const vat = list.reduce((sum, q) => sum + (q.calc?.vat || 0), 0);
    const grand = list.reduce((sum, q) => sum + (q.calc?.grand || ((q.calc?.total || 0) + (q.calc?.vat || 0))), 0);
    return { beforeVat, vat, grand, count: list.length };
  };

  const totalAll = calcTotals(allFilteredQuotations);
  const totalApproved = calcTotals(approvedQuotations);
  const totalPending = calcTotals(pendingQuotations);
  const totalDraft = calcTotals(draftQuotations);
  const totalCancelled = calcTotals(cancelledQuotations);

  const pendingAndOthers = {
    beforeVat: totalAll.beforeVat - totalApproved.beforeVat,
    grand: totalAll.grand - totalApproved.grand,
    count: totalAll.count - totalApproved.count
  };

  // Win rate and ratios
  const winRatePct = totalAll.count > 0 ? (totalApproved.count / totalAll.count) * 100 : 0;
  const approvedValueRatio = totalAll.beforeVat > 0 ? (totalApproved.beforeVat / totalAll.beforeVat) * 100 : 0;

  const activeInstallations = installations.filter(i => i.progress < 100);
  const activeServices = services.filter(s => s.progress < 100);

  const findQt = (uid: string) => quotations.find(q => q.uid === uid);

  const urgentTasks: { type: string; ref: string; endDate: string; days: number; progress: number }[] = [];

  installations.forEach(ins => {
    if (ins.progress < 100 && ins.endDate) {
      const days = Math.ceil((new Date(ins.endDate).getTime() - today.getTime()) / 86400000);
      if (days <= 2) {
        const q = findQt(ins.qtRef);
        urgentTasks.push({
          type: 'งานติดตั้ง',
          ref: q ? qtId(q) : ins.id,
          endDate: ins.endDate,
          days,
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
          endDate: srv.endDate,
          days,
          progress: srv.progress
        });
      }
    }
  });

  // Installation breakdown counts
  const pendingCount = installations.filter(i => i.progress < 50).length;
  const inProgressCount = installations.filter(i => i.progress >= 50 && i.progress < 100).length;
  const completedCount = installations.filter(i => i.progress === 100).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dashboard Header with Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">ภาพรวมโครงการ & สรุปผลบริหารงาน</h2>
            <p className="text-xs text-slate-500">ข้อมูลเปรียบเทียบยอดเสนอราคา อนุมัติ และอัตราปิดงานสำเร็จ</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer min-w-[120px]"
            >
              <option value="all">ทั้งหมด (All Time)</option>
              <option value="today">วันนี้</option>
              <option value="yesterday">เมื่อวาน</option>
              <option value="week">สัปดาห์นี้ (7 วันล่าสุด)</option>
              <option value="month">เดือนนี้</option>
              <option value="year">ปีนี้</option>
              <option value="custom_date">เลือกระบุวันที่</option>
              <option value="custom_range">เลือกช่วงวันที่</option>
            </select>
          </div>

          {dateFilter === 'custom_date' && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-600">วันที่:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              />
            </div>
          )}

          {dateFilter === 'custom_range' && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-600">เริ่มต้น:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              />
              <span className="font-semibold text-slate-600">ถึง:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick Action: New On-Site GPS & AI Routing Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-white/10 backdrop-blur-xs rounded-xl text-emerald-300 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500 text-slate-900">
                ฟังก์ชันใหม่
              </span>
              <h3 className="font-bold text-base text-white">
                ระบบพิกัดหน้างาน Google Maps & เช็คอินช่างพร้อมรูปถ่าย (GPS Check-in)
              </h3>
            </div>
            <p className="text-xs text-slate-200 mt-1 max-w-2xl">
              จัดพิกัดโครงการบนแผนที่ Google Maps, ให้ช่างถ่ายรูปเช็คอินเข้าหน้างานตรวจสอบ Geofence และมี AI ช่วยวิเคราะห์เส้นทางประหยัดน้ำมัน
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectTab('site-tracking')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-emerald-700" />
          <span>เปิดระบบเช็คอิน & แผนที่</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* Approved Revenue Card */}
        <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-800 p-4 rounded-xl shadow-md text-white border border-emerald-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
              ยอดอนุมัติแล้ว (Approved)
            </span>
            <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-1 text-white">
            ฿{fmt(totalApproved.beforeVat)}
          </p>
          <div className="mt-2 text-[11px] text-slate-300 space-y-0.5 border-t border-slate-700/80 pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">รวม VAT 7%:</span>
              <span className="font-semibold text-emerald-300">฿{fmt(totalApproved.grand)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>อนุมัติแล้ว:</span>
              <span className="font-bold text-white">{totalApproved.count} โครงการ ({approvedValueRatio.toFixed(1)}% ของมูลค่ารวม)</span>
            </div>
          </div>
        </div>

        {/* Total Proposed Revenue Card (All Statuses) */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-4 rounded-xl shadow-md text-white border border-indigo-700/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
              ยอดเสนอราคาทั้งหมด
            </span>
            <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-1 text-white">
            ฿{fmt(totalAll.beforeVat)}
          </p>
          <div className="mt-2 text-[11px] text-slate-300 space-y-0.5 border-t border-slate-700/80 pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">รวม VAT 7%:</span>
              <span className="font-semibold text-indigo-300">฿{fmt(totalAll.grand)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>เสนอรวมทั้งหมด:</span>
              <span className="font-bold text-white">{totalAll.count} โครงการ (ทุกสถานะ)</span>
            </div>
          </div>
        </div>

        {/* Project Win Rate & Conversion Card */}
        <div
          onClick={() => onSelectTab('design-purchase')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                โครงการอนุมัติ / ทั้งหมด
              </span>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded group-hover:scale-105 transition">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {totalApproved.count} <span className="text-sm font-normal text-slate-500">/ {totalAll.count}</span>
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                {winRatePct.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              คิดเป็นอัตราปิดงานอนุมัติ (Win Rate)
            </p>
          </div>
          <div className="text-[11px] text-blue-600 mt-2 flex items-center justify-between font-medium pt-2 border-t border-slate-100">
            <span>ดูรายการใบเสนอราคา</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Active Installations Card */}
        <div
          onClick={() => onSelectTab('installation')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                งานติดตั้งกำลังดำเนินการ
              </span>
              <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded group-hover:scale-105 transition">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-1 text-slate-900">
              {activeInstallations.length} <span className="text-xs font-normal text-slate-500">งาน</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              จากทั้งหมด {installations.length} โครงการ
            </p>
          </div>
          <div className="text-[11px] text-cyan-600 mt-2 flex items-center justify-between font-medium pt-2 border-t border-slate-100">
            <span>จัดการงานติดตั้ง</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Urgent Tasks Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                งานเร่งด่วน (≤ 2 วัน)
              </span>
              <div className="p-1.5 bg-orange-50 text-orange-500 rounded">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-500">
              {urgentTasks.length} <span className="text-xs font-normal text-slate-500">รายการ</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              ต้องติดตามส่งมอบงานใกล้ชิด
            </p>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-medium pt-2 border-t border-slate-100">
            {activeServices.length} งาน Service กำลังดูแล
          </div>
        </div>
      </div>

      {/* Executive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Financial Comparison (Approved vs Proposed/Pending) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                เปรียบเทียบมูลค่ายอดเงินเสนอราคา (Approved vs Proposed)
              </h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                บาท (THB)
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              เปรียบเทียบมูลค่ารวมของงานที่ <span className="font-bold text-emerald-700">อนุมัติแล้ว</span> กับ <span className="font-bold text-amber-700">รออนุมัติ / อื่นๆ</span> ทั้งแบบก่อน VAT และรวม VAT
            </p>

            {/* Visual Bar Comparisons */}
            <div className="space-y-5">
              
              {/* Approved Bar */}
              <div>
                <div className="flex justify-between items-baseline mb-1 text-xs">
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    อนุมัติแล้ว ({totalApproved.count} โครงการ)
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 text-sm">฿{fmt(totalApproved.beforeVat)}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5">(รวม VAT: ฿{fmt(totalApproved.grand)})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(approvedValueRatio, totalAll.beforeVat > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <div className="text-[10px] text-emerald-600 text-right font-medium mt-0.5">
                  คิดเป็น {approvedValueRatio.toFixed(1)}% ของมูลค่าเสนอราคาทั้งหมด
                </div>
              </div>

              {/* Pending / Draft Bar */}
              <div>
                <div className="flex justify-between items-baseline mb-1 text-xs">
                  <span className="font-bold text-amber-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    รออนุมัติ / ร่างเอกสาร ({totalPending.count + totalDraft.count} โครงการ)
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-amber-700 text-sm">฿{fmt(totalPending.beforeVat + totalDraft.beforeVat)}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5">(รวม VAT: ฿{fmt(totalPending.grand + totalDraft.grand)})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        totalAll.beforeVat > 0
                          ? ((totalPending.beforeVat + totalDraft.beforeVat) / totalAll.beforeVat) * 100
                          : 0
                      }%`
                    }}
                  />
                </div>
                <div className="text-[10px] text-amber-600 text-right font-medium mt-0.5">
                  คิดเป็น {totalAll.beforeVat > 0 ? (((totalPending.beforeVat + totalDraft.beforeVat) / totalAll.beforeVat) * 100).toFixed(1) : 0}% ของมูลค่าเสนอราคาทั้งหมด
                </div>
              </div>

              {/* Cancelled Bar */}
              {totalCancelled.count > 0 && (
                <div>
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <span className="font-semibold text-rose-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                      ยกเลิก / ไม่ผ่าน ({totalCancelled.count} โครงการ)
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-rose-700 text-sm">฿{fmt(totalCancelled.beforeVat)}</span>
                      <span className="text-slate-400 text-[11px] ml-1.5">(รวม VAT: ฿{fmt(totalCancelled.grand)})</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex p-0.5 border border-slate-200">
                    <div
                      className="bg-rose-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          totalAll.beforeVat > 0
                            ? (totalCancelled.beforeVat / totalAll.beforeVat) * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Financial Summary Box Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-xl flex flex-wrap justify-between items-center text-xs gap-2">
            <div>
              <span className="text-slate-500 block">มูลค่าเสนอราคารวมทั้งหมด (ไม่รวม VAT):</span>
              <span className="font-extrabold text-slate-800 text-sm">฿{fmt(totalAll.beforeVat)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">มูลค่าเสนอราคารวมทั้งหมด (รวม VAT 7%):</span>
              <span className="font-extrabold text-indigo-700 text-sm">฿{fmt(totalAll.grand)}</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Project Breakdown & Win Rate Ratio */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                สัดส่วนโครงการ & อัตราการอนุมัติ (Win Rate Ratio)
              </h3>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                Win Rate: {winRatePct.toFixed(1)}%
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              วิเคราะห์จำนวนโครงการทั้งหมด <span className="font-bold text-slate-800">{totalAll.count} โครงการ</span> แยกตามสถานะการพิจารณา
            </p>

            {/* Stacked Percentage Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-slate-100 rounded-xl h-5 overflow-hidden flex p-1 border border-slate-200 gap-0.5 shadow-inner">
                {totalApproved.count > 0 && (
                  <div
                    title={`อนุมัติแล้ว: ${totalApproved.count} โครงการ`}
                    className="bg-emerald-500 h-full rounded-l transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ width: `${(totalApproved.count / Math.max(totalAll.count, 1)) * 100}%` }}
                  >
                    {totalAll.count > 0 && Math.round((totalApproved.count / totalAll.count) * 100)}%
                  </div>
                )}
                {totalPending.count > 0 && (
                  <div
                    title={`รออนุมัติ: ${totalPending.count} โครงการ`}
                    className="bg-amber-400 h-full transition-all duration-500 flex items-center justify-center text-[10px] text-amber-950 font-bold"
                    style={{ width: `${(totalPending.count / Math.max(totalAll.count, 1)) * 100}%` }}
                  >
                    {totalAll.count > 0 && Math.round((totalPending.count / totalAll.count) * 100)}%
                  </div>
                )}
                {totalDraft.count > 0 && (
                  <div
                    title={`ร่างเอกสาร: ${totalDraft.count} โครงการ`}
                    className="bg-slate-400 h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ width: `${(totalDraft.count / Math.max(totalAll.count, 1)) * 100}%` }}
                  >
                    {totalAll.count > 0 && Math.round((totalDraft.count / totalAll.count) * 100)}%
                  </div>
                )}
                {totalCancelled.count > 0 && (
                  <div
                    title={`ยกเลิก: ${totalCancelled.count} โครงการ`}
                    className="bg-rose-400 h-full rounded-r transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ width: `${(totalCancelled.count / Math.max(totalAll.count, 1)) * 100}%` }}
                  >
                    {totalAll.count > 0 && Math.round((totalCancelled.count / totalAll.count) * 100)}%
                  </div>
                )}
              </div>
            </div>

            {/* Status Breakdown List */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-800">อนุมัติแล้ว (Approved)</div>
                    <div className="text-[11px] text-emerald-700 font-medium">{totalApproved.count} โครงการ</div>
                  </div>
                </div>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {totalAll.count > 0 ? ((totalApproved.count / totalAll.count) * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="font-bold text-slate-800">รออนุมัติ (Pending)</div>
                    <div className="text-[11px] text-amber-700 font-medium">{totalPending.count} โครงการ</div>
                  </div>
                </div>
                <span className="font-extrabold text-amber-700 text-sm">
                  {totalAll.count > 0 ? ((totalPending.count / totalAll.count) * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="font-bold text-slate-800">ร่างเอกสาร (Draft)</div>
                    <div className="text-[11px] text-slate-600 font-medium">{totalDraft.count} โครงการ</div>
                  </div>
                </div>
                <span className="font-extrabold text-slate-700 text-sm">
                  {totalAll.count > 0 ? ((totalDraft.count / totalAll.count) * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <div>
                    <div className="font-bold text-slate-800">ยกเลิก (Cancelled)</div>
                    <div className="text-[11px] text-rose-700 font-medium">{totalCancelled.count} โครงการ</div>
                  </div>
                </div>
                <span className="font-extrabold text-rose-700 text-sm">
                  {totalAll.count > 0 ? ((totalCancelled.count / totalAll.count) * 100).toFixed(1) : 0}%
                </span>
              </div>

            </div>
          </div>

          {/* Win Rate Executive Key Metric Note */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
            <span>การคำนวณอัตราอนุมัติผลงาน:</span>
            <span className="font-semibold text-slate-800">
              {totalApproved.count} จาก {totalAll.count} โครงการเสนอราคา ({winRatePct.toFixed(1)}%)
            </span>
          </div>
        </div>

      </div>

      {/* Main Grid: Status Progress & Urgent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Installation Progress Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-600" />
            สรุปสถานะความคืบหน้างานติดตั้งโครงการ
          </h3>

          <div className="space-y-4 my-auto">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">รอดำเนินการช่วงแรก (&lt; 50%)</span>
                <span>{pendingCount} งาน</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      installations.length
                        ? Math.round((pendingCount / installations.length) * 100)
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700">กำลังดำเนินการ (≥ 50%)</span>
                <span>{inProgressCount} งาน</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      installations.length
                        ? Math.round((inProgressCount / installations.length) * 100)
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">เสร็จสิ้น 100%</span>
                <span>{completedCount} งาน</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      installations.length
                        ? Math.round((completedCount / installations.length) * 100)
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t text-xs text-slate-500 flex justify-between items-center">
            <span>รวมงานติดตั้งทั้งหมด</span>
            <span className="font-bold text-slate-800 text-sm">
              {installations.length} โครงการ
            </span>
          </div>
        </div>

        {/* Urgent Tasks List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              งานที่ต้องติดตามเร่งด่วน
            </span>
            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
              {urgentTasks.length} รายการ
            </span>
          </h3>

          <div className="overflow-x-auto flex-1">
            {urgentTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 my-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <div className="text-xs font-semibold text-slate-600">
                  ไม่มีงานค้างเร่งด่วน!
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ทุกงานดำเนินตามแผนระยะเวลาปกติ
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                    <th className="p-2.5 font-semibold">ประเภท</th>
                    <th className="p-2.5 font-semibold">อ้างอิงโปรเจกต์</th>
                    <th className="p-2.5 font-semibold">กำหนดเสร็จ</th>
                    <th className="p-2.5 font-semibold text-center">คืบหน้า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {urgentTasks.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border">
                          {t.type}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {t.ref}
                      </td>
                      <td
                        className={`p-2.5 font-medium ${
                          t.days <= 0 ? 'text-rose-600 font-bold' : 'text-slate-600'
                        }`}
                      >
                        {t.endDate} ({t.days < 0 ? `เลย ${Math.abs(t.days)} วัน` : `${t.days} วัน`})
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                          {t.progress}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Recent Audit Activities Feed */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-3 flex items-center justify-between">
          <span>ประวัติกิจกรรมล่าสุดในระบบ (Audit Feed)</span>
          <button
            onClick={() => onSelectTab('audit')}
            className="text-xs text-cyan-600 hover:text-cyan-800 font-semibold flex items-center gap-1"
          >
            ดูประวัติทั้งหมด <ArrowRight className="w-3 h-3" />
          </button>
        </h3>

        <div className="space-y-3">
          {auditLogs.slice(0, 5).map(log => (
            <div
              key={log.id}
              className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between text-xs"
            >
              <div>
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[9px] font-bold">
                    {log.category}
                  </span>
                  <span>{log.action}</span>
                </div>
                <div className="text-slate-500 mt-1">{log.details}</div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block font-mono">
                  {log.timestamp}
                </span>
                <span className="text-[10px] font-medium text-cyan-700">
                  {log.name} ({log.role})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

