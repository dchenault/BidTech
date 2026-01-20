
'use client';

import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file to Firebase Storage and returns its public URL.
 * @param storage The Firebase Storage instance.
 * @param file The file to upload.
 * @param path The base path in storage where the file should be saved (e.g., 'item-images').
 * @returns The public download URL of the uploaded file.
 */
export async function uploadFileAndGetURL(
  storage: FirebaseStorage,
  file: File,
  path: string
): Promise<string> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  // Create a unique filename to avoid overwrites
  const uniqueFilename = `${uuidv4()}-${file.name}`;
  const storageRef = ref(storage, `${path}/${uniqueFilename}`);

  try {
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the public URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    // Depending on your error handling strategy, you might want to throw
    // a more user-friendly error or handle it differently.
    throw new Error("Failed to upload image.");
  }
}
