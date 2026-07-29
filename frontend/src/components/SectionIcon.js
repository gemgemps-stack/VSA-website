import React from 'react';

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
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.5 7.5 12 4l5.5 3.5v6.5L12 17.5l-5.5-3.5z" />
          <path d="M12 17.5V11" />
          <path d="M6.75 7.25 12 10.5l5.25-3.25" />
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M4.75 18.25a4.25 4.25 0 0 1 8.5 0" />
          <path d="M15.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M14.25 18.25a3.75 3.75 0 0 1 6.25 0" />
        </svg>
      );
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M8.5 8h7" />
          <path d="M8.5 11.5h7" />
          <path d="M8.5 15h4.5" />
        </svg>
      );
    case 'attendance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M8 3.75V6" />
          <path d="M16 3.75V6" />
          <path d="M8 10h8" />
          <path d="m9.5 14 1.75 1.75L15 12" />
        </svg>
      );
    case 'employees':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M4.75 19a5.25 5.25 0 0 1 10.5 0" />
          <path d="M16.5 10.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
          <path d="M14.75 19a4.5 4.5 0 0 1 7.5 0" />
        </svg>
      );
    case 'finance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.75 8.5A2.75 2.75 0 0 1 7.5 5.75h9A2.75 2.75 0 0 1 19.25 8.5v7A2.75 2.75 0 0 1 16.5 18.25h-9A2.75 2.75 0 0 1 4.75 15.5z" />
          <path d="M14.5 10.5a2.5 2.5 0 1 1 0 5" />
          <path d="M9.5 9.75V14.5" />
          <path d="M8.1 11.15h2.8" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h12v12H6z" />
        </svg>
      );
  }
};

export default SectionIcon;
