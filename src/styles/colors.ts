/**
 * Paleta de colores HabiCapital
 * Extraída del diseño de referencia
 */

export const colors = {
  // Colores principales - Púrpura
  primary: {
    DEFAULT: '#8B5CF6',
    dark: '#7C3AED',
    light: '#A78BFA',
    lighter: '#EDE9FE',
  },

  // Estados - Verde (Éxito/Completo)
  success: {
    DEFAULT: '#10B981',
    light: '#34D399',
    lighter: '#D1FAE5',
  },

  // Estados - Amarillo (Advertencia/Pendiente)
  warning: {
    DEFAULT: '#F59E0B',
    light: '#FBBF24',
    lighter: '#FEF3C7',
  },

  // Estados - Rojo (Error/Rechazado)
  error: {
    DEFAULT: '#EF4444',
    light: '#F87171',
    lighter: '#FEE2E2',
  },

  // Escala de grises
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Colores base
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Clases de Tailwind CSS para usar en componentes
 */
export const tailwindColors = {
  // Backgrounds
  bg: {
    primary: 'bg-[#8B5CF6]',
    primaryDark: 'bg-[#7C3AED]',
    primaryLight: 'bg-[#A78BFA]',
    primaryLighter: 'bg-[#EDE9FE]',
    
    success: 'bg-[#10B981]',
    successLight: 'bg-[#34D399]',
    successLighter: 'bg-[#D1FAE5]',
    
    warning: 'bg-[#F59E0B]',
    warningLight: 'bg-[#FBBF24]',
    warningLighter: 'bg-[#FEF3C7]',
    
    error: 'bg-[#EF4444]',
    errorLight: 'bg-[#F87171]',
    errorLighter: 'bg-[#FEE2E2]',
  },

  // Text colors
  text: {
    primary: 'text-[#8B5CF6]',
    primaryDark: 'text-[#7C3AED]',
    
    success: 'text-[#10B981]',
    successDark: 'text-[#059669]',
    
    warning: 'text-[#F59E0B]',
    warningDark: 'text-[#D97706]',
    
    error: 'text-[#EF4444]',
    errorDark: 'text-[#DC2626]',
    
    gray: 'text-[#6B7280]',
    grayDark: 'text-[#374151]',
  },

  // Border colors
  border: {
    primary: 'border-[#8B5CF6]',
    success: 'border-[#10B981]',
    warning: 'border-[#F59E0B]',
    error: 'border-[#EF4444]',
    gray: 'border-[#E5E7EB]',
    grayDark: 'border-[#D1D5DB]',
  },
} as const;

/**
 * Utilidad para obtener colores de estado según condición
 */
export const getStatusColors = (status: 'complete' | 'incomplete' | 'pending' | 'approved' | 'rejected') => {
  switch (status) {
    case 'complete':
    case 'approved':
      return {
        bg: 'bg-[#D1FAE5]',
        text: 'text-[#059669]',
        border: 'border-[#10B981]',
        dot: 'bg-[#10B981]',
      };
    case 'incomplete':
    case 'pending':
      return {
        bg: 'bg-[#FEF3C7]',
        text: 'text-[#D97706]',
        border: 'border-[#F59E0B]',
        dot: 'bg-[#F59E0B]',
      };
    case 'rejected':
      return {
        bg: 'bg-[#FEE2E2]',
        text: 'text-[#DC2626]',
        border: 'border-[#EF4444]',
        dot: 'bg-[#EF4444]',
      };
    default:
      return {
        bg: 'bg-[#F3F4F6]',
        text: 'text-[#6B7280]',
        border: 'border-[#E5E7EB]',
        dot: 'bg-[#9CA3AF]',
      };
  }
};

