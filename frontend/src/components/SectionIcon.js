import React from 'react';

const iconProps = {
  fill: 'none',
  stroke: '#0f6d6b',
  strokeWidth: '1.9',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const sectionIconBadgeStyle = {
  width: '40px',
  height: '40px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, rgba(15, 109, 107, 0.12) 0%, rgba(15, 109, 107, 0.18) 100%)',
  border: '1px solid rgba(15, 109, 107, 0.14)',
  color: '#0f6d6b',
  flex: '0 0 auto',
  marginBottom: '10px',
};

const SectionIcon = ({ variant }) => {
  switch (variant) {
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <path d="M5.5 7.5 12 4l6.5 3.5v7L12 18l-6.5-3.5z" />
          <path d="M12 4v14" />
          <path d="m5.8 7.25 6.2 3.5 6.2-3.5" />
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M4.75 18.25a4.25 4.25 0 0 1 8.5 0" />
          <path d="M15.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M14.25 18.25a3.75 3.75 0 0 1 6.25 0" />
        </svg>
      );
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <path d="M7 4.75h8l3.25 3.25V18A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M15 4.75V8h3.25" />
          <path d="M8.5 11h7" />
          <path d="M8.5 14.5h7" />
        </svg>
      );
    case 'attendance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M8 3.75V6" />
          <path d="M16 3.75V6" />
          <path d="M8 10h8" />
          <path d="m9.25 14.25 1.75 1.75 3.75-4" />
        </svg>
      );
    case 'employees':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <path d="M10 6.75a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z" />
          <path d="M5.75 19.25a4.5 4.5 0 0 1 8.5 0" />
          <path d="M7.5 10.5 10 13l2.5-2.5" />
          <path d="M7.25 19.25v-2.1l2.75-2.65 2.75 2.65v2.1" />
          <path d="M14.25 10.5h4.5l1.25 1.75-3.5 4.75-3.5-4.75z" />
          <path d="M16.5 10.5v6.5" />
          <path d="M14.75 19.25a4.25 4.25 0 0 1 7 0" />
        </svg>
      );
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <path d="M5.5 8.25h12A1.75 1.75 0 0 1 19.25 10v6A1.75 1.75 0 0 1 17.5 17.75h-10A1.75 1.75 0 0 1 5.75 16V9A.75.75 0 0 1 6.5 8.25Z" />
          <path d="M5.75 10.25h11.5A1.75 1.75 0 0 1 19 12v1a1.75 1.75 0 0 1-1.75 1.75H16" />
          <circle cx="15.5" cy="12.5" r="0.75" />
        </svg>
      );
    case 'banknote':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <path d="M4.75 8.25h14.5A1.75 1.75 0 0 1 21 10v4A1.75 1.75 0 0 1 19.25 15.75H4.75A1.75 1.75 0 0 1 3 14v-4a1.75 1.75 0 0 1 1.75-1.75Z" />
          <path d="M7 10.5h2.75" />
          <path d="M14.25 10.5H17" />
          <path d="M7 13.5h2.75" />
          <path d="M14.25 13.5H17" />
          <circle cx="12" cy="12" r="1.4" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <circle cx="10.5" cy="10.5" r="6.25" />
          <path d="M15.25 15.25L20 20" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...iconProps}>
          <path d="M6.5 7.5h11v10h-11z" />
        </svg>
      );
  }
};

export default SectionIcon;
