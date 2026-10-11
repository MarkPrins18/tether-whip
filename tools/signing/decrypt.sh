#!/usr/bin/env bash
# Decrypts signing/upload.enc and exports the TW_KEYSTORE_* variables for the Gradle build.
set -euo pipefail
: "${SIGNING_PASSPHRASE:?SIGNING_PASSPHRASE is not set}"
DEST="${RUNNER_TEMP:-$(mktemp -d)}/tw-signing"
mkdir -p "$DEST"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in signing/upload.enc -pass env:SIGNING_PASSPHRASE | tar -x -C "$DEST"
PASS="$(grep '^storePassword=' "$DEST/upload.properties" | cut -d= -f2-)"
ALIAS="$(grep '^keyAlias=' "$DEST/upload.properties" | cut -d= -f2-)"
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "::add-mask::$PASS"
  {
    echo "TW_KEYSTORE_FILE=$DEST/upload.jks"
    echo "TW_KEYSTORE_PASSWORD=$PASS"
    echo "TW_KEY_PASSWORD=$PASS"
    echo "TW_KEY_ALIAS=$ALIAS"
  } >> "$GITHUB_ENV"
else
  echo "decrypted to $DEST"
fi
