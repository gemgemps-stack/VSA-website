import React from 'react';

const SearchField = ({ className = '', wrapperProps = {}, ...inputProps }) => (
  <div className={`search-field-with-icon ${className}`} {...wrapperProps}>
    <span className="search-field-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="10.5" cy="10.5" r="6.25" />
        <path d="M15.25 15.25L20 20" />
      </svg>
    </span>
    <input {...inputProps} />
  </div>
);

export default SearchField;
