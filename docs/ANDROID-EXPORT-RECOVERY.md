# Keeping an older APK's existing journal

APK versions through 0.2.7 used a browser download link, which the Android wrapper did not save. They were also signed with disposable hosted-runner debug keys. A newly signed APK cannot update those installations in place.

**Keep the current installed app until your saved data has been recovered.**

For a computer connected to the phone over USB, the repository includes a backup-only helper. It needs Python 3 and [Android SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools). Enable USB debugging on the phone and approve this computer, close any unsaved footprint editor, then run:

```sh
python tools/android-journal-rescue.py Nth-FootPrints-rescue.zip
```

The helper checks that ADB can access this debug app, stops its process so the database is not changing, reads its IndexedDB directory and writes a local recovery ZIP with a checksum. It does not uninstall the app, erase files, write to its journal, or perform a restore. Reopen the app normally afterward if needed. The archive can contain personal photos, voice notes and coordinates; keep it private.

This raw ZIP is not a `.nthbackup` file and must not be selected in the normal Restore dialog. Its database files need to be recovered into the same app/origin before creating a portable backup. Confirm that the recovery archive exists and contains the journal before planning a reinstall. Recovery on a physical phone has not been tested here; failures leave the installed journal in place.

The new APK's normal export flow is **Backup & restore → Create backup → Save backup… → choose an Android folder**. Its success result appears only after file writing finishes. Future update-safe distribution still requires a persistent signing key.
