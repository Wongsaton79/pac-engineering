import {
  SystemDatabase,
  Quotation,
  InventoryItem,
  InstallationJob,
  ServiceJob,
  User,
  AuditLog,
  AuditCategory,
  GoogleSheetConfig
} from '../types';
import { thaiToday } from '../utils/formatters';

const STORAGE_KEY = 'pac_eng_db_v3';
const SESSION_USER_KEY = 'pac_eng_active_user';

export function getDefaultSeedData(): SystemDatabase {
  const seedQuotations: Quotation[] = [
    {
      uid: 'Q1',
      meta: {
        quoteNo: 'PEN16905016',
        rev: 'Rev1',
        date: '29 พฤษภาคม 2569',
        validity: '30',
        status: 'Approved',
        quoteBy: 'ณัฐวุฒิ บัวสะอาด 089-499-8487 ( nuthawuth@pacengineering.co.th )'
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
        attn: 'คุณทรงชัย สานกิ่งทอง',
        company: '',
        tel: '081-804-4067',
        fax: '',
        email: 'songchai@example.com',
        addr1: '842/42 ถนนเจริญกรุง 107 แยก 36 แขวงบางโคล่ เขตบางคอแหลม',
        addr2: 'กรุงเทพมหานคร 10120'
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
        line1: 'บ้านคุณทรงชัย สานกิ่งทอง',
        line2: 'VRV DAIKIN Air Conditioning System'
      },
      items: [
        { model: 'RSUQ9AYMS', description: 'ค่าสินค้า เครื่องปรับอากาศ และ Heat Pump', qty: 1, unit: 'JOB', pricePerUnit: 1686765, amount: 1686765, ordered: true },
        { model: 'INSTALL-01', description: 'ค่าแรงติดตั้งเครื่องปรับอากาศ Heat Pump พร้อมอุปกรณ์', qty: 1, unit: 'JOB', pricePerUnit: 166000, amount: 166000, ordered: true },
        { model: 'MISC-01', description: 'ค่าดำเนินการ รวมค่ารถเครน และค่ารื้อถอนระบบเก่า', qty: 1, unit: 'JOB', pricePerUnit: 185276.5, amount: 185276.5, ordered: false },
        { model: 'DISCOUNT', description: 'ส่วนลดค่าแผงสำรองเก่า และส่วนลดพิเศษ', qty: 1, unit: 'JOB', pricePerUnit: -168882.62, amount: -168882.62, ordered: false }
      ],
      notes: [
        { text: 'รายละเอียดตาม BOQ.NO.PEN16905016 Rev1', hl: '' },
        { text: 'รับประกันผลงานติดตั้ง 2 ปี แถมงานสัญญาบริการล้างเครื่องฟรี 2 ปี', hl: 'y' },
        { text: 'รับประกันอะไหล่ 1 ปี และคอมเพรสเซอร์ 5 ปี สำหรับเครื่องปรับอากาศ', hl: '' },
        { text: 'FCU ทุกตัวเป็นรีโมทไร้สาย', hl: '' },
        { text: 'เมนไฟฟ้าและเบรกเกอร์ใช้ของเดิม', hl: '' },
        { text: 'มีระบบ Reiri For Home ควบคุมเครื่องปรับอากาศได้ผ่านมือถือ', hl: 'c' }
      ],
      sections: [
        {
          label: 'เงื่อนไขการชำระเงิน',
          groups: [
            { label: 'ค่าสินค้า', rows: ['งวดที่ 1  40% มัดจำเมื่ออนุมัติสั่งซื้อ', 'งวดที่ 2  60% ก่อนส่งสินค้า ตามชั้น ที่จัดส่ง'] },
            { label: 'ค่าติดตั้ง', rows: ['งวดที่ 1  50% มัดจำเมื่ออนุมัติสั่งซื้อ', 'งวดที่ 2  50% เมื่อติดตั้งเสร็จทั้งหมด'] }
          ],
          foot: [
            'โอนเข้าบัญชี บริษัท แพค เอ็นจิเนียริ่ง เซอร์วิส จำกัด',
            'ธ.กรุงเทพ กระแสรายวัน เลขที่ 023-3-700145 สาขา ปตท. ถนนรามอินทรา'
          ]
        }
      ],
      sig: { img: '', d: '29', m: '05', y: '2569' },
      vatRate: 7,
      lockGrand: true,
      grand: 2000000,
      discountIndex: 3,
      calc: { total: 1869158.88, vat: 130841.12, grand: 2000000 }
    }
  ];

  const seedInventory: InventoryItem[] = [
    { model: 'RSUQ9AYMS', desc: 'VRV IVS HI-SEER 380V 81,900 BTU/H', unit: 'SET', matPrice: 91410, labPrice: 15000, stock: 0 },
    { model: 'RXQ10BY1S', desc: 'VRV 6A 95,500 BTU/H', unit: 'SET', matPrice: 127875, labPrice: 15000, stock: 0 },
    { model: 'FXEQ32AV37', desc: '1-WAY CASSETTE TYPE 12,300 Btu/hr', unit: 'SET', matPrice: 28325, labPrice: 2000, stock: 2 },
    { model: 'COPPER-1/4', desc: 'ท่อทองแดง 1/4" หนา 0.7', unit: 'ROLL', matPrice: 1500, labPrice: 0, stock: 5 }
  ];

  const seedInstallations: InstallationJob[] = [
    {
      id: 'INS-01',
      qtRef: 'Q1',
      mechanic: 'ช่างเอกชัย (หัวหน้าชุด)',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      details: 'เตรียมเข้าหน้างาน เดินท่อ และติดตั้งคอยล์เย็น',
      tasks: [true, true, false, false, false],
      progress: 40
    }
  ];

  const seedServices: ServiceJob[] = [
    {
      id: 'SRV-01',
      qtRef: 'Q1',
      customer: 'บ้านคุณทรงชัย สานกิ่งทอง',
      issue: 'แอร์คอยล์เย็นมีน้ำหยด และต้องการล้างประจำปี',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      tasks: [true, false, false, false, false],
      progress: 20,
      usedParts: []
    }
  ];

  const seedUsers: User[] = [
    {
      id: 'u-1',
      username: 'admin',
      name: 'ผู้ดูแลระบบ (Admin)',
      email: 'admin@pacengineering.co.th',
      role: 'admin',
      active: true,
      createdAt: '2026-01-01 09:00:00',
      lastLogin: thaiToday()
    },
    {
      id: 'u-2',
      username: 'sales',
      name: 'ฝ่ายขาย / BOQ (Sales)',
      email: 'sales@pacengineering.co.th',
      role: 'sales',
      active: true,
      createdAt: '2026-01-02 10:00:00'
    },
    {
      id: 'u-3',
      username: 'engineer',
      name: 'ช่างโครงการ / วิศวกร (Engineer)',
      email: 'tech@pacengineering.co.th',
      role: 'engineer',
      active: true,
      createdAt: '2026-01-03 11:00:00'
    },
    {
      id: 'u-4',
      username: 'viewer',
      name: 'ผู้บริหาร / ดูอย่างเดียว (Viewer)',
      email: 'manager@pacengineering.co.th',
      role: 'viewer',
      active: true,
      createdAt: '2026-01-04 14:00:00'
    }
  ];

  const seedAuditLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: `${thaiToday()} 09:00:00`,
      username: 'admin',
      name: 'ผู้ดูแลระบบ (Admin)',
      role: 'admin',
      action: 'เริ่มต้นระบบงาน PAC Engineering',
      category: 'SYSTEM',
      target: 'SYSTEM',
      details: 'ระบบเริ่มต้นสร้างฐานข้อมูลตั้งต้นและสิทธิ์ผู้ใช้งาน'
    }
  ];

  const seedSheetConfig: GoogleSheetConfig = {
    enabled: false,
    webAppUrl: '',
    autoSync: false
  };

  return {
    seq: 1,
    quotations: seedQuotations,
    inventory: seedInventory,
    installations: seedInstallations,
    services: seedServices,
    users: seedUsers,
    auditLogs: seedAuditLogs,
    sheetConfig: seedSheetConfig
  };
}

export function loadDatabase(): SystemDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SystemDatabase;
      if (parsed && Array.isArray(parsed.quotations)) {
        if (!parsed.users || !parsed.users.length) {
          parsed.users = getDefaultSeedData().users;
        }
        if (!parsed.auditLogs) {
          parsed.auditLogs = [];
        }
        if (!parsed.sheetConfig) {
          parsed.sheetConfig = { enabled: false, webAppUrl: '', autoSync: false };
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load storage, using seed default:', err);
  }
  const defaultData = getDefaultSeedData();
  saveDatabase(defaultData);
  return defaultData;
}

export function saveDatabase(db: SystemDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
}

export function logActivity(
  db: SystemDatabase,
  username: string,
  name: string,
  role: any,
  action: string,
  category: AuditCategory,
  target: string,
  details: string
): SystemDatabase {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: `${thaiToday()} ${new Date().toLocaleTimeString('th-TH')}`,
    username,
    name,
    role,
    action,
    category,
    target,
    details
  };
  db.auditLogs = [newLog, ...(db.auditLogs || [])];
  saveDatabase(db);
  return db;
}
