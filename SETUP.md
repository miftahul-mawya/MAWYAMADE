# MawyaMade Firebase setup (beginner-friendly)

This package contains:
- `index.html` — MawyaMade website, Firebase-ready
- `firebase-messaging-sw.js` — background push notification worker
- `firestore.rules` and `storage.rules` — starting security rules
- `functions/` — backend triggers that publish notifications and send push alerts

## Important
The site cannot connect to your Firebase project until you paste your own Firebase web configuration and set your real admin email. No Firebase account/project credentials were supplied, so placeholders are intentionally used. Until then, the site offers a local demo login to test the UI; demo posts/comments are only stored in that browser and are not secure or shared.

## 1. Create a Firebase project
1. Open https://console.firebase.google.com/ and create a project.
2. In Project settings → General → Your apps, add a Web App.
3. Copy the entire Firebase config object.
4. In `index.html`, find `const FIREBASE_CONFIG = { ... }` and replace all `PASTE_...` values.
5. Find `const ADMIN_EMAIL = ...` and set the Google account email that should have admin access.
6. Open `firebase-messaging-sw.js` and paste the same Firebase config there.
7. In both `firestore.rules` and `storage.rules`, replace `REPLACE_WITH_YOUR_REAL_ADMIN_EMAIL` with that exact email.

## 2. Enable sign-in
1. Firebase Console → Authentication → Get started.
2. Sign-in method → enable Google.
3. Authentication → Settings → Authorized domains: add your deployed website domain.
4. Do not open the site by double-clicking `index.html` (`file://`). Use localhost or HTTPS.

## 3. Enable Firestore and Storage
1. Build → Firestore Database → Create database.
2. Build → Storage → Get started.
3. In Firestore → Rules, paste the contents of `firestore.rules` after replacing the admin email.
4. In Storage → Rules, paste `storage.rules` after replacing the admin email.
5. Review the rules before launch. The sample rules permit public reads for community content; only signed-in members can post/comment, and only the admin can publish recipes.

## 4. Run locally
Recommended: open the folder in VS Code and use the Live Server extension. The URL should be like `http://127.0.0.1:5500/`.
Firebase Auth popup, Storage, and service workers may not work from `file://`.

## 5. Deploy backend notifications
Push notifications when a browser is closed need Cloud Functions + Firebase Cloud Messaging. The included Cloud Function creates shared in-app notifications when someone creates a post, comment, or admin recipe, and sends FCM push notifications to registered devices.

Requirements: enable billing/Blaze if Firebase requires it for Cloud Functions in your region/project.

1. Install Node.js 20+ and Firebase CLI: `npm install -g firebase-tools`.
2. Sign in: `firebase login`.
3. From your project folder, run `firebase init functions`. Choose JavaScript and Node 20. If you already have a functions folder, keep the included `functions/index.js` and `functions/package.json`.
4. Install function dependencies inside `functions`: `npm install`.
5. Deploy functions and rules: `firebase deploy --only functions,firestore:rules,storage`.
6. If asked for a Firebase project, select the project you created.

## 6. Enable web push notifications
1. Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Generate key pair.
2. Copy the public VAPID key into `const FCM_VAPID_KEY = "..."` in `index.html`.
3. Deploy `firebase-messaging-sw.js` at the website root (same directory level as `index.html`).
4. Open the live website over HTTPS, sign in, and press **Enable push alerts**. Allow notifications.
5. Each user who wants browser push must sign in and enable push alerts on their own device/browser.
6. Cloud Functions send push alerts to registered devices. The live notification list also updates for visitors while they have the page open.

## 7. How admin publishing works
Sign in with the Google account whose email matches `ADMIN_EMAIL`. The Admin Studio will appear. Upload a recipe name, category, description, ingredients, steps, image and optional video URL. On publish, the recipe appears for everyone and triggers a notification.

## Security and moderation notes
- Keep the admin email consistent in `index.html`, Firestore rules, Storage rules.
- Never put service-account private keys in HTML or upload them to GitHub.
- Public community posts are visible to visitors. Users can delete their own posts/comments; the admin can moderate them in Firestore Console.
- This starter uses Google sign-in; add rate limits, reporting, moderation and stronger validation before a public launch.
- Large user-uploaded videos can cost storage/bandwidth. Keep size limits and review Storage usage.
