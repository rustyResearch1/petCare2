# Settled mobile apps (iOS and Android)

A Capacitor shell that loads the live Settled site. Web deploys reach app users straight away, with no app store update.

## Build on your Mac

1. Install Xcode (iOS) and/or Android Studio (Android).
2. `cd mobile && npm install`
3. iOS: `npm run ios`, then press Run in Xcode.
4. Android: `npm run android`, then press Run in Android Studio.

The app loads the URL in `capacitor.config.ts`. Point it at another deployment with
`SETTLED_URL=https://your-domain npx cap sync`.

## Before submitting to the stores

- Apple rejects apps that are only a website (App Review guideline 4.2). Ship at least one native feature first.
  Push notifications for "visit booked" and "vaccine due" are the natural one, and the camera for scanning records.
- Change `appId` (`pet.settled.app`) to a reverse-domain ID you own before the first upload. It can't change later.
- Icons and splash screens are generated from `assets/`. After replacing them, run
  `npx @capacitor/assets generate --iconBackgroundColor '#14212a' --splashBackgroundColor '#e6ebe9'`.
- Store listing needs a privacy policy URL; the site needs one anyway.

## Mobile API

`GET /api/v1/setup/<token>` returns an owner's setup status, booked visit and pet records as JSON,
using the same private token as their status link.
