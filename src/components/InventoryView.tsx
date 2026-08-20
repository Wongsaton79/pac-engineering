import React, { useState } from 'react';
import { InventoryItem, User } from '../types';
import { fmt } from '../utils/formatters';
import { canManageInventory } from '../services/authService';
import { Boxes, Plus, PackagePlus, AlertCircle, Info } from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  currentUser: User | null;
  onAddInventoryItem: (item: InventoryItem) => void;
  onReturnStock: (model: string, qty: number) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  currentUser,
  onAddInventoryItem,
  onReturnStock
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // New Model Form
  const [model, setModel] = useState('');
  const [desc, setDesc] = useState('');
  const [unit, setUnit] = useState('SET');
  const [matPrice, setMatPrice] = useState(0);
  const [labPrice, setLabPrice] = useState(0);

  // Return Stock Form
  const [returnModel, setReturnModel] = useState('');
  const [returnQty, setReturnQty] = useState(1);

  const canEdit = canManageInventory(currentUser);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) return;

    const newItem: InventoryItem = {
      model: model.trim().toUpperCase(),
      desc: desc.trim(),
      unit: unit.trim().toUpperCase(),
      matPrice: Number(matPrice) || 0,
      labPrice: Number(labPrice) || 0,
      stock: 0
    };

    onAddInventoryItem(newItem);
    setIsAddModalOpen(false);

    setModel('');
    setDesc('');
    setUnit('SET');
    setMatPrice(0);
    setLabPrice(0);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
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
            <Boxes className="w-5 h-5 text-indigo-600" />
            ระบบคลังสินค้า (วัสดุและอะไหล่คงเหลือ)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คลังสินค้ากลางสำหรับเก็บชิ้นส่วน/วัสดุที่เหลือจากงานติดตั้งเพื่อนำไปเบิกใช้ในงาน Service
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setReturnModel(inventory.length ? inventory[0].model : '');
                setReturnQty(1);
                setIsReturnModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <PackagePlus className="w-4 h-4" />
              คืนของเหลือเข้าคลัง
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรหัสสินค้าใหม่
            </button>
          </div>
        )}
      </div>

      <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
        <Info className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <b>กติกาคลังสินค้า:</b> สินค้าและอะไหล่จะเข้าคลังเมื่อมีการคืนวัสดุเหลือจากงานติดตั้งเสร็จสิ้นเท่านั้น (ไม่มีการซื้อสต๊อกไว้ก่อน) และจะถูกหักเมื่อมีการเบิกให้งาน Service
        </span>
      </div>

      {/* Inventory Master List: Mobile/Tablet Cards (xl:hidden) & Desktop Table (hidden xl:block) */}

      {/* Mobile/Tablet Card Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:hidden">
        {inventory.map(item => (
          <div
            key={item.model}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-2.5"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                  {item.model}
                </span>
                <h4 className="font-semibold text-slate-800 text-xs mt-1.5">{item.desc}</h4>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block font-medium">คงเหลือในคลัง</span>
                <span className={`text-sm font-extrabold ${item.stock > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {item.stock} {item.unit}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">ราคาวัสดุ (Mat):</span>
                <span className="font-bold text-slate-700">฿{fmt(item.matPrice)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ค่าแรง (Lab):</span>
                <span className="font-bold text-slate-700">฿{fmt(item.labPrice)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden xl:block bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-xs font-semibold border-b border-slate-200">
                <th className="p-4">MODEL (รหัสสินค้า)</th>
                <th className="p-4 w-1/3">DESCRIPTION (รายละเอียด)</th>
                <th className="p-4 text-center">UNIT</th>
                <th className="p-4 text-right">MAT. COST (฿)</th>
                <th className="p-4 text-right">LAB. COST (฿)</th>
                <th className="p-4 text-center bg-slate-50">คงเหลือในคลัง (พร้อมเบิก)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {inventory.map(item => (
                <tr key={item.model} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-slate-800 text-xs uppercase">
                    {item.model}
                  </td>
                  <td className="p-4 text-slate-600 font-medium">
                    {item.desc}
                  </td>
                  <td className="p-4 text-center text-slate-500 font-semibold uppercase">
                    {item.unit}
                  </td>
                  <td className="p-4 text-right text-slate-700 font-medium">
                    ฿{fmt(item.matPrice)}
                  </td>
                  <td className="p-4 text-right text-slate-700 font-medium">
                    ฿{fmt(item.labPrice)}
                  </td>
                  <td className="p-4 text-center bg-slate-50/80 border-l border-slate-100">
                    {item.stock > 0 ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold">
                        {item.stock} {item.unit}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">0 {item.unit}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Master Model Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-scale-up">
            <div className="bg-slate-900 text-white p-4 font-bold text-sm flex justify-between items-center">
              <span>เพิ่มรหัสสินค้ารหัสใหม่ (ฐานข้อมูล)</span>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MODEL (รหัสสินค้า / รุ่น)
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="เช่น RXQ10BY1S"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DESCRIPTION (รายละเอียด)
                </label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="รายละเอียดสินค้า/รุ่น"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UNIT (หน่วยนับ)
                </label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="SET, JOB, ROLL"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ราคาทุนวัสดุ (MAT COST)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={matPrice}
                    onChange={e => setMatPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ราคาทุนค่าแรง (LAB COST)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={labPrice}
                    onChange={e => setLabPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
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
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  บันทึกฐานข้อมูล
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
              <PackagePlus className="w-5 h-5 text-indigo-300" />
              <span>บันทึกคืนของเหลือเข้าคลัง</span>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกรหัสวัสดุที่ต้องการคืนเข้าคลัง
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
                  จำนวนที่นำคืนเข้าคลัง
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
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  บันทึกคืนคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
