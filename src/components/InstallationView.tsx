import React, { useState } from 'react';
import { InstallationJob, Quotation, InventoryItem, User } from '../types';
import { qtId } from '../utils/formatters';
import { canManageInstallation } from '../services/authService';
import {
  Wrench,
  Plus,
  CheckSquare,
  Square,
  Calendar,
  UserCheck,
  AlertCircle,
  PackageCheck,
  Edit2
} from 'lucide-react';

interface InstallationViewProps {
  installations: InstallationJob[];
  quotations: Quotation[];
  inventory: InventoryItem[];
  currentUser: User | null;
  onSaveInstallation: (job: InstallationJob) => void;
  onReturnStock: (model: string, qty: number) => void;
}

const INSTALLATION_CHECKLIST = [
  'รับแบบ วางแผน และเตรียมอุปกรณ์',
  'เข้าหน้างาน ติดตั้งโครงสร้างและเดินท่อ',
  'ติดตั้งเครื่องปรับอากาศ',
  'ทดสอบระบบ (Commissioning)',
  'ส่งมอบงานและทำความสะอาด'
];

export const InstallationView: React.FC<InstallationViewProps> = ({
  installations,
  quotations,
  inventory,
  currentUser,
  onSaveInstallation,
  onReturnStock
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<InstallationJob | null>(null);

  // Form states
  const [qtRef, setQtRef] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [details, setDetails] = useState('');
  const [tasks, setTasks] = useState<boolean[]>([false, false, false, false, false]);

  // Return Stock states
  const [returnModel, setReturnModel] = useState('');
  const [returnQty, setReturnQty] = useState(1);

  const canEdit = canManageInstallation(currentUser);
  const approvedQuotations = quotations.filter(q => q.meta.status === 'Approved');
  const findQt = (uid: string) => quotations.find(q => q.uid === uid);

  const handleOpenNewModal = () => {
    setEditingJob(null);
    setQtRef(approvedQuotations.length ? approvedQuotations[0].uid : '');
    setMechanic('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setDetails('');
    setTasks([false, false, false, false, false]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job: InstallationJob) => {
    setEditingJob(job);
    setQtRef(job.qtRef);
    setMechanic(job.mechanic);
    setStartDate(job.startDate);
    setEndDate(job.endDate);
    setDetails(job.details);
    setTasks(job.tasks || [false, false, false, false, false]);
    setIsModalOpen(true);
  };

  const calculateProgress = (checkedTasks: boolean[]): number => {
    const checkedCount = checkedTasks.filter(Boolean).length;
    return Math.round((checkedCount / INSTALLATION_CHECKLIST.length) * 100);
  };

  const handleToggleTask = (idx: number) => {
    const nextTasks = [...tasks];
    nextTasks[idx] = !nextTasks[idx];
    setTasks(nextTasks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const progress = calculateProgress(tasks);

    const wasCompleted = editingJob?.progress === 100;

    const updatedJob: InstallationJob = {
      id: editingJob ? editingJob.id : `INS-${Math.floor(Math.random() * 900 + 100)}`,
      qtRef,
      mechanic,
      startDate,
      endDate,
      details,
      tasks,
      progress
    };

    onSaveInstallation(updatedJob);
    setIsModalOpen(false);

    // Prompt for returning leftover stock if just reached 100%
    if (progress === 100 && !wasCompleted) {
      setReturnModel(inventory.length ? inventory[0].model : '');
      setReturnQty(1);
      setIsReturnModalOpen(true);
    }
  };

  const handleConfirmReturnStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnModel && returnQty > 0) {
      onReturnStock(returnModel, returnQty);
    }
    setIsReturnModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            2. ระบบติดตามงานติดตั้ง (โครงการ)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ติดตามสถานะการติดตั้งอ้างอิงจากใบเสนอราคาที่อนุมัติแล้ว
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            เปิดงานติดตั้งใหม่
          </button>
        )}
      </div>

      {/* Installation Jobs List: Mobile/Tablet Cards (xl:hidden) & Desktop Table (hidden xl:block) */}
      
      {/* Mobile/Tablet Card Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:hidden">
        {installations.map((ins) => {
          const q = findQt(ins.qtRef);
          return (
            <div
              key={ins.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {q ? qtId(q) : '(ไม่พบใบเสนอราคา)'}
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {q ? q.project.line1 : '-'}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEditModal(ins)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  อัปเดตงาน
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">หัวหน้าชุดช่าง</span>
                  <span className="font-semibold text-slate-700">{ins.mechanic || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">กำหนดเวลา</span>
                  <span className="font-medium text-slate-700">{ins.startDate} - {ins.endDate}</span>
                </div>
              </div>

              {ins.details && (
                <p className="text-xs text-slate-600 bg-amber-50/50 p-2 rounded border border-amber-100/50">
                  <span className="font-semibold text-amber-800">รายละเอียด:</span> {ins.details}
                </p>
              )}

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>ความคืบหน้า</span>
                  <span className={ins.progress === 100 ? 'text-emerald-600' : 'text-blue-600'}>
                    {ins.progress}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      ins.progress === 100
                        ? 'bg-emerald-500'
                        : ins.progress >= 50
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${ins.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden xl:block bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-xs font-semibold border-b border-slate-200">
                <th className="p-4">อ้างอิงใบเสนอราคา (โครงการ)</th>
                <th className="p-4">หัวหน้าชุดช่าง</th>
                <th className="p-4">วันรับงาน - สิ้นสุด</th>
                <th className="p-4">รายละเอียดงาน</th>
                <th className="p-4 w-44">ความสำเร็จ (%)</th>
                <th className="p-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {installations.map((ins) => {
                const q = findQt(ins.qtRef);
                return (
                  <tr key={ins.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm">
                        {q ? qtId(q) : '(ไม่พบใบเสนอราคา)'}
                      </div>
                      <div className="text-slate-500 text-[11px] font-medium mt-0.5">
                        {q ? q.project.line1 : '-'}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {ins.mechanic}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {ins.startDate}
                      <span className="text-slate-400 block text-[10px]">
                        ถึง {ins.endDate}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">
                      {ins.details || '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-between text-slate-700 font-bold mb-1">
                        <span>{ins.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            ins.progress === 100
                              ? 'bg-emerald-500'
                              : ins.progress >= 50
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${ins.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenEditModal(ins)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-blue-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        อัปเดตงาน
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Installation Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-scale-up">
            <div className="bg-slate-900 text-white p-4 font-bold text-sm flex justify-between items-center">
              <span>{editingJob ? 'อัปเดตงานติดตั้ง' : 'เปิดงานติดตั้งใหม่'}</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อ้างอิงใบเสนอราคา (เฉพาะที่อนุมัติแล้ว)
                </label>
                <select
                  required
                  value={qtRef}
                  onChange={e => setQtRef(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- เลือกใบเสนอราคา --</option>
                  {approvedQuotations.map(q => (
                    <option key={q.uid} value={q.uid}>
                      {qtId(q)} - {q.project.line1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวหน้าชุดช่าง / ช่างรับผิดชอบ
                </label>
                <input
                  type="text"
                  required
                  value={mechanic}
                  onChange={e => setMechanic(e.target.value)}
                  placeholder="เช่น ช่างเอกชัย (หัวหน้าช่าง)"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันรับงาน
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันคาดว่าเสร็จสิ้น
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายละเอียดอัปเดตงาน
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  placeholder="บันทึกรายละเอียดการปฏิบัติงาน..."
                />
              </div>

              {/* Checklist Progress Section */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-blue-200/80">
                  <span className="text-xs font-bold text-blue-900">
                    ขั้นตอนงานติดตั้ง (Checklist)
                  </span>
                  <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-sm">
                    {calculateProgress(tasks)}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  {INSTALLATION_CHECKLIST.map((taskName, idx) => {
                    const isChecked = tasks[idx] || false;
                    return (
                      <label
                        key={idx}
                        className="flex items-center gap-2 p-1.5 bg-white/80 hover:bg-white rounded-lg cursor-pointer border border-slate-200/60 transition"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTask(idx)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className={`font-medium ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {idx + 1}. {taskName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  บันทึกข้อมูลงานติดตั้ง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Leftover Stock Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-scale-up">
            <div className="bg-indigo-900 text-white p-4 font-bold text-sm flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-indigo-300" />
              <span>งานติดตั้งเสร็จสิ้น (100%) - คืนของเหลือเข้าคลัง</span>
            </div>

            <form onSubmit={handleConfirmReturnStock} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                หากมีวัสดุ/อะไหล่เหลือจากหน้างาน ให้เลือกและระบุจำนวนเพื่อบันทึกเข้าคลังสินค้าอัตโนมัติ
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกรหัสวัสดุ/สินค้าที่เหลือ
                </label>
                <select
                  value={returnModel}
                  onChange={e => setReturnModel(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  {inventory.map(item => (
                    <option key={item.model} value={item.model}>
                      {item.model} - {item.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนที่นำเข้าคืนคลัง
                </label>
                <input
                  type="number"
                  min="1"
                  value={returnQty}
                  onChange={e => setReturnQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-center"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl"
                >
                  ข้าม (ไม่มีของเหลือ)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  บันทึกเข้าคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
