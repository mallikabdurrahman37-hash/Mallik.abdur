# mallik.abdur

Deploy-ready static site (GitHub Pages compatible).

## Before deploying
Add these two files to the project root (same folder as index.html) — they are
referenced throughout the site but are not generated here, per instructions:

- `bg.png`  — full-bleed background image, used behind the light glass panels on every page
- `logo.png` — square mark, used in the top bar, favicon, about page, and manifest icons

The site will still run without them (browsers just show a blank background /
missing image), so drop the two files in and everything lights up.

## Files
- index.html, collection.html, about.html, auth.html, admin.html — pages
- main.css — shared design system (single stylesheet for all pages)
- main.js — Firebase Auth + Firestore + Cloudinary logic, shared across pages
- manifest.json, service-worker.js — installability / offline shell
- firestore.rules — security rules so only the admin account can write to `projects`
  (paste into Firebase Console → Firestore → Rules, or deploy with the Firebase CLI)

## Admin access
Sign in / register on the Account page using:
mallikabdurrahman37@gmail.com
The Admin link and dashboard only unlock for this exact email — everyone else
is redirected to a "restricted" view on admin.html and never sees admin controls.
Client-side gating is backed by firestore.rules, which is the real enforcement layer.

## Cloudinary
Unsigned upload preset `Wb_mobile_products` is used from the browser directly —
no backend required. Icons are cropped to 1:1 client-side before upload.
