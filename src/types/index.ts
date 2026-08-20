export type UserRole = 'admin' | 'engineer' | 'sales' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  password?: string;
}

export type AuditCategory = 'AUTH' | 'BOQ' | 'INSTALL' | 'INVENTORY' | 'SERVICE' | 'USER' | 'SYSTEM';

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  name: string;
  role: UserRole;
  action: string;
  category: AuditCategory;
  target: string;
  details: string;
}

export interface BOQItem {
  model: string;
  description: string;
  qty: number;
  unit: string;
  pricePerUnit: number;
  amount: number;
  ordered: boolean;
}

export interface BOQSectionGroup {
  label: string;
  rows: string[];
}

export interface BOQSection {
  label: string;
  groups: BOQSectionGroup[];
  foot: string[];
}

export interface BOQNote {
  text: string;
  hl: '' | 'y' | 'c';
}

export interface QuotationMeta {
  quoteNo: string;
  rev: string;
  date: string;
  validity: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Cancelled';
  quoteBy: string;
}

export interface CompanyInfo {
  docTitle: string;
  logo: string;
  nameTh: string;
  nameEn: string;
  addr1: string;
  addr2: string;
}

export interface CustomerInfo {
  attn: string;
  company: string;
  tel: string;
  fax: string;
  email: string;
  addr1: string;
  addr2: string;
}

export interface ProjectInfo {
  line1: string;
  line2: string;
}

export interface QuotationCalc {
  total: number;
  vat: number;
  grand: number;
}

export interface Quotation {
  uid: string;
  meta: QuotationMeta;
  company: CompanyInfo;
  customer: CustomerInfo;
  labels: Record<string, string>;
  project: ProjectInfo;
  items: BOQItem[];
  notes: BOQNote[];
  sections: BOQSection[];
  sig: { img: string; d: string; m: string; y: string };
  vatRate: number;
  lockGrand: boolean;
  grand: number;
  discountIndex: number;
  calc: QuotationCalc;
}

export interface InventoryItem {
  model: string;
  desc: string;
  unit: string;
  matPrice: number;
  labPrice: number;
  stock: number;
}

export interface InstallationJob {
  id: string;
  qtRef: string; // Quotation UID
  mechanic: string;
  startDate: string;
  endDate: string;
  details: string;
  tasks: boolean[];
  progress: number;
}

export interface ServiceUsedPart {
  model: string;
  qty: number;
}

export interface ServiceJob {
  id: string;
  qtRef: string; // Quotation UID
  customer: string;
  issue: string;
  startDate: string;
  endDate: string;
  tasks: boolean[];
  progress: number;
  usedParts: ServiceUsedPart[];
}

export interface GoogleSheetConfig {
  enabled: boolean;
  webAppUrl: string;
  lastSync?: string;
  autoSync: boolean;
}

export interface SystemDatabase {
  seq: number;
  quotations: Quotation[];
  inventory: InventoryItem[];
  installations: InstallationJob[];
  services: ServiceJob[];
  users: User[];
  auditLogs: AuditLog[];
  sheetConfig: GoogleSheetConfig;
}
