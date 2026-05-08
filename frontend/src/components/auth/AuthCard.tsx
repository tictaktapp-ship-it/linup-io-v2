import type { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-dark-0)',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--color-dark-1)',
        border: '1px solid var(--color-dark-3)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-10)',
        boxShadow: 'var(--shadow-medium)',
      }}>
        {children}
      </div>
    </div>
  );
}