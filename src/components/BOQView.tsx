import React, { useState } from 'react';
import {
  Quotation,
  BOQItem,
  User,
  BOQNote,
  BOQSection
} from '../types';
import { fmt, parseNum, qtId, qtGrand, STATUS_CONFIG, thaiToday, parseThaiDate } from '../utils/formatters';
import { bahtText } from '../utils/bahtText';
import { canManageBOQ } from '../services/authService';
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  Printer,
  Save,
  FilePlus,
  Search,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  ListPlus,
  FolderPlus,
  Calendar,
  Filter,
  X
} from 'lucide-react';

interface BOQViewProps {
  quotations: Quotation[];
  activeDoc: Quotation | null;
  currentUser: User | null;
  onSelectDoc: (uid: string) => void;
  onSaveDoc: (doc: Quotation) => void;
  onCreateNewDoc: () => void;
  onDeleteDoc: (uid: string) => void;
}

type DateFilterType = 'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH' | 'CUSTOM';

const AutoTextarea: React.FC<{
  value: string;
  readOnly?: boolean;
  onChange?: (val: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}> = ({ value, readOnly, onChange, className = '', placeholder, rows = 1 }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.max(ref.current.scrollHeight, 20)}px`;
    }
  };

  React.useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value || ''}
      readOnly={readOnly}
      onChange={e => {
        if (onChange) onChange(e.target.value);
        adjustHeight();
      }}
      rows={rows}
      placeholder={placeholder}
      className={`w-full ed-span border-none resize-none overflow-hidden bg-transparent break-words whitespace-pre-wrap block p-0 m-0 leading-tight focus:outline-none ${className}`}
      style={{ minHeight: '1.25em' }}
    />
  );
};

export const BOQView: React.FC<BOQViewProps> = ({
  quotations,
  activeDoc,
  currentUser,
  onSelectDoc,
  onSaveDoc,
  onCreateNewDoc,
  onDeleteDoc
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [doc, setDoc] = useState<Quotation | null>(activeDoc);
  const [mobileTab, setMobileTab] = useState<'list' | 'editor'>('list');

  // Sync state if activeDoc changes externally
  React.useEffect(() => {
    setDoc(activeDoc);
  }, [activeDoc]);

  if (!doc) {
    return (
      <div className="p-12 text-center text-slate-500">
        <FilePlus className="w-12 h-12 text-cyan-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">ยังไม่มีใบเสนอราคา</h3>
        <p className="text-xs text-slate-500 mt-1">กดปุ่มสร้างใบเสนอราคาใหม่เพื่อเริ่มต้นงาน</p>
        <button
          onClick={onCreateNewDoc}
          className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-xl font-semibold text-xs shadow-md"
        >
          + สร้างใบเสนอราคาใหม่
        </button>
      </div>
    );
  }

  const isEditable = canManageBOQ(currentUser) && doc.meta.status !== 'Approved' && doc.meta.status !== 'Cancelled';
  const statusInfo = STATUS_CONFIG[doc.meta.status] || STATUS_CONFIG.Draft;

  // Date filtering logic
  const isDateInFilter = (dateObj: Date | null) => {
    if (dateFilter === 'ALL') return true;
    if (!dateObj) return true; // Include if date cannot be parsed

    const target = new Date(dateObj);
    target.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'TODAY') {
      return target.getTime() === today.getTime();
    }
    if (dateFilter === '7DAYS') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return target >= weekAgo && target <= today;
    }
    if (dateFilter === '30DAYS') {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return target >= monthAgo && target <= today;
    }
    if (dateFilter === 'THIS_MONTH') {
      return target.getMonth() === today.getMonth() && target.getFullYear() === today.getFullYear();
    }
    if (dateFilter === 'CUSTOM') {
      if (startDate) {
        const [sY, sM, sD] = startDate.split('-').map(Number);
        const sObj = new Date(sY, sM - 1, sD);
        sObj.setHours(0, 0, 0, 0);
        if (target < sObj) return false;
      }
      if (endDate) {
        const [eY, eM, eD] = endDate.split('-').map(Number);
        const eObj = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
        if (target > eObj) return false;
      }
      return true;
    }
    return true;
  };

  // Filter list
  const filteredQuotations = quotations.filter(q => {
    const qName = `${q.meta.quoteNo} ${q.customer.attn} ${q.project.line1}`.toLowerCase();
    const matchesSearch = qName.includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || q.meta.status === filterStatus;
    const qDate = parseThaiDate(q.meta.date);
    const matchesDate = isDateInFilter(qDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalFilteredGrand = filteredQuotations.reduce((sum, q) => sum + qtGrand(q), 0);

  // Calculate BOQ Totals & Discount back-computation
  const recalculateDoc = (targetDoc: Quotation): Quotation => {
    const vatR = (Number(targetDoc.vatRate) || 0) / 100;
    const items = [...targetDoc.items];

    if (targetDoc.lockGrand && items.length > 0) {
      const di = Math.min(targetDoc.discountIndex, items.length - 1);
      const grand = Math.round((Number(targetDoc.grand) || 0) * 100) / 100;
      const total = Math.round((grand / (1 + vatR)) * 100) / 100;

      let others = 0;
      items.forEach((it, i) => {
        if (i !== di) {
          const a = Math.round((Number(it.qty) || 0) * (Number(it.pricePerUnit) || 0) * 100) / 100;
          it.amount = a;
          others += a;
        }
      });

      const disc = Math.round((total - others) * 100) / 100;
      items[di].qty = 1;
      items[di].pricePerUnit = disc;
      items[di].amount = disc;

      targetDoc.calc = {
        total,
        vat: Math.round((grand - total) * 100) / 100,
        grand
      };
    } else {
      let total = 0;
      items.forEach(it => {
        const a = Math.round((Number(it.qty) || 0) * (Number(it.pricePerUnit) || 0) * 100) / 100;
        it.amount = a;
        total += a;
      });
      total = Math.round(total * 100) / 100;
      const vat = Math.round((total * vatR) * 100) / 100;
      const grand = Math.round((total + vat) * 100) / 100;

      targetDoc.calc = { total, vat, grand };
      targetDoc.grand = grand;
    }

    targetDoc.items = items;
    return targetDoc;
  };

  const updateDoc = (updated: Quotation) => {
    const recalculated = recalculateDoc({ ...updated });
    setDoc(recalculated);
    onSaveDoc(recalculated);
  };

  // Field edit handlers
  const handleFieldChange = (path: string, value: any) => {
    if (!isEditable && path !== 'meta.status') return;

    const newDoc = JSON.parse(JSON.stringify(doc)) as Quotation;
    const parts = path.split('.');
    let curr: any = newDoc;
    for (let i = 0; i < parts.length - 1; i++) {
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;

    updateDoc(newDoc);
  };

  // Item handlers
  const handleAddItem = () => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    newDoc.items.push({
      model: '',
      description: 'รายละเอียดรายการใหม่',
      qty: 1,
      unit: 'JOB',
      pricePerUnit: 0,
      amount: 0,
      ordered: false
    });
    updateDoc(newDoc);
  };

  const handleDeleteItem = (index: number) => {
    if (!isEditable || doc.items.length <= 1) return;
    const newDoc = { ...doc };
    newDoc.items.splice(index, 1);
    if (newDoc.discountIndex >= newDoc.items.length) {
      newDoc.discountIndex = Math.max(0, newDoc.items.length - 1);
    }
    updateDoc(newDoc);
  };

  const handleToggleOrdered = (index: number) => {
    const newDoc = { ...doc };
    newDoc.items[index].ordered = !newDoc.items[index].ordered;
    updateDoc(newDoc);
  };

  // Notes handlers
  const handleAddNote = () => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    newDoc.notes.push({ text: 'พิมพ์รายละเอียดหมายเหตุ', hl: '' });
    updateDoc(newDoc);
  };

  const handleDeleteNote = (index: number) => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    newDoc.notes.splice(index, 1);
    updateDoc(newDoc);
  };

  const handleCycleHlNote = (index: number) => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    const hls: ('' | 'y' | 'c')[] = ['', 'y', 'c'];
    const current = newDoc.notes[index].hl;
    newDoc.notes[index].hl = hls[(hls.indexOf(current) + 1) % 3];
    updateDoc(newDoc);
  };

  // Section handlers
  const handleAddSection = () => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    newDoc.sections.push({
      label: 'หัวข้อเพิ่มเติม',
      groups: [{ label: 'หมวดที่ 1', rows: ['รายละเอียดงวด/เงื่อนไข'] }],
      foot: ['หมายเหตุเพิ่มเติม']
    });
    updateDoc(newDoc);
  };

  const handleDeleteSection = (sIndex: number) => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    newDoc.sections.splice(sIndex, 1);
    updateDoc(newDoc);
  };

  const handleAddGroup = (sIndex: number) => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    newDoc.sections[sIndex].groups.push({
      label: 'หมวดใหม่',
      rows: ['รายละเอียด']
    });
    updateDoc(newDoc);
  };

  const handleAddRow = (sIndex: number, gIndex: number) => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    newDoc.sections[sIndex].groups[gIndex].rows.push('พิมพ์รายละเอียดงวด');
    updateDoc(newDoc);
  };

  const handleDeleteRow = (sIndex: number, gIndex: number, rIndex: number) => {
    if (!isEditable) return;
    const newDoc = { ...doc };
    newDoc.sections[sIndex].groups[gIndex].rows.splice(rIndex, 1);
    updateDoc(newDoc);
  };

  // Logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleFieldChange('company.logo', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  const handleSelectDocMobile = (uid: string) => {
    onSelectDoc(uid);
    setMobileTab('editor');
  };

  const handleCreateNewDocMobile = () => {
    onCreateNewDoc();
    setMobileTab('editor');
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-[calc(100vh-6.5rem)] overflow-hidden animate-fade-in">
      {/* Mobile/Tablet Tab Switcher */}
      <div className="flex xl:hidden bg-slate-200 p-1 rounded-xl shrink-0 no-print">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
            mobileTab === 'list' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          📋 รายการใบเสนอราคา ({filteredQuotations.length})
        </button>
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
            mobileTab === 'editor' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          📄 ดู/แก้ไข ({qtId(doc) || 'ใบใหม่'})
        </button>
      </div>

      {/* Left Drawer: Quotations List */}
      <div
        className={`w-full xl:w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden no-print ${
          mobileTab === 'list' ? 'flex flex-1 xl:flex-none' : 'hidden xl:flex'
        }`}
      >
        {/* Search & Header */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-cyan-400">
            <FilePlus className="w-4 h-4" />
            รายการใบเสนอราคา ({quotations.length})
          </span>
          <button
            onClick={handleCreateNewDocMobile}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            ใบใหม่
          </button>
        </div>

        <div className="p-2 border-b border-slate-100 bg-slate-50 space-y-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่, ลูกค้า, โครงการ..."
              className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <div className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> สถานะเอกสาร:
            </div>
            <div className="flex gap-1 text-[10px] font-medium overflow-x-auto pb-1">
              {['ALL', 'Draft', 'Pending', 'Approved', 'Cancelled'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-0.5 rounded-full border shrink-0 ${
                    filterStatus === st
                      ? 'bg-slate-800 text-white border-slate-800 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st === 'ALL' ? 'ทั้งหมด' : STATUS_CONFIG[st as keyof typeof STATUS_CONFIG]?.th || st}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter (ช่วงวันที่) */}
          <div className="pt-1.5 border-t border-slate-200/60">
            <div className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-600" /> ช่วงวันที่ (DATE):
              </span>
              {dateFilter !== 'ALL' && (
                <button
                  onClick={() => { setDateFilter('ALL'); setStartDate(''); setEndDate(''); }}
                  className="text-[9px] text-cyan-600 hover:underline flex items-center gap-0.5"
                >
                  <X className="w-2.5 h-2.5" /> ล้างตัวกรอง
                </button>
              )}
            </div>

            {/* Date Filter Quick Pills */}
            <div className="flex gap-1 text-[10px] font-medium overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'ทั้งหมด' },
                { id: 'TODAY', label: 'วันนี้' },
                { id: '7DAYS', label: '7 วัน' },
                { id: '30DAYS', label: '30 วัน' },
                { id: 'THIS_MONTH', label: 'เดือนนี้' },
                { id: 'CUSTOM', label: 'กำหนดเอง' }
              ].map(df => (
                <button
                  key={df.id}
                  onClick={() => setDateFilter(df.id as DateFilterType)}
                  className={`px-2 py-0.5 rounded-full border shrink-0 ${
                    dateFilter === df.id
                      ? 'bg-cyan-600 text-white border-cyan-600 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {dateFilter === 'CUSTOM' && (
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 bg-white p-2 rounded-lg border border-cyan-200 shadow-inner">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5 font-medium">วันที่เริ่มต้น</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-[10px] p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5 font-medium">ถึงวันที่</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full text-[10px] p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filter Summary Stats */}
          <div className="pt-1 text-[10px] text-slate-600 flex justify-between items-center bg-cyan-50/60 p-1.5 rounded-lg border border-cyan-100 font-medium">
            <span>พบ <strong className="text-cyan-800">{filteredQuotations.length}</strong> รายการ</span>
            <span className="text-slate-500">รวม: <strong className="text-cyan-800">฿{fmt(totalFilteredGrand)}</strong></span>
          </div>
        </div>

        {/* Quotation List Items */}
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {filteredQuotations.map(q => {
            const isSelected = q.uid === doc.uid;
            const qStatus = STATUS_CONFIG[q.meta.status] || STATUS_CONFIG.Draft;

            return (
              <div
                key={q.uid}
                onClick={() => handleSelectDocMobile(q.uid)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                  isSelected
                    ? 'bg-cyan-50/80 border-cyan-400 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 text-xs">
                    {qtId(q) || '(ไม่มีเลขที่)'}
                  </span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${qStatus.bg}`}>
                    {qStatus.th}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                  {q.customer.attn || q.project.line1 || 'ลูกค้าทั่วไป'}
                </div>
                <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>{q.meta.date}</span>
                  <span className="font-bold text-cyan-700 text-xs">
                    ฿{fmt(qtGrand(q))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Container: A4 Document Viewer & Action Bar */}
      <div
        className={`flex-1 flex flex-col bg-slate-700 rounded-2xl shadow-sm overflow-hidden border border-slate-600 ${
          mobileTab === 'editor' ? 'flex' : 'hidden xl:flex'
        }`}
      >
        {/* Action Header Bar */}
        <div className="px-3 sm:px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 sm:gap-3 shrink-0 flex-wrap border-b border-slate-800 no-print">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileTab('list')}
              className="xl:hidden px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700"
            >
              ← รายการ
            </button>
            <span className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-1.5 truncate">
              <FilePlus className="w-4 h-4 shrink-0" />
              {qtId(doc) || 'ใบเสนอราคาใหม่'}
            </span>
            <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md border ${statusInfo.bg}`}>
              {statusInfo.th}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Selector */}
            {canManageBOQ(currentUser) && (
              <select
                value={doc.meta.status}
                onChange={e => handleFieldChange('meta.status', e.target.value)}
                className="bg-slate-800 text-white border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none"
              >
                <option value="Draft">ร่าง (Draft)</option>
                <option value="Pending">รออนุมัติ (Pending)</option>
                <option value="Approved">อนุมัติแล้ว (Approved)</option>
                <option value="Cancelled">ยกเลิก (Cancelled)</option>
              </select>
            )}

            {/* Lock Total Switch */}
            <button
              onClick={() => handleFieldChange('lockGrand', !doc.lockGrand)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                doc.lockGrand
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="คำนวณส่วนลดย้อนกลับอัตโนมัติตามยอดรวมสุทธิ"
            >
              {doc.lockGrand ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {doc.lockGrand ? 'ยอดรวมถูกล็อก' : 'ล็อกยอดรวม'}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์ / PDF
            </button>
          </div>
        </div>

        {/* Viewport: Printable A4 Document Page */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 flex justify-center bg-slate-600">
          <div className={`page-a4 ${!isEditable ? 'locked' : ''}`} id="printable-boq-a4">
            <div className="doc-frame p-2">
              {/* Company Header */}
              <table className="doc-table">
                <colgroup>
                  <col style={{ width: '92px' }} />
                  <col />
                  <col style={{ width: '140px' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="doc-td text-center align-top pt-2">
                      {doc.company.logo ? (
                        <img
                          src={doc.company.logo}
                          alt="Logo"
                          className="w-20 mx-auto max-h-16 object-contain"
                        />
                      ) : (
                        <div className="w-20 h-12 border border-dashed border-slate-300 text-[10px] text-slate-400 flex items-center justify-center text-center mx-auto no-print">
                          อัปโหลดโลโก้
                        </div>
                      )}

                      {isEditable && (
                        <div className="mt-1 no-print flex gap-1 justify-center">
                          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px]">
                            อัปโหลด
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </td>

                    <td className="doc-td text-center align-top">
                      <div className="text-xl font-bold italic font-serif">
                        <input
                          type="text"
                          value={doc.company.nameTh}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('company.nameTh', e.target.value)}
                          className="w-full text-center ed-span font-bold italic"
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        <input
                          type="text"
                          value={doc.company.nameEn}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('company.nameEn', e.target.value)}
                          className="w-full text-center ed-span font-bold"
                        />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        <input
                          type="text"
                          value={doc.company.addr1}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('company.addr1', e.target.value)}
                          className="w-full text-center ed-span"
                        />
                      </div>
                      <div className="text-[10px] font-semibold text-slate-700">
                        <input
                          type="text"
                          value={doc.company.addr2}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('company.addr2', e.target.value)}
                          className="w-full text-center ed-span"
                        />
                      </div>
                    </td>

                    <td className="doc-td text-center align-top pt-2">
                      <span className="fill inline-block px-3 py-1 font-bold text-sm border border-slate-800">
                        <input
                          type="text"
                          value={doc.company.docTitle}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('company.docTitle', e.target.value)}
                          className="w-24 text-center ed-span font-bold"
                        />
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Customer Info Section */}
              <table className="doc-table bt text-xs mt-1">
                <colgroup>
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '12px' }} />
                  <col />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '12px' }} />
                  <col style={{ width: '150px' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="doc-td font-bold">ATTN</td>
                    <td className="doc-td text-center">:</td>
                    <td className="doc-td">
                      <input
                        type="text"
                        value={doc.customer.attn}
                        readOnly={!isEditable}
                        onChange={e => handleFieldChange('customer.attn', e.target.value)}
                        className="w-full ed-span"
                        placeholder="ชื่อผู้ติดต่อ/ลูกค้า"
                      />
                    </td>
                    <td className="doc-td font-bold bl">DATE</td>
                    <td className="doc-td text-center">:</td>
                    <td className="doc-td text-center font-bold">
                      <input
                        type="text"
                        value={doc.meta.date}
                        readOnly={!isEditable}
                        onChange={e => handleFieldChange('meta.date', e.target.value)}
                        className="w-full text-center ed-span"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="doc-td font-bold">COMPANY</td>
                    <td className="doc-td text-center">:</td>
                    <td className="doc-td">
                      <input
                        type="text"
                        value={doc.customer.company}
                        readOnly={!isEditable}
                        onChange={e => handleFieldChange('customer.company', e.target.value)}
                        className="w-full ed-span"
                        placeholder="ชื่อบริษัทลูกค้า"
                      />
                    </td>
                    <td className="doc-td font-bold bl">No.</td>
                    <td className="doc-td text-center">:</td>
                    <td className="doc-td text-center font-bold">
                      <div className="flex gap-1 justify-center">
                        <input
                          type="text"
                          value={doc.meta.quoteNo}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('meta.quoteNo', e.target.value)}
                          className="w-24 text-center ed-span"
                        />
                        <input
                          type="text"
                          value={doc.meta.rev}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('meta.rev', e.target.value)}
                          className="w-12 text-center ed-span"
                        />
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="doc-td font-bold">ADDRESS</td>
                    <td className="doc-td text-center">:</td>
                    <td className="doc-td">
                      <AutoTextarea
                        value={doc.customer.addr1}
                        readOnly={!isEditable}
                        onChange={val => handleFieldChange('customer.addr1', val)}
                        className="w-full ed-span"
                        placeholder="ที่อยู่ลูกค้า"
                      />
                    </td>
                    <td className="doc-td font-bold bl">E-MAIL</td>
                    <td className="doc-td text-center">:</td>
                    <td className="doc-td text-center">
                      <input
                        type="text"
                        value={doc.customer.email}
                        readOnly={!isEditable}
                        onChange={e => handleFieldChange('customer.email', e.target.value)}
                        className="w-full text-center ed-span"
                        placeholder="อีเมล"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="doc-td font-bold">TEL.</td>
                    <td className="doc-td text-center">:</td>
                    <td className="doc-td">
                      <input
                        type="text"
                        value={doc.customer.tel}
                        readOnly={!isEditable}
                        onChange={e => handleFieldChange('customer.tel', e.target.value)}
                        className="w-full ed-span"
                        placeholder="เบอร์โทรศัพท์"
                      />
                    </td>
                    <td className="doc-td font-bold bl">VALIDITY</td>
                    <td className="doc-td text-center">:</td>
                    <td className="doc-td text-center">
                      <span className="flex items-center justify-center gap-1">
                        <input
                          type="text"
                          value={doc.meta.validity}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('meta.validity', e.target.value)}
                          className="w-10 text-center ed-span font-bold"
                        />
                        <span>Days</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="bt p-1 text-[11px] font-semibold text-slate-800">
                WE ARE PLEASED TO OFFER THE PRICE OF GOODS FOR THE DETAIL AS BELOW
              </div>

              {/* Items Table */}
              <table className="doc-table bt text-xs">
                <colgroup>
                  <col style={{ width: '32px' }} />
                  <col style={{ width: '100px' }} />
                  <col />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '85px' }} />
                  <col style={{ width: '85px' }} />
                  <col style={{ width: '75px' }} className="no-print" />
                </colgroup>
                <thead>
                  <tr className="bb text-center font-bold bg-slate-50">
                    <th className="doc-th br">No.</th>
                    <th className="doc-th br">MODEL</th>
                    <th className="doc-th br">DESCRIPTION</th>
                    <th className="doc-th br" colSpan={2}>QUANTITY</th>
                    <th className="doc-th br">PRICE/UNIT</th>
                    <th className="doc-th br">AMOUNT</th>
                    <th className="doc-th no-print">สั่งซื้อ</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Project Title Line */}
                  <tr>
                    <td className="doc-td br text-center"></td>
                    <td className="doc-td br font-bold">PROJECT :</td>
                    <td className="doc-td br font-bold">
                      <AutoTextarea
                        value={doc.project.line1}
                        readOnly={!isEditable}
                        onChange={val => handleFieldChange('project.line1', val)}
                        className="w-full ed-span font-bold"
                        placeholder="ชื่อโครงการ / รายละเอียด"
                      />
                      <AutoTextarea
                        value={doc.project.line2}
                        readOnly={!isEditable}
                        onChange={val => handleFieldChange('project.line2', val)}
                        className="w-full ed-span font-bold text-slate-600"
                        placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                      />
                    </td>
                    <td className="doc-td br"></td>
                    <td className="doc-td br"></td>
                    <td className="doc-td br"></td>
                    <td className="doc-td br"></td>
                    <td className="doc-td no-print"></td>
                  </tr>

                  {/* Item Rows */}
                  {doc.items.map((it, idx) => {
                    const isDiscountRow = doc.lockGrand && idx === Math.min(doc.discountIndex, doc.items.length - 1);

                    return (
                      <tr key={idx} className="hover:bg-amber-50/40">
                        <td className="doc-td br text-center font-semibold">{idx + 1}</td>
                        <td className="doc-td br font-semibold uppercase">
                          <input
                            type="text"
                            value={it.model}
                            readOnly={!isEditable}
                            onChange={e => handleFieldChange(`items.${idx}.model`, e.target.value)}
                            className="w-full ed-span uppercase"
                            placeholder="MODEL"
                          />
                        </td>
                        <td className="doc-td br">
                          <AutoTextarea
                            value={it.description}
                            readOnly={!isEditable}
                            onChange={val => handleFieldChange(`items.${idx}.description`, val)}
                            className="w-full ed-span"
                            placeholder="รายละเอียด"
                          />
                        </td>
                        <td className="doc-td br text-center font-semibold">
                          <input
                            type="number"
                            value={it.qty}
                            readOnly={!isEditable || isDiscountRow}
                            onChange={e => handleFieldChange(`items.${idx}.qty`, parseNum(e.target.value))}
                            className="w-full text-center ed-span font-semibold"
                          />
                        </td>
                        <td className="doc-td br text-center font-semibold uppercase">
                          <input
                            type="text"
                            value={it.unit}
                            readOnly={!isEditable}
                            onChange={e => handleFieldChange(`items.${idx}.unit`, e.target.value)}
                            className="w-full text-center ed-span uppercase"
                          />
                        </td>
                        <td className="doc-td br text-right font-semibold">
                          <input
                            type="number"
                            step="0.01"
                            value={it.pricePerUnit}
                            readOnly={!isEditable || isDiscountRow}
                            onChange={e => handleFieldChange(`items.${idx}.pricePerUnit`, parseNum(e.target.value))}
                            className="w-full text-right ed-span font-semibold"
                          />
                        </td>
                        <td className="doc-td br text-right font-bold text-slate-900">
                          {fmt(it.amount)}
                        </td>
                        <td className="doc-td text-center no-print flex items-center justify-center gap-1 py-1">
                          <button
                            type="button"
                            onClick={() => handleToggleOrdered(idx)}
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              it.ordered
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {it.ordered ? '✔ สั่งแล้ว' : 'สั่งซื้อ'}
                          </button>

                          {isEditable && doc.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(idx)}
                              className="text-rose-600 hover:text-rose-800 p-0.5"
                              title="ลบแถว"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {isEditable && (
                <div className="p-1 border-t no-print">
                  <button
                    onClick={handleAddItem}
                    className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold flex items-center gap-1 border border-emerald-200"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรายการสินค้า/บริการ
                  </button>
                </div>
              )}

              {/* Notes List Section */}
              <div className="bt p-2 text-xs">
                <div className="font-bold underline mb-1">หมายเหตุ :</div>
                <div className="space-y-1">
                  {doc.notes.map((note, nIdx) => (
                    <div key={nIdx} className="flex items-start gap-1 group">
                      <span className="text-slate-400 select-none pt-0.5">•</span>
                      <AutoTextarea
                        value={note.text}
                        readOnly={!isEditable}
                        onChange={val => handleFieldChange(`notes.${nIdx}.text`, val)}
                        className={`w-full ed-span px-1 py-0.5 rounded ${
                          note.hl === 'y' ? 'fill-yellow' : note.hl === 'c' ? 'fill-cyan' : ''
                        }`}
                        placeholder="รายละเอียดหมายเหตุ"
                      />
                      {isEditable && (
                        <div className="no-print opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            onClick={() => handleCycleHlNote(nIdx)}
                            className="px-1.5 py-0.5 text-[9px] bg-slate-200 rounded font-semibold"
                            title="สลับสีไฮไลท์"
                          >
                            สี
                          </button>
                          <button
                            onClick={() => handleDeleteNote(nIdx)}
                            className="text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isEditable && (
                  <button
                    onClick={handleAddNote}
                    className="mt-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded no-print hover:bg-slate-200"
                  >
                    + เพิ่มหมายเหตุ
                  </button>
                )}
              </div>

              {/* Dynamic Payment Terms & Sections */}
              <div className="bt p-2 text-xs">
                {doc.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="mb-3 border-b pb-2 last:border-b-0">
                    <div className="font-bold text-slate-900 underline mb-1 flex items-center justify-between">
                      <input
                        type="text"
                        value={sec.label}
                        readOnly={!isEditable}
                        onChange={e => handleFieldChange(`sections.${sIdx}.label`, e.target.value)}
                        className="ed-span font-bold underline"
                      />
                      {isEditable && (
                        <button
                          onClick={() => handleDeleteSection(sIdx)}
                          className="text-rose-600 text-[10px] no-print"
                        >
                          ลบหัวข้อนี้
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 pl-2">
                      {sec.groups.map((grp, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                          <div className="font-semibold text-slate-800">
                            <input
                              type="text"
                              value={grp.label}
                              readOnly={!isEditable}
                              onChange={e =>
                                handleFieldChange(`sections.${sIdx}.groups.${gIdx}.label`, e.target.value)
                              }
                              className="ed-span font-semibold"
                            />
                          </div>

                          <div className="pl-3 space-y-0.5">
                            {grp.rows.map((rText, rIdx) => (
                              <div key={rIdx} className="flex items-start gap-2 group">
                                <span className="text-slate-400 text-[10px] select-none pt-0.5">-</span>
                                <AutoTextarea
                                  value={rText}
                                  readOnly={!isEditable}
                                  onChange={val =>
                                    handleFieldChange(
                                      `sections.${sIdx}.groups.${gIdx}.rows.${rIdx}`,
                                      val
                                    )
                                  }
                                  className="w-full ed-span"
                                />
                                {isEditable && (
                                  <button
                                    onClick={() => handleDeleteRow(sIdx, gIdx, rIdx)}
                                    className="text-rose-600 opacity-0 group-hover:opacity-100 no-print pt-0.5"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {isEditable && (
                            <button
                              onClick={() => handleAddRow(sIdx, gIdx)}
                              className="text-[10px] text-cyan-700 hover:underline font-medium pl-3 no-print"
                            >
                              + เพิ่มบรรทัดงวด
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Section foot lines */}
                    <div className="mt-2 text-[11px] text-slate-700 space-y-0.5 pl-2 font-medium">
                      {sec.foot.map((fText, fIdx) => (
                        <div key={fIdx}>
                          <input
                            type="text"
                            value={fText}
                            readOnly={!isEditable}
                            onChange={e =>
                              handleFieldChange(`sections.${sIdx}.foot.${fIdx}`, e.target.value)
                            }
                            className="w-full ed-span"
                          />
                        </div>
                      ))}
                    </div>

                    {isEditable && (
                      <button
                        onClick={() => handleAddGroup(sIdx)}
                        className="mt-1 text-[10px] text-emerald-700 font-semibold no-print"
                      >
                        + เพิ่มหมวด
                      </button>
                    )}
                  </div>
                ))}

                {isEditable && (
                  <button
                    onClick={handleAddSection}
                    className="px-2.5 py-1 bg-cyan-50 text-cyan-800 rounded font-semibold text-xs no-print border border-cyan-200"
                  >
                    + เพิ่มหัวข้อเงื่อนไขการชำระเงิน
                  </button>
                )}
              </div>

              {/* Totals Table */}
              <table className="doc-table bt text-xs">
                <colgroup>
                  <col />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '110px' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="doc-td br text-center font-bold fill align-middle text-sm" rowSpan={3}>
                      ({bahtText(doc.calc.grand)})
                    </td>
                    <td className="doc-td br bb font-bold fill">TOTAL</td>
                    <td className="doc-td bb text-right font-bold fill">
                      ฿{fmt(doc.calc.total)}
                    </td>
                  </tr>
                  <tr>
                    <td className="doc-td br bb font-bold fill">
                      VAT {doc.vatRate}%
                    </td>
                    <td className="doc-td bb text-right font-bold fill">
                      ฿{fmt(doc.calc.vat)}
                    </td>
                  </tr>
                  <tr>
                    <td className="doc-td br font-bold fill text-slate-900">
                      GRAND TOTAL
                    </td>
                    <td className="doc-td text-right font-bold text-base fill text-cyan-900">
                      ฿{fmt(doc.calc.grand)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Quote By & Signatures Section */}
              <div className="bt p-1.5 text-xs font-semibold">
                QUOTE BY :{' '}
                <input
                  type="text"
                  value={doc.meta.quoteBy}
                  readOnly={!isEditable}
                  onChange={e => handleFieldChange('meta.quoteBy', e.target.value)}
                  className="w-3/4 ed-span font-semibold"
                />
              </div>

              <div className="bt p-1 text-[10px] text-center font-bold">
                PLEASE SIGN FOR CONFIRM THE ORDER AND SEND BACK TO COMPANY
              </div>

              <table className="doc-table bt text-xs">
                <colgroup>
                  <col style={{ width: '33.33%' }} />
                  <col style={{ width: '33.33%' }} />
                  <col style={{ width: '33.33%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="doc-td br sig-box">
                      <div className="sig-line">…..........................…......……………..</div>
                      <div className="sig-role font-bold">APPROVAL</div>
                      <div className="sig-date">DATE ............./.............../.................</div>
                    </td>
                    <td className="doc-td br sig-box">
                      <div className="sig-line">…..........................…......……………..</div>
                      <div className="sig-role font-bold">SALE EXECUTIVE</div>
                      <div className="sig-date">DATE…........../................../................</div>
                    </td>
                    <td className="doc-td sig-box">
                      <div className="sig-line">…..........................…......……………..</div>
                      <div className="sig-role font-bold">SALE MANAGER</div>
                      <div className="sig-date">
                        DATE…
                        <input
                          type="text"
                          value={doc.sig.d}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('sig.d', e.target.value)}
                          className="w-5 text-center ed-span font-bold"
                        />
                        /
                        <input
                          type="text"
                          value={doc.sig.m}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('sig.m', e.target.value)}
                          className="w-5 text-center ed-span font-bold"
                        />
                        /
                        <input
                          type="text"
                          value={doc.sig.y}
                          readOnly={!isEditable}
                          onChange={e => handleFieldChange('sig.y', e.target.value)}
                          className="w-10 text-center ed-span font-bold"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
