import type { Organization, ThemeMode } from '@/lib/types';

export const getPaymentMethodLabel = (
  method: string,
  organizations: Organization[],
  organizationId?: string
) => {
  switch (method) {
    case 'cash':
      return 'Наличные';
    case 'card':
      return 'Карта';
    case 'organization': {
      if (organizationId) {
        const organization = organizations.find((org) => org.id === organizationId);
        return organization ? organization.name : 'Организация';
      }
      return 'Организация';
    }
    case 'debt':
      return 'Долг';
    default:
      return method;
  }
};

export const getPaymentMethodColor = (method: string, theme: ThemeMode) => {
  if (theme === 'dark') {
    switch (method) {
      case 'cash':
        return 'text-green-300 bg-green-500/10 border-green-500/20';
      case 'card':
        return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
      case 'organization':
        return 'text-purple-300 bg-purple-500/10 border-purple-500/20';
      case 'debt':
        return 'text-red-300 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-300 bg-gray-500/10 border-gray-500/20';
    }
  } else if (theme === 'black') {
    switch (method) {
      case 'cash':
        return 'text-green-400 bg-green-500/5 border-green-500/30';
      case 'card':
        return 'text-blue-400 bg-blue-500/5 border-blue-500/30';
      case 'organization':
        return 'text-purple-400 bg-purple-500/5 border-purple-400/30';
      case 'debt':
        return 'text-red-400 bg-red-500/5 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/5 border-gray-500/30';
    }
  } else {
    switch (method) {
      case 'cash':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'card':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'organization':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'debt':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }
};
