import { useState } from 'react'
import { X, Check, Palette } from 'lucide-react'
import { THEMES, saveTheme } from '../lib/theme'

export default function SettingsModal({ currentTheme, appName, onThemeChange, onNameChange, onClose }) {
  const [name, setName] = useState(appName)
  const [selected, setSelected] = useState(currentTheme.id)

  function applyAndClose() {
    const theme = THEMES.find(t => t.id === selected) || THEMES[0]
    onThemeChange(theme)
    onNameChange(name.trim() || 'Sheikah Slate')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--surface1)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '90vh',
        }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <Palette size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold text-white">Ajustes de apariencia</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* App name */}
          <div>
            <label className="label">Nombre de la app</label>
            <input className="input" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Sheikah Slate" />
          </div>

          {/* Theme picker */}
          <div>
            <label className="label">Paleta de colores</label>
            <div className="space-y-2">
              {THEMES.map(theme => (
                <button key={theme.id}
                  onClick={() => setSelected(theme.id)}
                  className="w-full text-left rounded-xl px-3 py-3 transition-all group"
                  style={{
                    background: selected === theme.id
                      ? `${theme.accent}18`
                      : 'rgba(255,255,255,0.03)',
                    border: selected === theme.id
                      ? `1px solid ${theme.accent}60`
                      : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  <div className="flex items-center gap-3">
                    {/* Color preview */}
                    <div className="flex gap-1 flex-shrink-0">
                      {[theme.accent, theme.jade, theme.amber, theme.rose].map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full"
                          style={{ background: c }} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{theme.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{theme.description}</p>
                    </div>
                    {selected === theme.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: theme.accent }}>
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </div>
                  {/* Background preview strip */}
                  <div className="mt-2 h-6 rounded-lg overflow-hidden flex gap-0.5">
                    {[theme.bg, theme.surface1, theme.surface2, theme.surface3, theme.surface4].map((c, i) => (
                      <div key={i} className="flex-1 h-full" style={{ background: c }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={applyAndClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${THEMES.find(t=>t.id===selected)?.accent||'#7c6af7'}, ${THEMES.find(t=>t.id===selected)?.accentDim||'#5a3fd4'})`,
              boxShadow: `0 0 20px ${THEMES.find(t=>t.id===selected)?.accent||'#7c6af7'}40`,
            }}>
            Aplicar
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
