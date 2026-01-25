
'use client';

import { ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';


// Converts a data URI to a Blob object
async function dataUriToBlob(dataUri: string): Promise<Blob> {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    return blob;
}

/**
 * Uploads a data URI (e.g., from a canvas or file reader) to Firebase Storage.
 * @param storage The Firebase Storage instance.
 * @param dataUri The base64 encoded data URI.
 * @param path The storage path for the upload.
 * @returns The public download URL of the uploaded file.
 */
export async function uploadDataUriAndGetURL(
  storage: FirebaseStorage,
  dataUri: string,
  path: string
): Promise<string> {
  if (!dataUri) {
    throw new Error("No data URI provided for upload.");
  }

  const blob = await dataUriToBlob(dataUri);
  const mimeType = dataUri.substring(dataUri.indexOf(":") + 1, dataUri.indexOf(";"));
  const fileExtension = mimeType.split('/')[1] || 'bin';
  const uniqueFilename = `${uuidv4()}.${fileExtension}`;
  const storageRef = ref(storage, `${path}/${uniqueFilename}`);

  try {
    const snapshot = await uploadBytes(storageRef, blob, { contentType: mimeType });
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading data URI to Firebase Storage:", error);
    throw new Error("Failed to upload image.");
  }
}

/**
 * Deletes a file from Firebase Storage using its public download URL.
 * @param storage The Firebase Storage instance.
 * @param url The public URL of the file to delete.
 */
export async function deleteFileByUrl(storage: FirebaseStorage, url: string): Promise<void> {
    if (!url.includes('firebasestorage.googleapis.com')) {
        console.warn("Attempted to delete a file that is not hosted on Firebase Storage:", url);
        return;
    }

    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (error: any) {
        // It's often safe to ignore 'object-not-found' errors, as the file might have been deleted already.
        if (error.code === 'storage/object-not-found') {
            console.log("File to delete was not found in storage (might be already deleted).");
        } else {
            console.error("Error deleting file from storage:", error);
            // Optionally re-throw or handle as needed
            throw new Error("Failed to delete the old image.");
        }
    }
}
