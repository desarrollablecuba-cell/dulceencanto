'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Save, Check, FolderOpen } from 'lucide-react';
import {
  serializeTheme,
  parseTheme,
  type ThemeTokens,
} from '@/lib/themes';

interface SavedTheme {
  id: string;
  name: string;
  theme: ThemeTokens;
  createdAt: string;
}

interface SavedThemesGalleryProps {
  /** JSON string de array de SavedTheme. */
  value: string;
  /** Tema actual activo (para guardar en la galería). */
  currentTheme: ThemeTokens;
  /** Callback cuando cambia la galería (recibe JSON string). */
  onChange: (v: string) => void;
  /** Callback para aplicar un tema guardado al config actual. */
  onApplyTheme: (theme: ThemeTokens) => void;
}

function parseSavedThemes(json: string): SavedTheme[] {
  if (!json || !json.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s: unknown): s is SavedTheme => {
      const t = s as SavedTheme;
      return t && typeof t.id === 'string' && typeof t.name === 'string' && t.theme;
    });
  } catch {
    return [];
  }
}

/**
 * Galería de diseños guardados.
 *
 * Permite al admin:
 *  - Guardar el tema actual con un nombre personalizado.
 *  - Ver todos los diseños guardados (con preview de colores).
 *  - Aplicar un diseño guardado al config actual.
 *  - Eliminar diseños guardados.
 *
 * Los diseños se persisten en SiteConfig.savedThemes (JSON string).
 */
export function SavedThemesGallery({
  value,
  currentTheme,
  onChange,
  onApplyTheme,
}: SavedThemesGalleryProps) {
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(parseSavedThemes(value));
  const [newName, setNewName] = useState('');
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const persist = (next: SavedTheme[]) => {
    setSavedThemes(next);
    onChange(JSON.stringify(next));
  };

  const handleSave = () => {
    const name = newName.trim() || `Diseño ${savedThemes.length + 1}`;
    const newEntry: SavedTheme = {
      id: `theme-${Date.now()}`,
      name,
      theme: JSON.parse(JSON.stringify(currentTheme)) as ThemeTokens,
      createdAt: new Date().toISOString(),
    };
    persist([newEntry, ...savedThemes]);
    setNewName('');
    setJustSaved(newEntry.id);
    setTimeout(() => setJustSaved(null), 2000);
  };

  const handleApply = (saved: SavedTheme) => {
    // Clonar y marcar como custom al aplicar.
    const theme = JSON.parse(JSON.stringify(saved.theme)) as ThemeTokens;
    theme.isCustom = true;
    onApplyTheme(theme);
  };

  const handleDelete = (id: string) => {
    persist(savedThemes.filter((s) => s.id !== id));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = String(ev.target?.result || '');
        const imported = parseTheme(json);
        const newEntry: SavedTheme = {
          id: `theme-${Date.now()}`,
          name: `Importado (${imported.name})`,
          theme: imported,
          createdAt: new Date().toISOString(),
        };
        persist([newEntry, ...savedThemes]);
      } catch (err) {
        console.error('Error importando tema:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Guardar tema actual */}
      <div className="rounded-lg border border-gray-200 p-3 space-y-2">
        <Label className="text-sm font-medium">Guardar diseño actual en la galería</Label>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del diseño (ej: Verano 2026, Premium Oscuro…)"
            className="flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          <Button onClick={handleSave} size="sm" className="bg-brand hover:bg-brand-dark">
            <Save className="h-4 w-4 mr-1" />
            Guardar
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Guarda el tema que estás editando ahora para reutilizarlo después.
        </p>
      </div>

      {/* Galería de diseños guardados */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">
            Diseños guardados ({savedThemes.length})
          </Label>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>
                <FolderOpen className="h-4 w-4 mr-1" />
                Importar JSON
              </span>
            </Button>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {savedThemes.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">
              Aún no hay diseños guardados.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Guarda el tema actual o importa un JSON para empezar tu galería.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {savedThemes.map((saved) => {
              const t = saved.theme;
              return (
                <div
                  key={saved.id}
                  className={`rounded-lg border-2 p-2 transition-all ${
                    justSaved === saved.id
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 hover:border-brand'
                  }`}
                >
                  {/* Preview de colores */}
                  <div className="flex gap-1 mb-2">
                    <span
                      className="w-6 h-6 rounded shrink-0 border border-gray-200"
                      style={{ background: t.palette.primary }}
                      title={`Primario: ${t.palette.primary}`}
                    />
                    <span
                      className="w-6 h-6 rounded shrink-0 border border-gray-200"
                      style={{ background: t.palette.primaryDark }}
                      title={`Oscuro: ${t.palette.primaryDark}`}
                    />
                    <span
                      className="w-6 h-6 rounded shrink-0 border border-gray-200"
                      style={{ background: t.palette.primaryLight }}
                      title={`Claro: ${t.palette.primaryLight}`}
                    />
                    <span
                      className="w-6 h-6 rounded shrink-0 border border-gray-200"
                      style={{ background: t.footer.bg }}
                      title={`Footer: ${t.footer.bg}`}
                    />
                  </div>
                  {/* Nombre + fuente */}
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {saved.name}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {t.typography.fontFamily}
                  </p>
                  {/* Botones */}
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleApply(saved)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Aplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(saved.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
