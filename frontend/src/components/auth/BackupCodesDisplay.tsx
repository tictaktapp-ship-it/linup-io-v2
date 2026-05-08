interface BackupCodesDisplayProps {
  codes: string[];
  onContinue: () => void;
}

export function BackupCodesDisplay({ codes, onContinue }: BackupCodesDisplayProps) {
  function handleCopy() {
    void navigator.clipboard.writeText(codes.join('\n'));
  }

  function handleDownload() {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linup-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{
        background: 'var(--color-dark-2)',
        border: '1px solid var(--color-dark-3)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-2)',
      }}>
        {codes.map((code, i) => (
          <code key={i} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-surface-0)',
            letterSpacing: '0.05em',
          }}>{code}</code>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1,
            height: '36px',
            background: 'var(--color-dark-2)',
            border: '1px solid var(--color-dark-3)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-surface-0)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Copy codes
        </button>
        <button
          type="button"
          onClick={handleDownload}
          style={{
            flex: 1,
            height: '36px',
            background: 'var(--color-dark-2)',
            border: '1px solid var(--color-dark-3)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-surface-0)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Download
        </button>
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{
          width: '100%',
          height: '40px',
          background: 'var(--color-brand)',
          color: 'var(--color-text-on-purple)',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        I&apos;ve saved my backup codes
      </button>
    </div>
  );
}