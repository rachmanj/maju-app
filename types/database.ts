// Database Type Definitions for Koperasi Maju ERP

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  description?: string;
  created_at: Date;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  created_at: Date;
}

export interface UserPreference {
  id: number;
  user_id: number;
  theme: 'light' | 'dark' | 'system';
  sidebar_collapsed: boolean;
  language: string;
  dashboard_layout?: any;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface Member {
  id: number;
  nik: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  job_title?: string;
  project_id?: number;
  status: 'pending' | 'active' | 'inactive' | 'resigned';
  joined_date?: Date;
  resigned_date?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface MemberDocument {
  id: number;
  member_id: number;
  document_type: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  created_at: Date;
}

export interface MemberPurchaseLimit {
  id: number;
  member_id: number;
  limit_amount: number;
  effective_date: Date;
  expiry_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  updated_by?: number;
}

export interface MemberBarcode {
  id: number;
  member_id: number;
  barcode: string;
  qr_code_path?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MemberPin {
  id: number;
  member_id: number;
  pin_hash: string;
  is_active: boolean;
  failed_attempts: number;
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SavingsType {
  id: number;
  code: string;
  name: string;
  is_mandatory: boolean;
  is_withdrawable: boolean;
  minimum_amount?: number;
  earns_interest: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SavingsAccount {
  id: number;
  member_id: number;
  savings_type_id: number;
  account_number?: string;
  balance: number;
  opened_date: Date;
  closed_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SavingsTransaction {
  id: number;
  savings_account_id: number;
  transaction_type: 'deposit' | 'withdrawal' | 'interest' | 'transfer';
  amount: number;
  balance_before: number;
  balance_after: number;
  transaction_date: Date;
  reference_number?: string;
  notes?: string;
  created_at: Date;
  created_by?: number;
}

export interface SavingsInterestRate {
  id: number;
  savings_type_id: number;
  rate_percentage: number;
  effective_date: Date;
  expiry_date?: Date;
  calculation_method: 'daily' | 'monthly' | 'yearly';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LoanApplication {
  id: number;
  member_id: number;
  application_number: string;
  requested_amount: number;
  requested_term_months: number;
  purpose?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  applied_at: Date;
  approved_at?: Date;
  approved_by?: number;
  rejection_reason?: string;
}

export interface Loan {
  id: number;
  member_id: number;
  loan_application_id?: number;
  loan_number: string;
  principal_amount: number;
  interest_rate: number;
  interest_method: 'flat' | 'effective';
  term_months: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'defaulted';
  approved_date?: Date;
  disbursed_date?: Date;
  completed_date?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
}

export interface LoanSchedule {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: Date;
  original_due_date: Date;
  is_due_date_overridden: boolean;
  installment_amount: number;
  is_manual_amount: boolean;
  principal_amount: number;
  interest_amount: number;
  paid_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  paid_at?: Date;
  overridden_by?: number;
  overridden_at?: Date;
  override_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LoanPayment {
  id: number;
  loan_id: number;
  loan_schedule_id?: number;
  payment_number?: string;
  payment_amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_date: Date;
  payment_method: 'cash' | 'salary_deduction' | 'savings' | 'transfer';
  reference_number?: string;
  notes?: string;
  created_at: Date;
  created_by?: number;
}

export interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: Date;
  description?: string;
  reference_type?: string;
  reference_id?: number;
  status: 'draft' | 'posted';
  posted_at?: Date;
  created_at: Date;
  created_by?: number;
}

export interface JournalEntryLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  debit: number;
  credit: number;
  description?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface ProductCategory {
  id: number;
  code: string;
  name: string;
  parent_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface ProductUnit {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  barcode?: string;
  category_id?: number;
  base_unit_id: number;
  description?: string;
  min_stock: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface ProductUnitConversion {
  id: number;
  product_id: number;
  from_unit_id: number;
  to_unit_id: number;
  conversion_factor: number;
  created_at: Date;
  updated_at: Date;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface ProductPrice {
  id: number;
  product_id: number;
  warehouse_id?: number;
  unit_id: number;
  price: number;
  effective_date: Date;
  expiry_date?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
}

export interface WarehouseStock {
  id: number;
  warehouse_id: number;
  product_id: number;
  quantity: number;
  updated_at: Date;
}

export interface StockMovement {
  id: number;
  movement_number: string;
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
  warehouse_id: number;
  product_id: number;
  quantity: number;
  unit_id: number;
  reference_type?: string;
  reference_id?: number;
  to_warehouse_id?: number;
  notes?: string;
  movement_date: Date;
  created_at: Date;
  created_by?: number;
}

export interface ConsignmentSupplier {
  id: number;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface ConsignmentReceipt {
  id: number;
  receipt_number: string;
  supplier_id: number;
  warehouse_id: number;
  receipt_date: Date;
  notes?: string;
  status: 'draft' | 'posted';
  posted_at?: Date;
  created_at: Date;
  created_by?: number;
}

export interface ConsignmentReceiptItem {
  id: number;
  consignment_receipt_id: number;
  product_id: number;
  quantity: number;
  unit_id: number;
  notes?: string;
}

export interface ConsignmentStock {
  id: number;
  supplier_id: number;
  warehouse_id: number;
  product_id: number;
  quantity: number;
  updated_at: Date;
}

export interface ConsignmentSettlement {
  id: number;
  settlement_number: string;
  supplier_id: number;
  settlement_date: Date;
  total_sales_amount: number;
  total_commission: number;
  net_payable: number;
  status: 'draft' | 'confirmed' | 'paid';
  notes?: string;
  created_at: Date;
  created_by?: number;
}

export interface ConsignmentSale {
  id: number;
  supplier_id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  unit_id: number;
  unit_price: number;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  sale_date: Date;
  settlement_id?: number;
  reference_type?: string;
  reference_id?: number;
  created_at: Date;
}
