'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCustomerStore, type Customer, type SavedRecipient } from '@/store/customer-store';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, User, Mail, Phone, Lock, LogIn, UserPlus, LogOut, Sparkles,
  Plus, Pencil, Trash2, MapPin, Zap, ShieldCheck, Gift, Heart, CheckCircle2, Loader2,
  Globe, Truck,
} from 'lucide-react';
import { ZoneSelector } from '@/components/ecommerce/ZoneSelector';
import { CountryFlag, COUNTRY_INFO, getCountryName } from '@/components/ecommerce/CountryFlag';
import { PasswordInput } from '@/components/ui/password-input';

type Mode = 'welcome' | 'login' | 'register';

export function CustomerView() {
  const { customer, token, hydrated, hydrate, setSession, logout } = useCustomerStore();
  const setView = useAppStore((s) => s.setView);
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('welcome');

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  // Si está logueado, mostrar perfil
  if (customer && token) {
    return <ProfileView customer={customer} onLogout={logout} />;
  }

  // Pantallas de auth
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-brand-light via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Shapes decorativos */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-light/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-md mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="icon"
          className="mb-4"
          onClick={() => setView('home')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {mode === 'welcome' && (
          <WelcomeScreen onRegister={() => setMode('register')} onLogin={() => setMode('login')} />
        )}

        {mode === 'register' && (
          <AuthForm
            mode="register"
            onBack={() => setMode('welcome')}
            onSuccess={(c, t) => {
              setSession(c, t);
              toast({ title: '¡Cuenta creada!', description: `Bienvenido/a ${c.name}` });
            }}
          />
        )}

        {mode === 'login' && (
          <AuthForm
            mode="login"
            onBack={() => setMode('welcome')}
            onSuccess={(c, t) => {
              setSession(c, t);
              toast({ title: 'Sesión iniciada', description: `Hola de nuevo, ${c.name}` });
            }}
          />
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANTALLA DE BIENVENIDA (con CTA animado)
// ════════════════════════════════════════════════════════════════════════════

function WelcomeScreen({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3 pt-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand to-brand-dark shadow-lg shadow-brand/30 mb-2 animate-bounce" style={{ animationDuration: '2s' }}>
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Regístrate para una
          <span className="block bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent">
            mejor experiencia
          </span>
        </h1>
        <p className="text-gray-600 text-sm">
          Guarda los datos de tus familiares en Cuba y autocompleta tus envíos en segundos.
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        {[
          { icon: Zap, title: 'Autocompletado inteligente', desc: 'Datos de destinatarios guardados al instante', color: 'text-brand' },
          { icon: Gift, title: 'Historial de pedidos', desc: 'Revisa y repite tus envíos anteriores', color: 'text-rose-500' },
          { icon: ShieldCheck, title: 'Tus datos seguros', desc: 'Perfil protegido con contraseña', color: 'text-green-500' },
          { icon: Heart, title: 'Familiares guardados', desc: 'Mamá, tío, prima… guardados una sola vez', color: 'text-pink-500' },
        ].map((b) => (
          <div key={b.title} className="flex items-center gap-3 bg-white/70 backdrop-blur rounded-xl p-3 border border-brand-light">
            <div className={`shrink-0 ${b.color}`}>
              <b.icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{b.title}</p>
              <p className="text-xs text-gray-500">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onRegister}
          className="w-full h-12 bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark text-white text-base font-semibold shadow-lg shadow-brand/30 transition-transform hover:scale-[1.02]"
        >
          <UserPlus className="mr-2 h-5 w-5" />
          Crear cuenta gratis
        </Button>
        <Button
          onClick={onLogin}
          variant="outline"
          className="w-full h-11 border-brand-light text-brand-dark hover:bg-brand-light"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Ya tengo cuenta
        </Button>
      </div>

      <p className="text-center text-xs text-gray-400 pt-2">
        Solo necesitas nombre, teléfono y correo.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FORMULARIO DE LOGIN / REGISTRO
// ════════════════════════════════════════════════════════════════════════════

interface AuthFormProps {
  mode: 'login' | 'register';
  onBack: () => void;
  onSuccess: (customer: Customer, token: string) => void;
}

function AuthForm({ mode, onBack, onSuccess }: AuthFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    country: 'US',
    address: '',
    deliveryZoneId: '',
  });

  // Países activos + zonas de delivery (cargados del servidor)
  const [activeCountries, setActiveCountries] = useState<string[]>(['US', 'CU']);
  const [deliveryZones, setDeliveryZones] = useState<Array<{
    id: string; name: string; description: string; price: number;
    estimatedTime: string; active: boolean; order: number;
  }>>([]);
  const [selectedZone, setSelectedZone] = useState<{ id: string; name: string } | null>(null);

  const isRegister = mode === 'register';

  // Cargar países activos + zonas de delivery al montar (solo en modo registro)
  useEffect(() => {
    if (!isRegister) return;
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((d) => {
        if (d?.activeCountries) {
          const codes = String(d.activeCountries).split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
          if (codes.length > 0) {
            setActiveCountries(codes);
            setForm((f) => ({ ...f, country: codes[0] }));
          }
        }
      })
      .catch(() => {});
    fetch('/api/delivery-zones')
      .then((r) => r.json())
      .then((d) => {
        const zones = Array.isArray(d) ? d.filter((z: { active?: boolean }) => z.active) : [];
        setDeliveryZones(zones);
      })
      .catch(() => {});
  }, [isRegister]);

  const isCuba = form.country === 'CU';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      if (!form.name || !form.phone || !form.email || !form.password) {
        toast({ title: 'Campos requeridos', description: 'Completa todos los campos.', variant: 'destructive' });
        return;
      }
      if (form.password.length < 6) {
        toast({ title: 'Contraseña muy corta', description: 'Mínimo 6 caracteres.', variant: 'destructive' });
        return;
      }
      if (isCuba) {
        if (!form.address) {
          toast({ title: 'Dirección requerida', description: 'Ingresa tu dirección para autocompletar tus envíos.', variant: 'destructive' });
          return;
        }
        if (!form.deliveryZoneId) {
          toast({ title: 'Zona requerida', description: 'Selecciona tu zona de delivery.', variant: 'destructive' });
          return;
        }
      }
    } else {
      if (!form.email || !form.password) {
        toast({ title: 'Campos requeridos', description: 'Ingresa correo y contraseña.', variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/customers/register' : '/api/customers/login';
      const body = isRegister
        ? {
            name: form.name,
            phone: form.phone,
            email: form.email,
            password: form.password,
            country: form.country,
            address: form.address,
            deliveryZoneId: form.deliveryZoneId || undefined,
            deliveryZoneName: selectedZone?.name,
          }
        : { email: form.email, password: form.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Error desconocido');
      }
      // Notificación nativa de la app (toast) al registrar
      if (isRegister) {
        toast({
          title: '¡Cuenta creada correctamente!',
          description: `Bienvenido/a a Díaz Premium Envíos, ${data.customer.name}.`,
          duration: 5000,
        });
      }
      onSuccess(data.customer, data.token);
    } catch (err) {
      toast({
        title: isRegister ? 'No se pudo registrar' : 'No se pudo iniciar sesión',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-brand-light">
      <CardHeader>
        <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <CardTitle className="flex items-center gap-2 text-xl">
          {isRegister ? <UserPlus className="h-5 w-5 text-brand" /> : <LogIn className="h-5 w-5 text-brand" />}
          {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              {/* Selector de país */}
              <div className="space-y-2">
                <Label htmlFor="country" className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-gray-400" /> País
                </Label>
                <div className="flex gap-2">
                  {/* Bandera del país seleccionado (imagen real, no emoji) */}
                  <div className="flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 shrink-0">
                    <CountryFlag code={form.country} showAbbr={false} size="md" />
                  </div>
                  <select
                    id="country"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value, address: '', deliveryZoneId: '' })}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                  >
                    {activeCountries.map((code) => {
                      const info = COUNTRY_INFO[code];
                      return (
                        <option key={code} value={code}>
                          {info ? `${info.abbr} — ${info.name}` : code}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {isCuba && (
                  <p className="text-xs text-brand-dark bg-brand-light border border-brand-light rounded-lg p-2 mt-1 flex items-center gap-1.5">
                    <CountryFlag code="CU" showAbbr={false} />
                    Como estás en Cuba, necesitamos tu dirección y zona de delivery para autocompletar tus pedidos cuando envíes para ti mismo(a).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" /> Nombre y Apellidos
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400" /> Teléfono (con código de país)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={isCuba ? '+53 5XXX XXXX' : '+1 555 123 4567'}
                  required
                />
              </div>

              {/* Campos adicionales para Cuba: dirección + zona */}
              {isCuba && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" /> Dirección (calle, número, municipio) *
                    </Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Calle 1 Norte #45 e/ Ave. 2 y 3, Rpto. Latino"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-gray-400" /> Zona de Delivery *
                    </Label>
                    {deliveryZones.length === 0 ? (
                      <p className="text-xs text-gray-500">Cargando zonas…</p>
                    ) : (
                      <ZoneSelector
                        zones={deliveryZones}
                        value={form.deliveryZoneId}
                        onChange={(zoneId) => {
                          setForm({ ...form, deliveryZoneId: zoneId });
                          const z = deliveryZones.find((zz) => zz.id === zoneId);
                          setSelectedZone(z ? { id: z.id, name: z.name } : null);
                        }}
                        placeholder="Busca y selecciona tu zona…"
                      />
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" /> Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="new-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-gray-400" /> Contraseña
            </Label>
            <PasswordInput
              id="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={isRegister ? 'Mínimo 6 caracteres' : '••••••••'}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark text-white font-medium"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando…</>
            ) : isRegister ? (
              <><UserPlus className="mr-2 h-4 w-4" /> Crear cuenta</>
            ) : (
              <><LogIn className="mr-2 h-4 w-4" /> Ingresar</>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          {isRegister ? (
            <>¿Ya tienes cuenta? <button onClick={() => onBack()} className="text-brand-dark font-medium hover:underline">Inicia sesión</button></>
          ) : (
            <>¿No tienes cuenta? <button onClick={() => onBack()} className="text-brand-dark font-medium hover:underline">Regístrate gratis</button></>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PERFIL DEL CLIENTE (logueado)
// ════════════════════════════════════════════════════════════════════════════

function ProfileView({ customer, onLogout }: { customer: Customer; onLogout: () => void }) {
  const setView = useAppStore((s) => s.setView);
  const { toast } = useToast();
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const [recipients, setRecipients] = useState<SavedRecipient[]>(customer.savedRecipients ?? []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<SavedRecipient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [passwordEditOpen, setPasswordEditOpen] = useState(false);

  // Refrescar recipients desde el servidor al montar
  const refreshRecipients = useCallback(async () => {
    try {
      const token = localStorage.getItem('diaz-customer-token');
      const res = await fetch('/api/customers/recipients', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const newRecipients = data.recipients ?? [];
        setRecipients(newRecipients);
        // Sincronizar con el store global para que el checkout vea los destinatarios actualizados.
        // Usamos getState() para evitar re-crear el callback y prevenir loops infinitos.
        const latestCustomer = useCustomerStore.getState().customer;
        if (latestCustomer) {
          updateCustomer({ ...latestCustomer, savedRecipients: newRecipients });
        }
      }
    } catch {
      /* ignore */
    }
  }, [updateCustomer]);

  useEffect(() => {
    refreshRecipients();
    // Solo al montar, no cada vez que cambia refreshRecipients
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-brand-light/40 via-white to-brand-light/40">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setView('home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setProfileEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Editar Perfil
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-1" /> Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Perfil */}
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {customer.email}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone}
                </p>
                {customer.country === 'CU' && customer.address && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" /> {customer.address}
                    {customer.deliveryZoneName && <span className="text-xs text-gray-400">· {customer.deliveryZoneName}</span>}
                  </p>
                )}
                {customer.country && customer.country !== 'CU' && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <CountryFlag code={customer.country} />
                    <span>{getCountryName(customer.country)}</span>
                  </p>
                )}
              </div>
              <Badge className="bg-brand-light text-brand-dark border-brand-light">
                <Sparkles className="h-3 w-3 mr-1" /> Cliente
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Destinatarios guardados */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-pink-500" />
                Familiares Guardados
              </CardTitle>
              <Button
                size="sm"
                className="bg-brand hover:bg-brand-dark text-white"
                onClick={() => { setEditingRecipient(null); setDialogOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-1" /> Nuevo
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Guarda los datos de tus familiares en Cuba. Se autocompletarán cuando hagas un envío.
            </p>
          </CardHeader>
          <CardContent>
            {recipients.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">Aún no tienes destinatarios guardados</p>
                <p className="text-sm mt-1 mb-4">Agrega a tus familiares para autocompletar tus envíos más rápido.</p>
                <Button
                  className="bg-brand hover:bg-brand-dark text-white"
                  onClick={() => { setEditingRecipient(null); setDialogOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Agregar primer destinatario
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recipients.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-gray-200 p-3.5 hover:border-brand-light hover:bg-brand-light/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge className="bg-brand-light text-brand-dark border-brand-light text-[11px]">
                        {r.label}
                      </Badge>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingRecipient(r); setDialogOpen(true); }}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(r.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {r.phone}
                    </p>
                    <p className="text-xs text-gray-500 flex items-start gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {r.address}
                    </p>
                    {r.notes && (
                      <p className="text-[11px] text-gray-400 italic mt-1.5 line-clamp-1">📝 {r.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog crear/editar destinatario */}
      <RecipientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingRecipient}
        onSaved={() => { refreshRecipients(); }}
      />

      {/* Confirmar eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar destinatario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El destinatario será eliminado de tu perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={async () => {
                if (!deleteId) return;
                try {
                  const token = localStorage.getItem('diaz-customer-token');
                  await fetch(`/api/customers/recipients/${deleteId}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                  setDeleteId(null);
                  refreshRecipients();
                  toast({ title: 'Destinatario eliminado' });
                } catch {
                  toast({ title: 'Error', description: 'No se pudo eliminar.', variant: 'destructive' });
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Editar perfil */}
      <ProfileEditDialog
        open={profileEditOpen}
        onOpenChange={setProfileEditOpen}
        customer={customer}
        onSaved={(updated) => {
          updateCustomer(updated);
          toast({ title: 'Perfil actualizado', description: 'Tus datos se guardaron correctamente.' });
        }}
        onChangePassword={() => {
          setProfileEditOpen(false);
          setPasswordEditOpen(true);
        }}
      />

      {/* Cambiar contraseña */}
      <PasswordChangeDialog
        open={passwordEditOpen}
        onOpenChange={setPasswordEditOpen}
        onSaved={() => {
          toast({ title: 'Contraseña cambiada', description: 'Tu contraseña se actualizó correctamente.' });
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DIALOG PARA CREAR / EDITAR DESTINATARIO
// ════════════════════════════════════════════════════════════════════════════

interface RecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SavedRecipient | null;
  onSaved: () => void;
}

function RecipientDialog({ open, onOpenChange, editing, onSaved }: RecipientDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: '',
    name: '',
    phone: '',
    address: '',
    notes: '',
    deliveryZoneId: '',
  });
  const [deliveryZones, setDeliveryZones] = useState<Array<{
    id: string; name: string; description: string; price: number;
    estimatedTime: string; active: boolean; order: number;
  }>>([]);

  useEffect(() => {
    if (open) {
      setForm({
        label: editing?.label ?? '',
        name: editing?.name ?? '',
        phone: editing?.phone ?? '',
        address: editing?.address ?? '',
        notes: editing?.notes ?? '',
        deliveryZoneId: editing?.deliveryZoneId ?? '',
      });
      // Cargar zonas de delivery
      fetch('/api/delivery-zones')
        .then(r => r.json())
        .then(d => setDeliveryZones(Array.isArray(d) ? d.filter((z: { active?: boolean }) => z.active) : []))
        .catch(() => {});
    }
  }, [open, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.name || !form.phone || !form.address) {
      toast({ title: 'Campos requeridos', description: 'Etiqueta, nombre, teléfono y dirección son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('diaz-customer-token');
      const endpoint = editing
        ? `/api/customers/recipients/${editing.id}`
        : '/api/customers/recipients';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      toast({
        title: editing ? 'Destinatario actualizado' : 'Destinatario guardado',
        description: `${form.label} — ${form.name}`,
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editing ? <Pencil className="h-5 w-5 text-brand" /> : <Plus className="h-5 w-5 text-brand" />}
            {editing ? 'Editar destinatario' : 'Nuevo destinatario'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Etiqueta (cómo lo identificas) *</Label>
            <Input
              id="label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Ej: Mamá, Tío Pedro, Prima Ana…"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-name">Nombre Completo *</Label>
              <Input
                id="r-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="María García"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-phone">Teléfono *</Label>
              <Input
                id="r-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+53 5XXX XXXX"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-address">Dirección de Entrega *</Label>
            <Input
              id="r-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Calle 1 Norte #45 e/ Ave. 2 y 3, Rpto. Latino"
              required
            />
          </div>
          {/* Zona de Delivery */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-gray-400" /> Zona de Envío
            </Label>
            {deliveryZones.length > 0 ? (
              <ZoneSelector
                zones={deliveryZones}
                value={form.deliveryZoneId}
                onChange={(zoneId) => setForm({ ...form, deliveryZoneId: zoneId })}
                placeholder="Busca y selecciona la zona…"
              />
            ) : (
              <p className="text-xs text-gray-500">Cargando zonas…</p>
            )}
            <p className="text-[11px] text-gray-500">
              Al configurar la zona, se autocompletará automáticamente cuando envíes a este familiar.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-notes">Notas (opcional)</Label>
            <Textarea
              id="r-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ej: Casa con reja verde, frente al parque. Llamar al llegar."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-brand hover:bg-brand-dark text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {editing ? 'Guardar cambios' : 'Guardar destinatario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DIALOG EDITAR PERFIL DEL CLIENTE
// ════════════════════════════════════════════════════════════════════════════

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onSaved: (updated: Customer) => void;
  onChangePassword: () => void;
}

function ProfileEditDialog({ open, onOpenChange, customer, onSaved, onChangePassword }: ProfileEditDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    country: customer.country || 'US',
    address: customer.address || '',
    deliveryZoneId: customer.deliveryZoneId || '',
  });
  const [selectedZoneName, setSelectedZoneName] = useState(customer.deliveryZoneName || '');

  // Países activos + zonas
  const [activeCountries, setActiveCountries] = useState<string[]>(['US', 'CU']);
  const [deliveryZones, setDeliveryZones] = useState<Array<{
    id: string; name: string; description: string; price: number;
    estimatedTime: string; active: boolean; order: number;
  }>>([]);

  // (COUNTRY_INFO se importa desde @/components/ecommerce/CountryFlag)

  useEffect(() => {
    if (!open) return;
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      country: customer.country || 'US',
      address: customer.address || '',
      deliveryZoneId: customer.deliveryZoneId || '',
    });
    setSelectedZoneName(customer.deliveryZoneName || '');
    fetch('/api/siteconfig').then(r => r.json()).then(d => {
      if (d?.activeCountries) {
        const codes = String(d.activeCountries).split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        if (codes.length > 0) setActiveCountries(codes);
      }
    }).catch(() => {});
    fetch('/api/delivery-zones').then(r => r.json()).then(d => {
      setDeliveryZones(Array.isArray(d) ? d.filter((z: { active?: boolean }) => z.active) : []);
    }).catch(() => {});
  }, [open, customer]);

  const isCuba = form.country === 'CU';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) {
      toast({ title: 'Campos requeridos', description: 'Nombre, teléfono y correo son obligatorios.', variant: 'destructive' });
      return;
    }
    if (isCuba && (!form.address || !form.deliveryZoneId)) {
      toast({ title: 'Campos requeridos', description: 'Dirección y zona son obligatorias para Cuba.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('diaz-customer-token');
      const res = await fetch('/api/customers/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          deliveryZoneName: selectedZoneName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      onSaved(data.customer);
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-brand" /> Editar Perfil
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-country">País</Label>
            <div className="flex gap-2">
              {/* Bandera del país seleccionado (imagen real, no emoji) */}
              <div className="flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 shrink-0">
                <CountryFlag code={form.country} showAbbr={false} size="md" />
              </div>
              <select
                id="p-country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
              >
                {activeCountries.map((code) => {
                  const info = COUNTRY_INFO[code];
                  return <option key={code} value={code}>{info ? `${info.abbr} — ${info.name}` : code}</option>;
                })}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-name">Nombre y Apellidos *</Label>
            <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-phone">Teléfono *</Label>
            <Input id="p-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-email">Correo Electrónico *</Label>
            <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>

          {isCuba && (
            <>
              <div className="space-y-2">
                <Label htmlFor="p-address">Dirección *</Label>
                <Input id="p-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle, número, municipio" required />
              </div>
              <div className="space-y-2">
                <Label>Zona de Delivery *</Label>
                {deliveryZones.length > 0 ? (
                  <ZoneSelector
                    zones={deliveryZones}
                    value={form.deliveryZoneId}
                    onChange={(zoneId) => {
                      setForm({ ...form, deliveryZoneId: zoneId });
                      const z = deliveryZones.find((zz) => zz.id === zoneId);
                      setSelectedZoneName(z?.name || '');
                    }}
                    placeholder="Busca y selecciona tu zona…"
                  />
                ) : (
                  <p className="text-xs text-gray-500">Cargando zonas…</p>
                )}
              </div>
            </>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="ghost" onClick={onChangePassword} className="text-brand-dark">
              <Lock className="h-4 w-4 mr-1" /> Cambiar contraseña
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-dark text-white">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DIALOG CAMBIAR CONTRASEÑA
// ════════════════════════════════════════════════════════════════════════════

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function PasswordChangeDialog({ open, onOpenChange, onSaved }: PasswordChangeDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (open) setForm({ currentPassword: '', newPassword: '' });
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword) {
      toast({ title: 'Campos requeridos', description: 'Completa ambos campos.', variant: 'destructive' });
      return;
    }
    if (form.newPassword.length < 6) {
      toast({ title: 'Contraseña muy corta', description: 'Mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('diaz-customer-token');
      const res = await fetch('/api/customers/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand" /> Cambiar Contraseña
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pw">Contraseña actual *</Label>
            <PasswordInput id="current-pw" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">Nueva contraseña *</Label>
            <PasswordInput id="new-pw" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} placeholder="Mínimo 6 caracteres" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-dark text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Cambiar contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
