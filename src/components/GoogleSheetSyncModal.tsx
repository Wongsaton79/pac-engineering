import React, { useState } from 'react';
import { GoogleSheetConfig, SystemDatabase } from '../types';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/googleSheetScript';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Send,
  DownloadCloud,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface GoogleSheetSyncModalProps {
  config: GoogleSheetConfig;
  db: SystemDatabase;
  onSaveConfig: (config: GoogleSheetConfig) => void;
  onPushToSheet: (url?: string) => Promise<{ success: boolean; message: string }>;
  onPullFromSheet: (url?: string) => Promise<{ success: boolean; message: string; data?: any }>;
  onClose: () => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  config,
  db,
  onSaveConfig,
  onPushToSheet,
  onPullFromSheet,
  onClose
}) => {
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl || '');
  const [autoSync, setAutoSync] = useState(config.autoSync || false);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      setStatusMsg({ type: 'err', text: 'กรุณากรอก Google Sheet Web App URL ก่อนกดทดสอบ' });
      return;
    }

    setIsLoading(true);
    setStatusMsg({ type: 'info', text: 'กำลังทดสอบการเชื่อมต่อกับ Google Sheet...' });

    try {
      const testUrl = `${webAppUrl.trim()}${webAppUrl.includes('?') ? '&' : '?'}action=test`;
      const res = await fetch(testUrl);
      const json = await res.json();

      if (json && json.status === 'success') {
        setStatusMsg({ type: 'ok', text: `เชื่อมต่อสำเร็จ! ${json.message}` });
        const updatedConfig = { ...config, enabled: true, webAppUrl: webAppUrl.trim() };
        onSaveConfig(updatedConfig);
      } else {
        setStatusMsg({ type: 'err', text: `เชื่อมต่อไม่สำเร็จ: ${json.message || 'โปรดตรวจสอบ URL'}` });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: `ไม่สามารถเชื่อมต่อได้: ${err.message || 'โปรดตรวจสอบสิทธิ์ในการเข้าถึง Web App (ต้องตั้งเป็น Anyone)'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushData = async () => {
    setIsSyncing(true);
    setStatusMsg({ type: 'info', text: 'กำลังส่งข้อมูลทั้งหมดไปยัง Google Sheet...' });
    const res = await onPushToSheet(webAppUrl.trim());
    setIsSyncing(false);
    setStatusMsg({ type: res.success ? 'ok' : 'err', text: res.message });
  };

  const handlePullData = async () => {
    setIsSyncing(true);
    setStatusMsg({ type: 'info', text: 'กำลังดึงข้อมูลล่าสุดจาก Google Sheet...' });
    const res = await onPullFromSheet(webAppUrl.trim());
    setIsSyncing(false);
    setStatusMsg({ type: res.success ? 'ok' : 'err', text: res.message });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 font-bold text-sm flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>ตั้งค่าการเชื่อมต่อฐานข้อมูล Google Sheet</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Answer to User Query */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-medium leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-950 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              การเก็บข้อมูลบน Google Sheet (ประหยัดงบประมาณ):
            </div>
            ตอบคำถาม: <b>สามารถเก็บข้อมูลได้แน่นอน 100%!</b> ระบบ PAC Engineering ออกแบบให้สามารถส่งข้อมูลใบเสนอราคา BOQ, สถานะสั่งซื้อ, งานติดตั้ง, คลังสินค้า, Service และ Audit Logs ไปลงแผ่นงาน Google Sheet ได้โดยตรงผ่าน Google Apps Script Web App
          </div>

          {/* Web App URL Configuration */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block font-bold text-slate-800">
              1. Google Apps Script Web App URL:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webAppUrl}
                onChange={e => setWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shrink-0 shadow flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'กำลังทดสอบ...' : 'ทดสอบเชื่อมต่อ'}
              </button>
            </div>

            {statusMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  statusMsg.type === 'ok'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : statusMsg.type === 'err'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}
              >
                {statusMsg.type === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {statusMsg.type === 'err' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                {statusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-3">
              <input
                type="checkbox"
                id="autoSync"
                checked={autoSync}
                onChange={e => {
                  const val = e.target.checked;
                  setAutoSync(val);
                  onSaveConfig({ ...config, autoSync: val });
                }}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="autoSync" className="font-semibold text-slate-700 cursor-pointer">
                เปิดระบบ Auto-Sync (ส่งข้อมูลอัตโนมัติเมื่อมีการเปลี่ยนแปลง)
              </label>
            </div>
          </div>

          {/* Sync Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePushData}
              disabled={isSyncing || !webAppUrl.trim()}
              className="p-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              ซิงก์ส่งข้อมูลไป Google Sheet (Push)
            </button>

            <button
              type="button"
              onClick={handlePullData}
              disabled={isSyncing || !webAppUrl.trim()}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold shadow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <DownloadCloud className="w-4 h-4 text-cyan-400" />
              ดึงข้อมูลจาก Google Sheet (Pull)
            </button>
          </div>

          {/* Code.gs Copy Box & Instructions */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800">
                2. โค้ด Google Apps Script (Code.gs) สำหรับนำไปวางใน Google Sheet:
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg font-semibold text-xs flex items-center gap-1 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอกโค้ด Apps Script'}
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] max-h-40 overflow-y-auto border border-slate-800">
              <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-700">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-600" />
                ขั้นตอนการเปิดใช้งาน Google Sheet ใน 1 นาที:
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-600 font-medium">
                <li>เปิด Google Sheet ของท่าน</li>
                <li>ไปที่เมนู <b>ส่วนขยาย (Extensions)</b> → <b>Apps Script</b></li>
                <li>วางโค้ดที่คัดลอกมาด้านบนลงในไฟล์ <b>Code.gs</b> แล้วกด บันทึก (Ctrl+S)</li>
                <li>กดปุ่ม <b>ทำให้ใช้งานได้ (Deploy)</b> → <b>การทำให้ใช้งานได้ใหม่ (New deployment)</b></li>
                <li>เลือกประเภท <b>เว็บแอป (Web app)</b> และตั้งค่าสิทธิ์ให้เข้าถึงได้ทุกคน (Anyone)</li>
                <li>คัดลอก Web App URL นำมากรอกใส่ช่องด้านบน แล้วกด <b>ทดสอบเชื่อมต่อ</b></li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white rounded-xl font-semibold text-xs shadow hover:bg-slate-700"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
