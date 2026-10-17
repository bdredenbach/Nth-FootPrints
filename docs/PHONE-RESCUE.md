# Keep the installed journal before replacing an older test APK

The previously supplied FootPrints debug APKs have different signing certificates. Android cannot install a differently signed build over the existing package. **Do not uninstall the old app or clear its storage while it holds your only copy.** The new backup code does not reach an old installed APK simply because the website was updated.

The rescue below runs inside the existing debug app, reads its saved journal, and uses its existing Android save handler. It writes the new binary ZIP64 archive as numbered parts of at most 140 MiB, below the old handler's 150 MiB limit. It does not migrate, edit, or delete the old database. All parts together form one normal backup. Keep the numbered filenames.

The rescue/export/restore code and debugging transport were exercised against the unchanged 0.6.9 web bundle and legacy database. Real Android wireless pairing and document providers still require phone validation.

## Phone-only route: Termux and wireless debugging

1. Keep the existing FootPrints installed. Save/close any unfinished footprint, then close its Backup & restore dialog.
2. Install **Termux from its official F-Droid/GitHub source**: https://github.com/termux/termux-app#installation . If Termux is already installed, use that installation; do not mix sources.
3. In Termux, run:

   ```sh
   pkg update
   pkg upgrade -y
   pkg install android-tools python
   ```

   If upgrading asks whether to replace a configuration file and shows `[default=N]`, press Enter to keep it. Wait for the normal `$` prompt before entering another command. Run `adb version` before pairing. If it reports a missing library symbol, run `apt install --reinstall libc++ android-tools`, then check `adb version` again.

4. Connect the phone to Wi-Fi. In Android **Settings → System → Developer options → Wireless debugging**, turn Wireless debugging on. If Developer options is absent, Android's guide explains enabling it: https://developer.android.com/studio/debug/dev-options .
5. Put Settings and Termux in split screen. In Wireless debugging choose **Pair device with pairing code**. In Termux run the following, replacing `PAIR_PORT` with the port shown in that pairing dialog:

   ```sh
   adb pair 127.0.0.1:PAIR_PORT
   ```

   Enter the six-digit code when asked. This pairing port is temporary.
6. Back on the main Wireless debugging page, find **IP address & port**. Use its connection port, which differs from the pairing port:

   ```sh
   adb connect 127.0.0.1:CONNECTION_PORT
   adb devices
   ```

   One device should show `device`. If loopback is refused on this phone, use the phone's own Wi-Fi IP shown in Settings in place of `127.0.0.1`. If pairing/connection fails, stop here and keep the old app installed; the journal has not changed.
7. Download the rescue helper into Termux:

   ```sh
   python -c "import urllib.request; urllib.request.urlretrieve('https://raw.githubusercontent.com/bdredenbach/Nth-FootPrints/main/tools/rescue-installed-journal.py','rescue-installed-journal.py')"
   ```

8. Open the old FootPrints once so its WebView is running. Return to Termux, run:

   ```sh
   python rescue-installed-journal.py
   ```

9. Return to FootPrints. The rescue waits for the app to be visible, then opens Android's save picker. Save **every numbered part in the same folder**, retaining the suggested filenames. Keep the screen unlocked. The helper prints the completed footprint count and filenames in Termux.
10. **Verify before replacing the APK:** open https://bdredenbach.github.io/Nth-FootPrints/dist/ in your phone browser. In Backup & restore select **all numbered parts together**, then Restore. Check all 16 footprints, their dates/coordinates, photos, tags, visits and audio. Keep the original app and the files until the whole journal is confirmed in the new version.

This route needs no root. ADB pairing grants debugging access; the helper itself only forwards the existing FootPrints WebView debugging socket and invokes the read-only rescue function. Journal data is not uploaded. The only network download from the helper is the application's rescue code. Wireless-debugging setup is based on Android's ADB workflow; using Termux as the local client still needs on-device acceptance.

## Computer alternative

With ADB installed and USB debugging authorized, the same Python helper works on Windows, macOS or Linux. Alternatively, Chrome at `chrome://inspect/#devices` can inspect the FootPrints WebView. In that app's Console run:

```js
await (await import('https://bdredenbach.github.io/Nth-FootPrints/dist/rescue-legacy.js?v=0.7.0')).rescueLegacyJournal();
```

Save every part, then perform the same browser restore/check above. The script refuses an upgraded database; the new app should use its normal Create backup flow.

References: Android ADB/wireless pairing https://developer.android.com/tools/adb ; Termux installation https://github.com/termux/termux-app#installation ; Chrome/WebView debugging https://developer.chrome.com/docs/devtools/remote-debugging .
