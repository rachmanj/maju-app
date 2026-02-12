// Permission codes for RBAC system
export const PERMISSIONS = {
  // Membership
  MEMBER_VIEW: 'member.view',
  MEMBER_CREATE: 'member.create',
  MEMBER_EDIT: 'member.edit',
  MEMBER_DELETE: 'member.delete',
  MEMBER_APPROVE: 'member.approve',
  
  // Savings
  SAVINGS_VIEW: 'savings.view',
  SAVINGS_DEPOSIT: 'savings.deposit',
  SAVINGS_WITHDRAW: 'savings.withdraw',
  SAVINGS_CONFIGURE: 'savings.configure',
  
  // Loans
  LOAN_VIEW: 'loan.view',
  LOAN_CREATE: 'loan.create',
  LOAN_APPROVE: 'loan.approve',
  LOAN_DISBURSE: 'loan.disburse',
  LOAN_PAYMENT: 'loan.payment',
  LOAN_CONFIGURE: 'loan.configure',
  
  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_TRANSFER: 'inventory.transfer',
  
  // POS
  POS_ACCESS: 'pos.access',
  POS_TRANSACTION: 'pos.transaction',
  
  // Accounting
  ACCOUNTING_VIEW: 'accounting.view',
  ACCOUNTING_JOURNAL: 'accounting.journal',
  ACCOUNTING_REPORT: 'accounting.report',
  
  // Reports
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',
  
  // Admin
  ADMIN_USERS: 'admin.users',
  ADMIN_SETTINGS: 'admin.settings',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  superadmin: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.ADMIN_USERS,
    PERMISSIONS.MEMBER_VIEW,
    PERMISSIONS.MEMBER_APPROVE,
    PERMISSIONS.SAVINGS_VIEW,
    PERMISSIONS.LOAN_VIEW,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_TRANSACTION,
    PERMISSIONS.LOAN_APPROVE,
    PERMISSIONS.LOAN_DISBURSE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_REPORT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.ADMIN_SETTINGS,
  ],
  pengurus: [
    PERMISSIONS.MEMBER_VIEW,
    PERMISSIONS.SAVINGS_VIEW,
    PERMISSIONS.SAVINGS_DEPOSIT,
    PERMISSIONS.SAVINGS_WITHDRAW,
    PERMISSIONS.LOAN_VIEW,
    PERMISSIONS.LOAN_APPROVE,
    PERMISSIONS.LOAN_PAYMENT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_JOURNAL,
    PERMISSIONS.ACCOUNTING_REPORT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_TRANSACTION,
  ],
  kasir: [
    PERMISSIONS.MEMBER_VIEW,
    PERMISSIONS.SAVINGS_VIEW,
    PERMISSIONS.SAVINGS_DEPOSIT,
    PERMISSIONS.SAVINGS_WITHDRAW,
    PERMISSIONS.LOAN_VIEW,
    PERMISSIONS.LOAN_PAYMENT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_TRANSACTION,
  ],
  pengawas: [
    PERMISSIONS.MEMBER_VIEW,
    PERMISSIONS.SAVINGS_VIEW,
    PERMISSIONS.LOAN_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],
  anggota: [
    PERMISSIONS.SAVINGS_VIEW,
    PERMISSIONS.LOAN_VIEW,
  ],
};

export function hasPermission(userRoles: string[], permission: Permission): boolean {
  // Superadmin has all permissions
  if (userRoles.includes('superadmin')) {
    return true;
  }
  
  // Check if any role has the permission
  return userRoles.some(role => {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    return rolePerms.includes(permission);
  });
}
