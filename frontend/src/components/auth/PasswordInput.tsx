import { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  autoComplete?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Password',
  id,
  autoComplete = 'current-password',
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          height: '36px',
          padding: '0 40px 0 var(--space-3)',
          border: '1px solid var(--color-dark-3)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-dark-2)',
          color: 'var(--color-surface-0)',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--color-border-focus)';
          e.target.style.boxShadow = '0 0 0 3px rgba(140,0,180,0.15)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--color-dark-3)';
          e.target.style.boxShadow = 'none';
        }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: 'var(--color-text-tertiary)',
          fontSize: '12px',
          padding: '0',
          lineHeight: 1,
        }}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}