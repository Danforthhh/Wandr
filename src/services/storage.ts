import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadTripDocument(
  uid: string,
  tripId: string,
  docId: string,
  file: File,
): Promise<string> {
  const storageRef = ref(storage, `users/${uid}/trips/${tripId}/${docId}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function deleteTripDocument(
  uid: string,
  tripId: string,
  docId: string,
): Promise<void> {
  const storageRef = ref(storage, `users/${uid}/trips/${tripId}/${docId}`);
  await deleteObject(storageRef).catch(() => {});
}
