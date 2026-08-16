'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'system-ui' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '12px' }}>Error de carga</h2>
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>
            Ocurrió un error al cargar la aplicación. Intenta recargar la página.
          </p>
          <pre style={{ background: '#f3f4f6', padding: '12px', borderRadius: '8px', fontSize: '12px', overflow: 'auto' }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ marginTop: '12px', padding: '8px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
