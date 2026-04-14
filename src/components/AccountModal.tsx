import { useState } from 'react'
import { signOut, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '../services/firebase'
import { deleteAllUserData, saveEncryptedKey, removeEncryptedKey } from '../services/firestore'
import { encryptApiKey, clearPersistedPassword } from '../services/cryptoService'
import type { Session } from '../types'

interface Props {
  session:         Session
  sessionPassword: string | null
  claudeKey:       string | null
  pplxKey:         string | null
  onKeysUpdated:   () => void
  onLogout:        () => void
  onClose:         () => void
}

// ── Key section ───────────────────────────────────────────────────────────────

interface KeySectionProps {
  label:       string
  hint:        string
  placeholder: string
  value:       string | null           // decrypted key, null = not set
  sessionPassword: string | null
  uid:         string
  keyType:     'claude' | 'perplexity'
  onSaved:     () => void
}

function KeySection({ label, hint, placeholder, value, sessionPassword, uid, keyType, onSaved }: KeySectionProps) {
  const [editing,  setEditing]  = useState(false)
  const [input,    setInput]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [removing, setRemoving] = useState(false)
  const [err,      setErr]      = useState('')

  const masked = value ? value.slice(0, 6) + '••••••••' + value.slice(-4) : null

  const KEY_PREFIX: Record<'claude' | 'perplexity', string> = {
    claude:      'sk-ant-',
    perplexity:  'pplx-',
  }

  const handleSave = async () => {
    if (!input.trim() || !sessionPassword) return
    const prefix = KEY_PREFIX[keyType]
    if (!input.trim().startsWith(prefix)) {
      setErr(`Key must start with "${prefix}"`)
      return
    }
    setSaving(true); setErr('')
    try {
      const bundle = await encryptApiKey(input.trim(), sessionPassword)
      await saveEncryptedKey(uid, keyType, bundle)
      setEditing(false); setInput('')
      onSaved()
    } catch {
      setErr('Failed to save. Please try again.')
    } finally { setSaving(false) }
  }

  const handleRemove = async () => {
    setRemoving(true); setErr('')
    try {
      await removeEncryptedKey(uid, keyType)
      onSaved()
    } catch {
      setErr('Failed to remove. Please try again.')
    } finally { setRemoving(false) }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono'

  if (!sessionPassword) {
    return (
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
        <p className="text-xs text-slate-500">
          Sign out and sign back in to manage API keys.{' '}
          <span className="text-slate-600">(Session password required for encryption.)</span>
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <p className="text-xs text-slate-500 mb-2">{hint}</p>

      {!editing ? (
        <div className="flex items-center gap-2">
          {masked ? (
            <>
              <span className="text-xs font-mono text-slate-300 flex-1 truncate">{masked}</span>
              <button
                onClick={() => { setEditing(true); setInput('') }}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
              >
                Edit
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer bg-transparent border-0 disabled:opacity-50"
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-orange-500/40 hover:text-white transition-all cursor-pointer"
            >
              + Add key
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="password"
            placeholder={placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !saving && handleSave()}
            autoFocus
            className={inputCls}
          />
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !input.trim()}
              className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setInput(''); setErr('') }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function AccountModal({ session, sessionPassword, claudeKey, pplxKey, onKeysUpdated, onLogout, onClose }: Props) {
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [deleteError,    setDeleteError]    = useState('')
  const [reAuthPassword, setReAuthPassword] = useState('')

  const handleLogout = async () => {
    clearPersistedPassword()
    await signOut(auth)
    onLogout()
  }

  const handleDeleteAccount = async () => {
    if (!reAuthPassword.trim()) return
    setDeleting(true)
    setDeleteError('')
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('No user')
      const credential = EmailAuthProvider.credential(session.email, reAuthPassword)
      await reauthenticateWithCredential(currentUser, credential)
      await deleteAllUserData(session.uid)
      await deleteUser(currentUser)
      clearPersistedPassword()
      onLogout()
    } catch (err: unknown) {
      const code = err instanceof FirebaseError ? err.code : ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please try again.')
      } else {
        setDeleteError('Failed to delete account. Please try again.')
      }
    } finally {
      setDeleting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all'

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Account</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg leading-none cursor-pointer bg-transparent border-0 p-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Email */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</div>
            <div className="text-sm text-slate-300 font-mono">{session.email}</div>
          </div>

          {/* API Keys */}
          <div className="border-t border-slate-800 pt-4 space-y-5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PROD API Keys</div>
            <p className="text-xs text-slate-500 -mt-3">
              Required in Claude · Pplx mode. Encrypted with your password before storage — never sent to our servers in plain text.
              In PROD mode, keys transit directly to Anthropic/Perplexity from your browser and are visible in your Network tab. Only add keys you can rotate if compromised.
            </p>

            <KeySection
              label="Anthropic (Claude)"
              hint="Used for itinerary, packing list, and AI chat generation."
              placeholder="sk-ant-..."
              value={claudeKey}
              sessionPassword={sessionPassword}
              uid={session.uid}
              keyType="claude"
              onSaved={onKeysUpdated}
            />

            <KeySection
              label="Perplexity"
              hint="Used for live travel search."
              placeholder="pplx-..."
              value={pplxKey}
              sessionPassword={sessionPassword}
              uid={session.uid}
              keyType="perplexity"
              onSaved={onKeysUpdated}
            />
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-800 pt-4">
            <button
              onClick={handleLogout}
              className="w-full py-2 text-sm font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>

          {/* Delete account */}
          <div className="border-t border-slate-800 pt-3 pb-1">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-300 cursor-pointer bg-transparent border-0 font-medium"
              >
                Delete account
              </button>
            ) : (
              <div className="bg-red-950/50 border border-red-900 rounded-xl p-4 space-y-3">
                <p className="text-xs text-red-400 font-medium">
                  This permanently deletes your account and all your trips. This cannot be undone.
                </p>
                <input
                  type="password"
                  placeholder="Enter your password to confirm"
                  value={reAuthPassword}
                  onChange={e => setReAuthPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !deleting && handleDeleteAccount()}
                  autoFocus
                  className={inputCls}
                />
                {deleteError && (
                  <p className="text-xs text-red-400">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || !reAuthPassword.trim()}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      deleting || !reAuthPassword.trim()
                        ? 'bg-red-900/50 text-red-400 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                    }`}
                  >
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(false); setDeleteError(''); setReAuthPassword('') }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
