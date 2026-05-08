import { OtpInput } from './OtpInput';

interface QrCodeSetupProps {
  qrDataUrl: string;
  secret: string;
  code: string;
  onCodeChange: (v: string) => void;
  onConfirm: () => void;
  onShowBackupCodes: () => void;
  loading?: boolean;
  error?: string;
}

export function QrCodeSetup({
  qrDataUrl,
  secret,
  code,
  onCodeChange,
  onConfirm,
  onShowBackupCodes,
  loading,
  error,
}: QrCodeSetupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', alignItems: 'center' }}>
      <img src={qrDataUrl} alt="TOTP QR code" width={128} height={128} style={{ borderRadius: 'var(--radius-md)' }} />

      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '13px', marginBottom: 'var(--space-2)' }}>
          Can&apos;t scan? Enter this key manually:
        </p>
        <code style={{
          display: 'block',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--color-dark-2)',
          border: '1px solid var(--color-dark-3)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-surface-0)',
          letterSpacing: '0.1em',
          wordBreak: 'break-all',
        }}>{secret}</code>
      </div>

      <OtpInput value={code} onChange={onCodeChange} />

      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: '13px', textAlign: 'center' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={loading || code.length < 6}
        style={{
          width: '100%',
          height: '40px',
          background: code.length < 6 || loading ? 'var(--color-dark-3)' : 'var(--color-brand)',
          color: 'var(--color-text-on-purple)',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          fontSize: '13px',
          fontWeight: 600,
          transition: 'background 120ms ease',
          cursor: code.length < 6 || loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Verifying...' : 'Confirm and finish'}
      </button>

      <button
        type="button"
        onClick={onShowBackupCodes}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-tertiary)',
          fontSize: '13px',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Show backup codes
      </button>
    </div>
  );
}