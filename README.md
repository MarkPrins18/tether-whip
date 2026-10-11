# Tether Whip (Expo + Skia)

## Starten (hot reload op je telefoon)
1. `npm install`
2. `npx expo start`
3. Open **Expo Go** op je Android-telefoon en scan de QR-code (zelfde wifi). Wijzigingen verschijnen direct.

## Structuur
- `src/game.js`   pure game-logica (natuurkunde, orbs, mijnen, void, combo). Hier tune je het spelgevoel.
- `src/render.js` tekent een frame met Skia.
- `App.js`        schermen (menu, upgrades, revive, game over), game-loop, touch, opslag.
- `src/ads.js`    advertentielaag. Nu een demo-scherm; vervang door AdMob.

## Tunen
In `src/game.js`: `GR_FREE`/`GR_ROPE` (zwaartekracht), `REEL` (hoe snel het touw korter wordt),
`VROPE`/`VFREE` (maximale snelheid), en in `stepSim` de void-snelheid (`vs`).

## Echte advertenties (AdMob)
Expo Go ondersteunt AdMob niet. Maak een development build:
`npx expo install react-native-google-mobile-ads expo-dev-client` en `eas build --profile development --platform android`.
Vervang de twee functies in `src/ads.js` door AdMob (RewardedAd en InterstitialAd).
Zet in `app.json` je eigen `android.package` (nu `com.example.tetherwhip`).

## Nog niet gedaan
- Geluid (de webversie had synthesizer-tonen). Voeg `expo-audio` en korte geluidsbestanden toe.
- Eigen lettertype, app-icoon en splash-scherm.
