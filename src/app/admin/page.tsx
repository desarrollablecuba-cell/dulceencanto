'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, User, ArrowRight, Shield, Smartphone, X, Share, PlusCircle } from 'lucide-react';

const AdminPanel = dynamic(
  () => import('@/components/ecommerce/AdminPanel').then((mod) => mod.AdminPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    ),
  }
);

const TOKEN_KEY = 'diaz-admin-token';

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.token);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1E112A 0%, #2E1065 50%, #1E112A 100%)' }}>
      <div className="w-full max-w-md">
        {/* Branding — logo oficial de Dulce Encanto */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full overflow-hidden"
            style={{ boxShadow: '0 8px 24px -4px rgba(168,85,247,0.45), 0 0 0 3px rgba(236,72,153,0.35)' }}
          >
            <img src="/logo-dulce-encanto.webp" alt="Dulce Encanto" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>Dulce Encanto</h1>
          <p className="text-brand font-semibold tracking-wider text-sm uppercase mt-1">Panel de Administración</p>
        </div>

        {/* Login Card */}
        <Card className="border-gray-700 bg-gray-800/50 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white text-center">Iniciar Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-100">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <Input
                    id="username"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-300 focus:border-brand focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-100">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 z-10 pointer-events-none" />
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-300 focus:border-brand focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand-dark text-white font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Iniciar Sesión
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <a
                href="/"
                className="flex items-center justify-center gap-2 text-sm text-gray-200 hover:text-brand transition-colors"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Volver a la Tienda
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Detecta si el dispositivo actual es móvil (teléfono/tablet).
 * En PC/portátil el botón “Instalar App” del header NO se muestra: la app
 * se instala como acceso directo móvil y en escritorio solo confunde
 * (fix V52.5 — el negocio lo reportó viéndolo en la vista PC).
 */
function useIsMobileDevice(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
      const narrowViewport = window.innerWidth <= 900;
      const uaMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
      setMobile((coarsePointer && (narrowViewport || uaMobile)) || uaMobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const [showInstall, setShowInstall] = useState(false);
  // ⭐ V52.5 — el acceso “Instalar App” solo tiene sentido en móvil
  const isMobile = useIsMobileDevice();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo-dulce-encanto.webp"
              alt="Logo Dulce Encanto"
              className="w-10 h-10 rounded-full object-cover"
              style={{ boxShadow: '0 0 0 2px rgba(236,72,153,0.5)' }}
            />
            <div>
              <h1 className="text-base font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>Dulce Encanto — Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* ⭐ V52.5 — solo visible en móvil (en PC no aplica instalar app) */}
            {isMobile && (
              <button
                onClick={() => setShowInstall(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white transition-colors hover:bg-white/10"
                style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                title="Instalar como aplicación"
              >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}
            <a
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-100 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Ver Tienda
              <ArrowRight className="h-4 w-4" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-200 hover:text-red-400 hover:bg-gray-800"
              onClick={onLogout}
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Panel Content */}
      <AdminPanel />

      {/* Install Instructions Modal */}
      {showInstall && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(46,16,101,0.8)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowInstall(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 relative" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
              <button onClick={() => setShowInstall(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/20" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white" style={{ fontSize: '20px', fontFamily: 'Georgia, serif' }}>Instalar App</h2>
                  <p className="text-xs" style={{ color: '#E9D5FF' }}>Accede más rápido desde tu móvil</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Android / Chrome */}
              <div className="rounded-2xl p-4" style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
                <p className="font-bold text-sm mb-2" style={{ color: '#2E1065' }}>🤖 Android (Chrome)</p>
                <ol className="space-y-1.5 text-xs" style={{ color: '#4B5563' }}>
                  <li>1. Toca el ícono <Share className="inline h-3 w-3" /> (Compartir) en la barra del navegador</li>
                  <li>2. Selecciona <strong>"Agregar a la pantalla de inicio"</strong></li>
                  <li>3. Confirma con <strong>"Agregar"</strong></li>
                </ol>
                <p className="text-[11px] mt-2 italic" style={{ color: '#7E22CE' }}>
                  💡 O usa el botón "Instalar" si aparece abajo en la pantalla.
                </p>
              </div>

              {/* iOS / Safari */}
              <div className="rounded-2xl p-4" style={{ background: '#FCE7F3', border: '1px solid #FBCFE8' }}>
                <p className="font-bold text-sm mb-2" style={{ color: '#2E1065' }}>🍎 iPhone (Safari)</p>
                <ol className="space-y-1.5 text-xs" style={{ color: '#4B5563' }}>
                  <li>1. Toca el botón <Share className="inline h-3 w-3" /> (Compartir) abajo en Safari</li>
                  <li>2. Desplázate y toca <strong>"Agregar a inicio"</strong></li>
                  <li>3. Toca <strong>"Agregar"</strong> para confirmar</li>
                </ol>
              </div>

              {/* Desktop / Chrome */}
              <div className="rounded-2xl p-4" style={{ background: '#FAF5FF', border: '1px solid #E9D5FF' }}>
                <p className="font-bold text-sm mb-2" style={{ color: '#2E1065' }}>💻 Computadora (Chrome/Edge)</p>
                <ol className="space-y-1.5 text-xs" style={{ color: '#4B5563' }}>
                  <li>1. Busca el ícono <PlusCircle className="inline h-3 w-3" /> en la barra de direcciones</li>
                  <li>2. Haz clic y selecciona <strong>"Instalar"</strong></li>
                </ol>
              </div>

              <div className="rounded-2xl p-3 text-center" style={{ background: '#FEF3C7' }}>
                <p className="text-xs" style={{ color: '#92400E' }}>
                  ⭐ Una vez instalada, la app se abre en pantalla completa, sin barra del navegador.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPageContent() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setChecking(false);
        return;
      }

      try {
        const res = await fetch(`/api/admin/auth/verify?token=${encodeURIComponent(savedToken)}`);
        const data = await res.json();
        if (data.valid) {
          setToken(savedToken);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <AdminLayout onLogout={handleLogout} />;
}

export default function AdminPage() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AdminPageContent />
    </QueryClientProvider>
  );
}
