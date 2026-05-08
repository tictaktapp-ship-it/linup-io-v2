interface TfaMethodSelectorProps {
  onSelectTotp: () => void;
  onSelectEmail: () => void;
  showSms?: boolean;
  onSelectSms?: () => void;
}

interface MethodCardProps {
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  disabled?: boolean;
}

function MethodCard({ title, description, badge, onClick, disabled }: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: 'var(--space-4)',
        background: 'var(--color-dark-2)',
        border: '1px solid var(--color-dark-3)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 120ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-brand)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-dark-3)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ color: 'var(--color-surface-0)', fontSize: '14px', fontWeight: 600 }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            padding: '2px 6px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            textTransform: 'uppercase',
          }}>{badge}</span>
        )}
      </div>
      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '13px' }}>{description}</span>
    </button>
  );
}

export function TfaMethodSelector({ onSelectTotp, onSelectEmail, showSms, onSelectSms }: TfaMethodSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <MethodCard
        title="Authenticator App"
        description="Scan a QR code with your authenticator app. Works offline, most secure."
        badge="Recommended"
        onClick={onSelectTotp}
      />
      <MethodCard
        title="Email OTP"
        description="Receive codes by email. No app required."
        onClick={onSelectEmail}
      />
      {showSms && onSelectSms && (
        <MethodCard
          title="SMS OTP"
          description="Receive codes by SMS. Requires phone number."
          onClick={onSelectSms}
        />
      )}
    </div>
  );
}