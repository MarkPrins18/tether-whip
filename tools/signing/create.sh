#!/usr/bin/env bash
# Creates the Play Store upload key once and stores it encrypted in signing/upload.enc.
# Needs the SIGNING_PASSPHRASE environment variable (a long secret passphrase of your own).
set -euo pipefail
: "${SIGNING_PASSPHRASE:?SIGNING_PASSPHRASE is not set}"
if [ "${#SIGNING_PASSPHRASE}" -lt 16 ]; then echo "Use a passphrase of at least 16 characters."; exit 1; fi
if [ -f signing/upload.enc ]; then echo "signing/upload.enc already exists. Refusing to overwrite your key."; exit 1; fi

WORK="$(mktemp -d)"
PASS="$(openssl rand -hex 16)"
keytool -genkeypair -storetype PKCS12 -keystore "$WORK/upload.jks" -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=Tether Whip, O=Mark Prins, C=NL" >/dev/null 2>&1
printf 'storePassword=%s\nkeyPassword=%s\nkeyAlias=upload\n' "$PASS" "$PASS" > "$WORK/upload.properties"
tar -C "$WORK" -cf "$WORK/bundle.tar" upload.jks upload.properties
mkdir -p signing
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -in "$WORK/bundle.tar" -out signing/upload.enc -pass env:SIGNING_PASSPHRASE
echo "Key created. Certificate fingerprints (safe to share):"
keytool -list -v -keystore "$WORK/upload.jks" -storepass "$PASS" -alias upload 2>/dev/null | grep -E "SHA1:|SHA256:" || true
rm -rf "$WORK"
