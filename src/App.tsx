import React, { useState, useEffect } from 'react';
import {
  SystemDatabase,
  User,
  Quotation,
  InstallationJob,
  InventoryItem,
  ServiceJob,
  UserRole,
  GoogleSheetConfig
} from './types';
import {
  loadDatabase,
  saveDatabase,
  logActivity
} from './services/storageService';
import {
  getActiveUser,
  logoutUser,
  canManageUsers
} from './services/authService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { BOQView } from './components/BOQView';
import { InstallationView } from './components/InstallationView';
import { InventoryView } from './components/InventoryView';
import { ServiceView } from './components/ServiceView';
import { UserManagementView } from './components/UserManagementView';
import { AuditLogView } from './components/AuditLogView';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { SiteTrackingView } from './components/SiteTrackingView';
import { thaiToday, qtId } from './utils/formatters';

export default function App() {
  const [db, setDb] = useState<SystemDatabase>(() => loadDatabase());
  const [currentUser, setCurrentUser] = useState<User | null>(() => getActiveUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [activeDocUid, setActiveDocUid] = useState<string>(
    db.quotations.length ? db.quotations[0].uid : ''
  );
  const [isSheetModalOpen, setIsSheetModalOpen] = useState<boolean>(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);

  // Google Maps Quota Listener
  useEffect(() => {
    const handleQuota = () => setIsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Auto-save and Auto-sync whenever db state changes
  useEffect(() => {
    saveDatabase(db);
    
    // Auto sync to Google Sheets (Debounced)
    if (db.sheetConfig.autoSync && db.sheetConfig.webAppUrl) {
      const timer = setTimeout(() => {
        // Use a background fetch to avoid blocking UI or showing errors if user is just typing
        fetch(db.sheetConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'sync', data: db })
        }).catch(() => {
          // Silent catch for auto-sync background task to not interrupt user workflow
          console.warn('Auto-sync to Google Sheet failed. Will retry on next change.');
        });
      }, 5000); // 5 seconds debounce
      
      return () => clearTimeout(timer);
    }
  }, [db]);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    if (currentUser) {
      logoutUser(db, currentUser);
    }
    setCurrentUser(null);
  };

  // Log action wrapper
  const performLog = (
    action: string,
    category: any,
    target: string,
    details: string
  ) => {
    if (!currentUser) return;
    setDb(prevDb => 
      logActivity(
        { ...prevDb },
        currentUser.username,
        currentUser.name,
        currentUser.role,
        action,
        category,
        target,
        details
      )
    );
  };

  // BOQ Document Handlers
  const handleSelectDoc = (uid: string) => {
    setActiveDocUid(uid);
  };

  const handleSaveDoc = (updatedDoc: Quotation) => {
    const nextQuotations = db.quotations.map(q =>
      q.uid === updatedDoc.uid ? updatedDoc : q
    );
    if (!db.quotations.some(q => q.uid === updatedDoc.uid)) {
      nextQuotations.push(updatedDoc);
    }

    const nextDb = { ...db, quotations: nextQuotations };
    setDb(nextDb);

    performLog(
      'บันทึกใบเสนอราคา (BOQ)',
      'BOQ',
      qtId(updatedDoc) || updatedDoc.uid,
      `บันทึกข้อมูลใบเสนอราคา ${qtId(updatedDoc)} ยอดสุทธิ ฿${updatedDoc.calc.grand.toLocaleString()} สถานะ ${updatedDoc.meta.status}`
    );
  };

  const handleCreateNewDoc = () => {
    const newSeq = db.seq + 1;
    const beYear = (new Date().getFullYear() + 543) % 100;
    const mm = ('0' + (new Date().getMonth() + 1)).slice(-2);
    const newNo = `PEN${beYear}${mm}${('000' + newSeq).slice(-3)}`;

    const newDoc: Quotation = {
      uid: `Q${newSeq}`,
      meta: {
        quoteNo: newNo,
        rev: 'Rev1',
        date: thaiToday(),
        validity: '30',
        status: 'Draft',
        quoteBy: currentUser ? `${currentUser.name} (${currentUser.email || ''})` : ''
      },
      company: {
        docTitle: 'ใบเสนอราคา',
        logo: '',
        nameTh: 'บริษัท แพค เอ็นจิเนียริ่ง เซอร์วิส จำกัด',
        nameEn: 'PAC ENGINEERING SERVICE CO ., LTD.',
        addr1: '296 Soi Ramintra 65, Ramintra rd., Tarang Bangkhen, Bangkok Thailand 10230',
        addr2: 'Tel : 66 (2) 945-8364-5  Fax : 66 (2) 945-8366  Website : http://www.pacengineering.co.th'
      },
      customer: {
        attn: '',
        company: '',
        tel: '',
        fax: '',
        email: '',
        addr1: '',
        addr2: ''
      },
      labels: {
        attn: 'ATTN',
        company: 'COMPANY',
        address: 'ADDRESS',
        tel: 'TEL.',
        fax: 'FAX.',
        date: 'DATE',
        no: 'No.',
        email: 'E-MAIL',
        validity: 'VALIDITY',
        days: 'Days',
        offer: 'WE ARE PLEASED TO OFFER THE PRICE OF GOODS FOR THE DETAIL AS BELOW',
        cNo: 'No.',
        cModel: 'MODEL',
        cDesc: 'DESCRIPTION',
        cQty: 'QUANTITY',
        cPrice: 'PRICE/UNIT',
        cAmount: 'AMOUNT',
        project: 'PROJECT',
        note: 'หมายเหตุ',
        terms: 'เงื่อนไขการชำระเงิน',
        total: 'TOTAL',
        vat: 'VAT 7%',
        grand: 'GRAND TOTAL',
        quoteBy: 'QUOTE BY',
        signNotice: 'PLEASE SIGN FOR CONFIRM THE ORDER AND SEND BACK TO COMPANY',
        sig1: 'APPROVAL',
        sig2: 'SALE EXECUTIVE',
        sig3: 'SALE MANAGER'
      },
      project: {
        line1: 'ชื่อโครงการใหม่',
        line2: 'ระบบปรับอากาศ VRV / Heat Pump'
      },
      items: [
        { model: 'AC-01', description: 'ค่าสินค้า เครื่องปรับอากาศ', qty: 1, unit: 'JOB', pricePerUnit: 100000, amount: 100000, ordered: false }
      ],
      notes: [
        { text: 'รับประกันผลงานติดตั้ง 2 ปี แถมงานสัญญาบริการล้างเครื่องฟรี 2 ปี', hl: 'y' },
        { text: 'รับประกันอะไหล่ 1 ปี และคอมเพรสเซอร์ 5 ปี สำหรับเครื่องปรับอากาศ', hl: '' },
        { text: 'FCU ทุกตัวเป็นรีโมทไร้สาย', hl: '' }
      ],
      sections: [
        {
          label: 'เงื่อนไขการชำระเงิน',
          groups: [
            { label: 'ค่าสินค้า', rows: ['งวดที่ 1  40% มัดจำเมื่ออนุมัติสั่งซื้อ', 'งวดที่ 2  60% ก่อนส่งสินค้า'] },
            { label: 'ค่าติดตั้ง', rows: ['งวดที่ 1  50% มัดจำเมื่ออนุมัติสั่งซื้อ', 'งวดที่ 2  50% เมื่อติดตั้งเสร็จ'] }
          ],
          foot: [
            'โอนเข้าบัญชี บริษัท แพค เอ็นจิเนียริ่ง เซอร์วิส จำกัด',
            'ธ.กรุงเทพ กระแสรายวัน เลขที่ 023-3-700145'
          ]
        }
      ],
      sig: { img: '', d: String(new Date().getDate()), m: String(new Date().getMonth() + 1), y: String(new Date().getFullYear() + 543) },
      vatRate: 7,
      lockGrand: false,
      grand: 107000,
      discountIndex: 0,
      calc: { total: 100000, vat: 7000, grand: 107000 }
    };

    const nextQuotations = [newDoc, ...db.quotations];
    const nextDb = { ...db, seq: newSeq, quotations: nextQuotations };
    setDb(nextDb);
    setActiveDocUid(newDoc.uid);
    setActiveTab('design-purchase');

    performLog(
      'สร้างใบเสนอราคาใหม่ (New BOQ)',
      'BOQ',
      newDoc.meta.quoteNo,
      `สร้างใบเสนอราคาฉบับใหม่เลขที่ ${newDoc.meta.quoteNo}`
    );
  };

  const handleDeleteDoc = (uid: string) => {
    const q = db.quotations.find(item => item.uid === uid);
    if (!q) return;

    const nextQuotations = db.quotations.filter(item => item.uid !== uid);
    const nextDb = { ...db, quotations: nextQuotations };
    setDb(nextDb);

    if (activeDocUid === uid) {
      setActiveDocUid(nextQuotations.length ? nextQuotations[0].uid : '');
    }

    performLog(
      'ลบใบเสนอราคา (Delete BOQ)',
      'BOQ',
      qtId(q) || uid,
      `ลบใบเสนอราคาเลขที่ ${qtId(q)} ออกจากระบบ`
    );
  };

  // Installation Handlers
  const handleSaveInstallation = (job: InstallationJob) => {
    const exists = db.installations.some(i => i.id === job.id);
    const nextInstallations = exists
      ? db.installations.map(i => (i.id === job.id ? job : i))
      : [job, ...db.installations];

    const nextDb = { ...db, installations: nextInstallations };
    setDb(nextDb);

    performLog(
      exists ? 'อัปเดตงานติดตั้ง' : 'เปิดงานติดตั้งใหม่',
      'INSTALL',
      job.id,
      `อัปเดตสถานะงานติดตั้ง ID: ${job.id} หัวหน้าช่าง: ${job.mechanic} ความคืบหน้า ${job.progress}%`
    );
  };

  // Inventory & Return Stock Handlers
  const handleAddInventoryItem = (item: InventoryItem) => {
    const nextInventory = [item, ...db.inventory];
    const nextDb = { ...db, inventory: nextInventory };
    setDb(nextDb);

    performLog(
      'เพิ่มรหัสสินค้าใหม่',
      'INVENTORY',
      item.model,
      `เพิ่มรหัสสินค้าใหม่ในฐานข้อมูล MODEL: ${item.model} (${item.desc})`
    );
  };

  const handleReturnStock = (model: string, qty: number) => {
    const nextInventory = db.inventory.map(item =>
      item.model === model ? { ...item, stock: item.stock + qty } : item
    );
    const nextDb = { ...db, inventory: nextInventory };
    setDb(nextDb);

    performLog(
      'คืนของเหลือเข้าคลัง',
      'INVENTORY',
      model,
      `บันทึกรับคืนวัสดุเหลือจากหน้างาน MODEL: ${model} จำนวน ${qty} หน่วยเข้าคลัง`
    );
  };

  // Service Handlers
  const handleSaveService = (job: ServiceJob) => {
    const exists = db.services.some(s => s.id === job.id);
    const nextServices = exists
      ? db.services.map(s => (s.id === job.id ? job : s))
      : [job, ...db.services];

    const nextDb = { ...db, services: nextServices };
    setDb(nextDb);

    performLog(
      exists ? 'อัปเดตงาน Service' : 'รับงาน Service ใหม่',
      'SERVICE',
      job.id,
      `อัปเดตงาน Service ID: ${job.id} ลูกค้า: ${job.customer} ความคืบหน้า ${job.progress}%`
    );
  };

  const handleWithdrawPart = (serviceId: string, model: string, qty: number) => {
    // Deduct stock from inventory
    const nextInventory = db.inventory.map(item =>
      item.model === model ? { ...item, stock: Math.max(0, item.stock - qty) } : item
    );

    // Add to service usedParts list
    const nextServices = db.services.map(srv => {
      if (srv.id === serviceId) {
        const parts = [...(srv.usedParts || [])];
        const existing = parts.find(p => p.model === model);
        if (existing) {
          existing.qty += qty;
        } else {
          parts.push({ model, qty });
        }
        return { ...srv, usedParts: parts };
      }
      return srv;
    });

    const nextDb = { ...db, inventory: nextInventory, services: nextServices };
    setDb(nextDb);

    performLog(
      'เบิกอะไหล่สำหรับ Service',
      'SERVICE',
      serviceId,
      `เบิกอะไหล่ MODEL: ${model} จำนวน ${qty} หน่วย ออกจากคลังสำหรับงาน Service ID: ${serviceId}`
    );
  };

  // User Management Handlers (Admin Only)
  const handleAddUser = (newUser: User, initialPass: string) => {
    newUser.password = initialPass;
    const nextUsers = [...db.users, newUser];
    const nextDb = { ...db, users: nextUsers };
    setDb(nextDb);

    performLog(
      'เปิดบัญชีผู้ใช้ใหม่ (Add User)',
      'USER',
      newUser.username,
      `สร้างผู้ใช้งานใหม่ ${newUser.name} (${newUser.username}) ระดับสิทธิ์: ${newUser.role}`
    );
  };

  const handleToggleUserActive = (userId: string) => {
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) return;

    const nextUsers = db.users.map(u =>
      u.id === userId ? { ...u, active: !u.active } : u
    );
    const nextDb = { ...db, users: nextUsers };
    setDb(nextDb);

    performLog(
      targetUser.active ? 'ระงับการใช้งาน User' : 'เปิดใช้งาน User',
      'USER',
      targetUser.username,
      `${targetUser.active ? 'ระงับการใช้งาน' : 'เปิดการใช้งาน'} บัญชี ${targetUser.username}`
    );
  };

  const handleChangeUserRole = (userId: string, newRole: UserRole) => {
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) return;

    const nextUsers = db.users.map(u =>
      u.id === userId ? { ...u, role: newRole } : u
    );
    const nextDb = { ...db, users: nextUsers };
    setDb(nextDb);

    performLog(
      'เปลี่ยนระดับสิทธิ์ User',
      'USER',
      targetUser.username,
      `เปลี่ยนระดับสิทธิ์ของ ${targetUser.username} เป็น ${newRole}`
    );
  };

  const handleResetPassword = (userId: string, newPass: string) => {
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) return;

    const nextUsers = db.users.map(u =>
      u.id === userId ? { ...u, password: newPass } : u
    );
    const nextDb = { ...db, users: nextUsers };
    setDb(nextDb);

    performLog(
      'รีเซ็ตรหัสผ่าน User',
      'USER',
      targetUser.username,
      `รีเซ็ตรหัสผ่านใหม่สำหรับผู้ใช้งาน ${targetUser.username}`
    );
  };

  // Google Sheet Integration Handlers
  const handleSaveSheetConfig = (newConfig: GoogleSheetConfig) => {
    const nextDb = { ...db, sheetConfig: newConfig };
    setDb(nextDb);

    performLog(
      'ตั้งค่า Google Sheet',
      'SYSTEM',
      'GOOGLE_SHEET',
      `อัปเดตการตั้งค่าการเชื่อมต่อ Google Sheet URL: ${newConfig.webAppUrl}`
    );
  };

  const handlePushToSheet = async (url?: string): Promise<{ success: boolean; message: string }> => {
    const targetUrl = url || db.sheetConfig.webAppUrl;
    if (!targetUrl) {
      return { success: false, message: 'กรุณากรอก Google Sheet Web App URL ก่อนกดซิงก์' };
    }

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'sync', data: db })
      });
      const json = await res.json();

      if (json && json.status === 'success') {
        performLog(
          'ซิงก์ข้อมูลไป Google Sheet',
          'SYSTEM',
          'GOOGLE_SHEET',
          'ซิงก์ข้อมูลทั้งหมดลงแผ่นงาน Google Sheet สำเร็จ'
        );
        return { success: true, message: 'บันทึกข้อมูลทั้งหมดลง Google Sheet เรียบร้อยแล้ว!' };
      }
      return { success: false, message: json.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล' };
    } catch (err: any) {
      return { success: false, message: `เกิดข้อผิดพลาด: ${err.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'}` };
    }
  };

  const handlePullFromSheet = async (url?: string): Promise<{ success: boolean; message: string; data?: any }> => {
    const targetUrl = url || db.sheetConfig.webAppUrl;
    if (!targetUrl) {
      return { success: false, message: 'กรุณากรอก Google Sheet Web App URL ก่อนดึงข้อมูล' };
    }

    try {
      const pullUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=pull`;
      const res = await fetch(pullUrl);
      const json = await res.json();

      if (json && json.status === 'success' && json.data) {
        setDb(json.data);
        performLog(
          'ดึงข้อมูลจาก Google Sheet',
          'SYSTEM',
          'GOOGLE_SHEET',
          'ดึงข้อมูลล่าสุดจากแผ่นงาน Google Sheet เข้าสู่ระบบสำเร็จ'
        );
        return { success: true, message: 'ดึงข้อมูลล่าสุดจาก Google Sheet สำเร็จแล้ว!' };
      }
      return { success: false, message: json.message || 'ไม่พบข้อมูลใน Google Sheet' };
    } catch (err: any) {
      return { success: false, message: `เกิดข้อผิดพลาด: ${err.message}` };
    }
  };

  // Active Doc reference
  const activeDoc = db.quotations.find(q => q.uid === activeDocUid) || (db.quotations.length ? db.quotations[0] : null);

  // Active Tab Title text
  const TAB_TITLES: Record<string, string> = {
    dashboard: 'Dashboard ภาพรวมระบบ',
    'design-purchase': '1. ใบเสนอราคา (BOQ) & สั่งซื้อสินค้า',
    installation: '2. ติดตามงานติดตั้ง (โครงการ)',
    inventory: 'คลังสินค้า (วัสดุและอะไหล่คงเหลือ)',
    service: '3. บริการหลังการขาย (Service)',
    'site-tracking': '4. พิกัดหน้างาน & เช็คอิน GPS (Site Tracking)',
    users: 'การจัดการสิทธิ์ผู้ใช้งาน (User & Role)',
    audit: 'ประวัติการแก้ไขข้อมูล (Audit Logs)',
    sheet: 'การเชื่อมต่อ Google Sheet'
  };

  // If user is not logged in, render Login screen
  if (!currentUser) {
    return <LoginModal db={db} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-['Prompt',sans-serif]">
      {/* Google Maps Platform Quota Exceeded Banner */}
      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full min-w-0">
        {/* Top Header Bar */}
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          installations={db.installations}
          services={db.services}
          quotations={db.quotations}
          onOpenSheetSync={() => setIsSheetModalOpen(true)}
          activeTabTitle={TAB_TITLES[activeTab] || 'PAC Engineering'}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Tab Views */}
        <main className="flex-1 overflow-auto p-3 sm:p-5 lg:p-8 bg-slate-50">
          {activeTab === 'dashboard' && (
            <DashboardView
              quotations={db.quotations}
              installations={db.installations}
              services={db.services}
              auditLogs={db.auditLogs}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'design-purchase' && (
            <BOQView
              quotations={db.quotations}
              activeDoc={activeDoc}
              currentUser={currentUser}
              onSelectDoc={handleSelectDoc}
              onSaveDoc={handleSaveDoc}
              onCreateNewDoc={handleCreateNewDoc}
              onDeleteDoc={handleDeleteDoc}
            />
          )}

          {activeTab === 'installation' && (
            <InstallationView
              installations={db.installations}
              quotations={db.quotations}
              inventory={db.inventory}
              currentUser={currentUser}
              onSaveInstallation={handleSaveInstallation}
              onReturnStock={handleReturnStock}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              inventory={db.inventory}
              currentUser={currentUser}
              onAddInventoryItem={handleAddInventoryItem}
              onReturnStock={handleReturnStock}
            />
          )}

          {activeTab === 'service' && (
            <ServiceView
              services={db.services}
              quotations={db.quotations}
              inventory={db.inventory}
              currentUser={currentUser}
              onSaveService={handleSaveService}
              onWithdrawPart={handleWithdrawPart}
            />
          )}

          {activeTab === 'site-tracking' && (
            <SiteTrackingView
              db={db}
              currentUser={currentUser}
              onUpdateDb={setDb}
              onLog={performLog}
            />
          )}

          {activeTab === 'users' && canManageUsers(currentUser) && (
            <UserManagementView
              users={db.users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onToggleUserActive={handleToggleUserActive}
              onChangeUserRole={handleChangeUserRole}
              onResetPassword={handleResetPassword}
            />
          )}

          {activeTab === 'audit' && canManageUsers(currentUser) && (
            <AuditLogView auditLogs={db.auditLogs} />
          )}

          {activeTab === 'sheet' && (
            <GoogleSheetSyncModal
              config={db.sheetConfig}
              db={db}
              onSaveConfig={handleSaveSheetConfig}
              onPushToSheet={handlePushToSheet}
              onPullFromSheet={handlePullFromSheet}
              onClose={() => setActiveTab('dashboard')}
            />
          )}
        </main>
      </div>

      {/* Google Sheet Modal */}
      {isSheetModalOpen && (
        <GoogleSheetSyncModal
          config={db.sheetConfig}
          db={db}
          onSaveConfig={handleSaveSheetConfig}
          onPushToSheet={handlePushToSheet}
          onPullFromSheet={handlePullFromSheet}
          onClose={() => setIsSheetModalOpen(false)}
        />
      )}
    </div>
  );
}
