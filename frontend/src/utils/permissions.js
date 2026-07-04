const normalizePermission = (value) => String(value || '').trim().toUpperCase();

const LEGACY_PERMISSION_ALIASES = {
  INVENTORY_ORDERS: ['INVENTORY_ORDERS', 'ORDERS'],
  CUSTOMIZED_ORDERS: ['CUSTOMIZED_ORDERS', 'ORDERS'],
  PAYMENT_METHODS: ['PAYMENT_METHODS', 'SOURCE_OF_INCOME'],
  SOURCE_OF_INCOME: ['SOURCE_OF_INCOME', 'PAYMENT_METHODS'],
};

export const getPermissionAliases = (permission) => {
  const normalized = normalizePermission(permission);
  return LEGACY_PERMISSION_ALIASES[normalized] || [normalized];
};

export const hasPermission = (permissions, permission) => {
  const allowed = getPermissionAliases(permission);
  return (permissions || []).some((item) => allowed.includes(normalizePermission(item?.pageName)));
};

export const expandPermissions = (permissions) => {
  const normalized = new Set();

  (permissions || []).forEach((permission) => {
    const value = normalizePermission(permission);

    if (value === 'ORDERS') {
      ['INVENTORY_ORDERS', 'CUSTOMIZED_ORDERS'].forEach((alias) => normalized.add(alias));
      return;
    }

    normalized.add(value);
  });

  return Array.from(normalized);
};

export const normalizePermissionName = normalizePermission;
