import { useRef, useState } from 'react';
import { Upload, FileText, FileImage, Trash2, ExternalLink, FolderOpen, Loader2, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Trip, TripDocument, Activity } from '../types';
import { uploadTripDocument, deleteTripDocument } from '../services/storage';

interface Props {
  trip: Trip;
  uid: string;
  onUpdate: (trip: Trip) => void;
}

function nanoid() { return crypto.randomUUID(); }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  return FileText;
}

function mimeColor(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'text-red-400 bg-red-500/10 border-red-500/20';
  if (mimeType.startsWith('image/')) return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  return 'text-gray-400 bg-gray-500/10 border-gray-700';
}

export default function TripDocuments({ trip, uid, onUpdate }: Props) {
  const { t, i18n } = useTranslation('trip');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docs = trip.documents ?? [];

  const allActivities: (Activity & { dayTitle: string })[] = trip.itinerary.flatMap(day =>
    day.activities.map(a => ({ ...a, dayTitle: day.title })),
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(t('documents.tooLarge'));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const docId = nanoid();
      const url = await uploadTripDocument(uid, trip.id, docId, file);
      const doc: TripDocument = {
        id: docId,
        name: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        url,
        uploadedAt: new Date().toISOString(),
      };
      onUpdate({ ...trip, documents: [...docs, doc] });
    } catch {
      setError(t('documents.uploadError'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: TripDocument) => {
    if (!confirm(t('documents.deleteConfirm', { name: doc.name }))) return;
    setDeletingId(doc.id);
    try {
      await deleteTripDocument(uid, trip.id, doc.id);
      // Remove documentId from any linked activities
      const updatedItinerary = trip.itinerary.map(day => ({
        ...day,
        activities: day.activities.map(a =>
          a.documentId === doc.id ? { ...a, documentId: undefined } : a,
        ),
      }));
      onUpdate({ ...trip, documents: docs.filter(d => d.id !== doc.id), itinerary: updatedItinerary });
    } catch {
      setError(t('documents.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRename = (doc: TripDocument, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === doc.name) return;
    onUpdate({ ...trip, documents: docs.map(d => d.id === doc.id ? { ...d, name: trimmed } : d) });
  };

  const linkedActivity = (doc: TripDocument) =>
    allActivities.find(a => a.id === doc.activityId);

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header + upload */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-gray-200">{t('documents.title')}</h2>
          {docs.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{docs.length}</span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {t('documents.upload')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Empty state */}
      {docs.length === 0 && !uploading && (
        <div className="text-center py-16 text-gray-500">
          <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('documents.empty')}</p>
          <p className="text-xs mt-1 text-gray-600">{t('documents.emptyHint')}</p>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-2">
        {docs.map(doc => {
          const Icon = fileIcon(doc.mimeType);
          const linked = linkedActivity(doc);
          return (
            <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg border shrink-0 ${mimeColor(doc.mimeType)}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Editable name */}
                <input
                  defaultValue={doc.name}
                  onBlur={e => handleRename(doc, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  className="w-full text-sm font-medium text-gray-200 bg-transparent border-b border-transparent hover:border-gray-700 focus:border-indigo-500 outline-none transition py-0.5 truncate"
                  title={t('documents.renameHint')}
                />
                <p className="text-xs text-gray-600 mt-0.5">
                  {doc.fileName} · {formatSize(doc.size)} ·{' '}
                  {new Date(doc.uploadedAt).toLocaleDateString(i18n.language)}
                </p>
                {linked && (
                  <p className="text-xs text-indigo-400 mt-0.5 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {linked.dayTitle} — {linked.title}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                  title={t('documents.open')}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                  title={t('documents.delete')}
                >
                  {deletingId === doc.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
