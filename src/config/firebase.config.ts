import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  };
});
