import React, { useState } from 'react';
import { ServiceJob, Quotation, InventoryItem, User } from '../types';
import { qtId } from '../utils/formatters';
import { canManageService } from '../services/authService';
import {
  Headphones,
  Plus,
  Edit2,
  PackageCheck,
  AlertTriangle,
  MinusCircle
} from 'lucide-react';

interface ServiceViewProps {
  services: ServiceJob[];
  quotations: Quotation[];
  inventory: InventoryItem[];
  currentUser: User | null;
  onSaveService: (job: ServiceJob) => void;
  onWithdrawPart: (serviceId: string, model: string, qty: number) => void;
}

const SERVICE_CHECKLIST = [
  'รับแจ้งปัญหา ติดต่อลูกค้านัดหมาย',
  'เข้าตรวจสอบอาการหน้างาน',
  'ประเมินราคา / เบิกอะไหล่',
  'ดำเนินการซ่อมแซมแก้ไข',
  'ทดสอบระบบ และส่งมอบงาน'
];

export const ServiceView: React.FC<ServiceViewProps> = ({
  services,
  quotations,
  inventory,
  currentUser,
  onSaveService,
  onWithdrawPart
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ServiceJob | null>(null);

  // Form states
  const [qtRef, setQtRef] = useState('');
  const [customer, setCustomer] = useState('');
  const [issue, setIssue] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<boolean[]>([false, false, false, false, false]);

  // Spare Parts Withdrawal
  const [withdrawModel, setWithdrawModel] = useState('');
  const [withdrawQty, setWithdrawQty] = useState(1);
  const [withdrawError, setWithdrawError] = useState('');

  const canEdit = canManageService(currentUser);
  const approvedQuotations = quotations.filter(q => q.meta.status === 'Approved');
  const findQt = (uid: string) => quotations.find(q => q.uid === uid);

  const handleOpenNewModal = () => {
    setEditingJob(null);
    setQtRef(approvedQuotations.length ? approvedQuotations[0].uid : '');
    setCustomer(approvedQuotations.length ? approvedQuotations[0].project.line1 : '');
    setIssue('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
    setTasks([false, false, false, false, false]);
    setWithdrawModel('');
    setWithdrawQty(1);
    setWithdrawError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job: ServiceJob) => {
    setEditingJob(job);
    setQtRef(job.qtRef);
    setCustomer(job.customer);
    setIssue(job.issue);
    setStartDate(job.startDate);
    setEndDate(job.endDate);
    setTasks(job.tasks || [false, false, false, false, false]);

    const availableItems = inventory.filter(i => i.stock > 0);
    setWithdrawModel(availableItems.length ? availableItems[0].model : '');
    setWithdrawQty(1);
    setWithdrawError('');
    setIsModalOpen(true);
  };

  const calculateProgress = (checkedTasks: boolean[]): number => {
    const checkedCount = checkedTasks.filter(Boolean).length;
    return Math.round((checkedCount / SERVICE_CHECKLIST.length) * 100);
  };

  const handleToggleTask = (idx: number) => {
    const nextTasks = [...tasks];
    nextTasks[idx] = !nextTasks[idx];
    setTasks(nextTasks);
  };

  const handleAutofillCustomer = (selectedQtUid: string) => {
    setQtRef(selectedQtUid);
    const q = findQt(selectedQtUid);
    if (q) {
      setCustomer(`${q.project.line1} (${q.customer.attn || ''})`.trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const progress = calculateProgress(tasks);

    const updatedJob: ServiceJob = {
      id: editingJob ? editingJob.id : `SRV-${Math.floor(Math.random() * 900 + 100)}`,
      qtRef,
      customer,
      issue,
      startDate,
      endDate,
      tasks,
      progress,
      usedParts: editingJob ? editingJob.usedParts : []
    };

    onSaveService(updatedJob);
    setIsModalOpen(false);
  };

  const handleWithdrawPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');

    if (!editingJob) return;
    if (!withdrawModel) {
      setWithdrawError('กรุณาเลือกอะไหล่ในคลัง');
      return;
    }

    const item = inventory.find(i => i.model === withdrawModel);
    if (!item || item.stock < withdrawQty) {
      setWithdrawError(`สต๊อก ${withdrawModel} ไม่เพียงพอ (คงเหลือ ${item?.stock || 0})`);
      return;
    }

    onWithdrawPart(editingJob.id, withdrawModel, withdrawQty);
    setWithdrawQty(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-emerald-600" />
            3. บริการหลังการขาย (Service & Repair)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            รับแจ้งซ่อม/บริการหลังการขาย และบันทึกเบิกอะไหล่จากคลังสินค้าสำหรับแต่ละโครงการ
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            แจ้งซ่อม / รับงาน Service ใหม่
          </button>
        )}
      </div>

      {/* Service List: Mobile/Tablet Cards (xl:hidden) & Desktop Table (hidden xl:block) */}

      {/* Mobile/Tablet Card Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:hidden">
        {services.map(srv => {
          const q = findQt(srv.qtRef);
          return (
            <div
              key={srv.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {srv.customer}
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    โครงการ: {q ? qtId(q) : '(ไม่พบใบเสนอราคาเดิม)'}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEditModal(srv)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  อัปเดตงาน
                </button>
              </div>

              <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-100 text-xs">
                <span className="font-bold text-rose-900 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  ปัญหาที่รับแจ้ง:
                </span>
                <p className="text-slate-700 mt-0.5">{srv.issue}</p>
              </div>

              {srv.usedParts && srv.usedParts.length > 0 && (
                <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-600">อะไหล่ที่เบิกใช้งานแล้ว:</span>
                  <div className="font-semibold mt-0.5">{srv.usedParts.map(p => `${p.model} (${p.qty})`).join(', ')}</div>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <span>กำหนดเวลา: <strong className="text-slate-700">{srv.startDate} - {srv.endDate}</strong></span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>ความคืบหน้า</span>
                  <span className={srv.progress === 100 ? 'text-emerald-600' : 'text-blue-600'}>
                    {srv.progress}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      srv.progress === 100
                        ? 'bg-emerald-500'
                        : srv.progress >= 50
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${srv.progress}%` }}
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
                <th className="p-4">สถานที่ / ปัญหาที่รับแจ้ง</th>
                <th className="p-4">วันรับงาน - สิ้นสุด</th>
                <th className="p-4 w-44">ความสำเร็จ (%)</th>
                <th className="p-4 text-center">จัดการอะไหล่/อัปเดต</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {services.map(srv => {
                const q = findQt(srv.qtRef);
                return (
                  <tr key={srv.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-xs">
                        {q ? qtId(q) : '(ไม่พบใบเสนอราคาเดิม)'}
                      </div>
                      <div className="text-slate-500 text-[11px] font-medium mt-0.5">
                        {q ? q.project.line1 : '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">
                        {srv.customer}
                      </div>
                      <div className="text-rose-600 font-medium text-[11px] flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {srv.issue}
                      </div>
                      {srv.usedParts && srv.usedParts.length > 0 && (
                        <div className="mt-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                          อะไหล่ที่เบิก: {srv.usedParts.map(p => `${p.model} (${p.qty})`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {srv.startDate}
                      <span className="text-slate-400 block text-[10px]">
                        ถึง {srv.endDate}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-between text-slate-700 font-bold mb-1">
                        <span>{srv.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            srv.progress === 100
                              ? 'bg-emerald-500'
                              : srv.progress >= 50
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${srv.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenEditModal(srv)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-emerald-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        อัปเดต / เบิกอะไหล่
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-scale-up">
            <div className="bg-slate-900 text-white p-4 font-bold text-sm flex justify-between items-center">
              <span>{editingJob ? 'อัปเดต / เบิกอะไหล่ งาน Service' : 'แจ้งซ่อม / รับงาน Service ใหม่'}</span>
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
                  อ้างอิงใบเสนอราคาเดิม (บังคับเลือก)
                </label>
                <select
                  required
                  value={qtRef}
                  onChange={e => handleAutofillCustomer(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- เลือกใบเสนอราคาโครงการเดิม --</option>
                  {approvedQuotations.map(q => (
                    <option key={q.uid} value={q.uid}>
                      {qtId(q)} - {q.project.line1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ลูกค้า / สถานที่ติดตั้ง
                </label>
                <input
                  type="text"
                  required
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  placeholder="ชื่อลูกค้า/โครงการ"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อาการ / ปัญหาที่รับแจ้ง
                </label>
                <input
                  type="text"
                  required
                  value={issue}
                  onChange={e => setIssue(e.target.value)}
                  placeholder="เช่น แอร์คอยล์เย็นมีน้ำหยด, ไม่มีความเย็น"
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

              {/* Service Checklist Section */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-emerald-200/80">
                  <span className="text-xs font-bold text-emerald-900">
                    กระบวนการ Service (Checklist)
                  </span>
                  <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-sm">
                    {calculateProgress(tasks)}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  {SERVICE_CHECKLIST.map((taskName, idx) => {
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
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className={`font-medium ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {idx + 1}. {taskName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Spare Parts Withdrawal Box (Only on Editing) */}
              {editingJob && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>เบิกอะไหล่จากคลังเพื่องานนี้</span>
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                  </div>

                  {withdrawError && (
                    <div className="text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded font-medium border border-rose-200">
                      {withdrawError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <select
                      value={withdrawModel}
                      onChange={e => setWithdrawModel(e.target.value)}
                      className="flex-1 p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">-- เลือกอะไหล่ที่มีในคลัง --</option>
                      {inventory
                        .filter(i => i.stock > 0)
                        .map(i => (
                          <option key={i.model} value={i.model}>
                            {i.model} (คงเหลือ {i.stock} {i.unit})
                          </option>
                        ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      value={withdrawQty}
                      onChange={e => setWithdrawQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                    />

                    <button
                      type="button"
                      onClick={handleWithdrawPartSubmit}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm shrink-0"
                    >
                      เบิกอะไหล่
                    </button>
                  </div>

                  {/* List of currently used parts */}
                  <div className="mt-2 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">รายการอะไหล่ที่เบิกไปแล้ว:</span>
                    {editingJob.usedParts && editingJob.usedParts.length > 0 ? (
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5 font-medium text-emerald-800">
                        {editingJob.usedParts.map((p, pIdx) => (
                          <li key={pIdx}>
                            {p.model} - จำนวน {p.qty} หน่วย
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-slate-400 italic mt-0.5">ยังไม่ได้เบิกอะไหล่</div>
                    )}
                  </div>
                </div>
              )}

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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  บันทึกข้อมูลงาน Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
