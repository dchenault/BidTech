
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Storage } from "@google-cloud/storage";

admin.initializeApp();
const storage = new Storage();


// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({maxInstances: 5}, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({maxInstances: 10}) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

/**
 * This function is a utility to programmatically set the CORS configuration
 * on the default Firebase Storage bucket. This is necessary to allow image
 * uploads directly from the web client. It will be run automatically on deployment.
 */
export const setCorsConfiguration = onCall(async (request) => {
  const bucketName = process.env.GCLOUD_PROJECT + ".appspot.com";
  logger.info(`Attempting to set CORS for bucket: ${bucketName}`);

  const corsConfiguration = [
    {
      origin: ["https://bidtech.net", "http://localhost:3000", `https://apphosting.c.${process.env.GCLOUD_PROJECT}.dev`],
      method: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
      responseHeader: [
        "Content-Type",
        "Authorization",
        "x-goog-resumable",
      ],
      maxAgeSeconds: 3600,
    },
  ];

  try {
    await storage.bucket(bucketName).setCorsConfiguration(corsConfiguration);
    const message = `Successfully set CORS configuration for bucket ${bucketName}`;
    logger.info(message);
    return { success: true, message: message };
  } catch (error) {
    logger.error("Error setting CORS configuration:", error);
    // Throwing an HttpsError is the standard way to return errors from a callable function.
    throw new functions.https.HttpsError(
      "internal",
      "Unable to set CORS configuration.",
      error
    );
  }
});
