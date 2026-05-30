# McDowell Admin Dashboard - upgraded build

This ZIP includes upgraded source files for:

- Admin dashboard
- Customer tracking page
- Driver GPS page
- Driver assignment fields
- Customer GPS sharing
- Driver live GPS tracking
- Manual ETA updates
- Completed and cancelled job archives
- WhatsApp links
- Payment, invoice, photo, and signature URL fields

## Firebase / Vercel setup

The app reads Firebase settings from Vercel environment variables. In Vercel, add these values:

VITE_FIREBASE_API_KEY=your_new_rotated_api_key
VITE_FIREBASE_AUTH_DOMAIN=mcdowell-tyre-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mcdowell-tyre-app
VITE_FIREBASE_STORAGE_BUCKET=mcdowell-tyre-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=299380777264
VITE_FIREBASE_APP_ID=1:299380777264:web:25b15ac214869cc8a128f5
VITE_FIREBASE_MEASUREMENT_ID=G-N4P0R0NBVM

After changing Vercel variables, redeploy with build cache off.

## Local run

npm install
npm run dev

## Build test

This project was build-tested successfully with:

npm run build
