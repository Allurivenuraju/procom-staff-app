# PROCOM Service Desk – Android staff app (Admin / Agent)

A real Android app with its own screens (Login · Home · Tickets · Ticket details · Profile) and
**push notifications**. It talks to your live server through the new JSON API
(`https://lueur.io/procom-service/api/index.php`) and follows exactly the same rules as the web admin panel
(status choices, remarks, assign lock, priority once, closing OTP, reassigned = view only).
Customers keep using the website. The website for Admins/Agents also stays exactly the same.

---

## 0. Server (one time)

1. Upload the new/changed server files (from `server-files` zip) to `procom-service/` on the server:
   `api/` (folder), `includes/ticket_actions.php`, `includes/push.php`, `includes/layout.php`,
   `admin/ticket.php`, `admin/push.php`, `index.php`.
2. phpMyAdmin → your database → **SQL** → run `upgrade_v9_staff_app.sql` (adds `api_tokens` and `device_tokens`).
3. Check in a browser: `https://lueur.io/procom-service/api/index.php?r=me`
   → should show `{"ok":false,"error":"Please log in.","code":"auth"}`. That means the API works.

If your site address is different, change `API_BASE` and `WEB_ADMIN` in `www/js/config.js`.

---

## 1. Firebase for push notifications (one time, free)

The app gets a notification when:
- **Admins** → a customer raises a new ticket; an agent puts a ticket On Hold / Closed / Rejected.
- **Agents** → a ticket is assigned (or reopened and assigned) to them.
Tapping the notification opens that ticket in the app.

1. Go to https://console.firebase.google.com → **Add project** → name `PROCOM Service Desk` (Analytics not needed).
2. In the project → **Add app → Android**
   - Package name: **`io.lueur.procomservice`** (must be exactly this)
   - App nickname: PROCOM Service Desk → **Register app**
   - **Download `google-services.json`** → skip the remaining steps.
3. **For the app (GitHub)**: open `google-services.json` in Notepad, copy everything →
   GitHub repo → Settings → Secrets and variables → Actions → New secret
   **`GOOGLE_SERVICES_JSON`** → paste → Save.
4. **For the server**: Firebase → ⚙ Project settings → **Service accounts** → **Generate new private key** → a `.json` file downloads.
   Open it in Notepad, copy everything →
   Admin panel → **Settings → Push Notifications** → paste into *Firebase service account JSON* →
   tick **Enable push notifications** → **Save**.
   *(Keep this file private — it is a server key. Never put it in the app or on GitHub.)*
5. After installing the app and logging in (allow notifications when asked), use
   **Settings → Push Notifications → Send a test to my phone**. Your phone shows in the *Registered phones* list.

No Firebase yet? The app still builds and works — just without notifications. Add it any time and rebuild.

---

## 2. Build with GitHub (no Android Studio needed)

The workflow `.github/workflows/build-android.yml` builds the app on GitHub's servers.

### A. Put the project on GitHub (one time)
1. github.com → **New repository** → name `procom-service-app` → **Private** → Create.
2. **GitHub Desktop** → File → Add local repository → choose this `procom-service-app` folder
   → "create a repository" → **Publish**. (The hidden `.github` folder must be included.)

### B. Signing key (one time — keep it forever)
```
keytool -genkeypair -v -keystore procom-release.jks -alias procom -keyalg RSA -keysize 2048 -validity 10000
```
(`keytool` is in Android Studio's `jbr\bin` folder.) Remember the keystore password, alias `procom`, key password.
**Back up `procom-release.jks` and never put it in the repo** — every update must use the same key.

Convert to text (PowerShell, same folder):
```
[Convert]::ToBase64String([IO.File]::ReadAllBytes("procom-release.jks")) | Set-Content keystore-base64.txt
```

### C. Secrets — repo → Settings → Secrets and variables → Actions

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | whole content of `keystore-base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `procom` |
| `ANDROID_KEY_PASSWORD` | key password |
| `GOOGLE_SERVICES_JSON` | content of `google-services.json` (step 1.3) — turns on push |

### D. Build
- Every push to `main`, or **Actions → Build Android app → Run workflow**.
- Finished run → **Artifacts** → `PROCOM-Service-Desk-1.0.N` → **.apk** (install on phones) + **.aab** (Play Store).
- Tag `v1.0.0` (GitHub Desktop → History → right-click → Create Tag → Push) → also creates a **Release** with the APK.
- No keystore secrets → a **debug APK** is built for testing.
- The log line `PUSH_ENABLED: true` in step *Turn on push notifications* confirms push is built in.

### E. Install on staff phones
Send the APK → open → allow "Install unknown apps" once → Install → log in with the same email/password as the website.
Updates: install the newer APK over the old one (same signing key).

---

## 3. Build on your own PC (optional)
```
npm install
npx cap add android
copy google-services.json android\app\        (only if using push; also set PUSH_ENABLED: true in www/js/config.js)
npx capacitor-assets generate --android
npx cap sync android
npx cap open android
```
In Android Studio: ▶ Run on a USB-connected phone, or **Build → Generate Signed App Bundle / APK**.

---

## Notes
- **Screens are inside the app.** Changing app screens (`www/` folder) needs a new build.
  Server-side rules (statuses, WhatsApp, etc.) change on the server and apply to the app at once.
- Login stays for 90 days of inactivity; logging out or disabling the user in the admin panel ends it.
  8 wrong passwords from one network → 15-minute wait.
- Android back button: ticket → list → Home → exits the app.
- Call / WhatsApp / Map buttons open the dialer, WhatsApp or Google Maps.
- CSV export, Users, Terms and WhatsApp/Push settings stay in the web admin panel (Profile → *Open web admin panel*).
- Google Play: Data safety — the app shows customer name, phone, email and address to staff to provide the service; not shared or sold.
  App access — give Google a test Agent login.
