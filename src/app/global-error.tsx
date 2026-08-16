'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px',
          background: '#fff',
          color: '#1f2937'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '28px',
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#dc2626' }}>
              Error de carga
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>
            <pre style={{
              background: '#f3f4f6',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '11px',
              overflow: 'auto',
              textAlign: 'left',
              marginBottom: '16px',
              maxWidth: '100%',
            }}>
              {error?.message || 'Error desconocido'}
            </pre>
            <button
              onClick={() => { if (typeof reset === 'function') reset(); else window.location.reload(); }}
              style={{
                padding: '10px 28px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Recargar Página
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
