import { useState } from 'react'
import { signOut, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '../services/firebase'
import { deleteAllUserData } from '../services/firestore'
import { clearPersistedPassword } from '../services/cryptoService'
import type { Session } from '../types'

interface Props {
  session:  Session
  onLogout: () => void
  onClose:  () => void
}

export default function AccountModal({ session, onLogout, onClose }: Props) {
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
      // Delete Firestore data first (requires valid auth)
      await deleteAllUserData(session.uid)
      // Then revoke Firebase auth
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

  const inputCls = 'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all'

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-xl dark:shadow-slate-900/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Account</span>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none cursor-pointer bg-transparent border-0 p-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Email */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Email</div>
            <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">{session.email}</div>
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              onClick={handleLogout}
              className="w-full py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>

          {/* Delete account */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 pb-1">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-0 font-medium"
              >
                Delete account
              </button>
            ) : (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl p-4 space-y-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
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
                  <p className="text-xs text-red-500 dark:text-red-400">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || !reAuthPassword.trim()}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      deleting || !reAuthPassword.trim()
                        ? 'bg-red-100 dark:bg-red-900/50 text-red-300 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                    }`}
                  >
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(false); setDeleteError(''); setReAuthPassword('') }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
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
