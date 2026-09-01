This directory is served at https://YOUR-DOMAIN/.well-known/

When you generate an APK with Bubblewrap/PWABuilder, place the generated
assetlinks.json here (public/.well-known/assetlinks.json) and redeploy.
It binds the APK's signing key to your domain, which removes the browser
address bar inside the installed app (Digital Asset Links verification).
