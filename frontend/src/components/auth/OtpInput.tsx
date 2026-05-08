import { useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}

export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, '').split('').slice(0, length);

  function handleChange(i: number, char: string) {
    const cleaned = char.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, idx) => (idx === i ? cleaned : d)).join('').replace(/ /g, '');
    onChange(next);
    if (cleaned && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : (digits[i] ?? '')}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: '44px',
            height: '52px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: 600,
            border: '1px solid var(--color-dark-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-dark-2)',
            color: 'var(--color-surface-0)',
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
      ))}
    </div>
  );
}