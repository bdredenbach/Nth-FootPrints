#!/usr/bin/env python3
"""Back up an older debug APK's raw journal before reinstalling. No restore/removal."""
import argparse
import datetime
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import zipfile

PACKAGE = 'com.nthexperience.footprints'
ROOT = 'app_webview/Default/IndexedDB'

def rescue(output, serial=None):
    if not shutil.which('adb'):
        raise RuntimeError('Install Android SDK Platform-Tools and add adb to PATH first.')
    output = Path(output)
    if output.exists():
        raise RuntimeError('That output file already exists. Choose a new filename.')
    adb = ['adb'] + (['-s', serial] if serial else [])
    def run(*args):
        result = subprocess.run(adb + list(args), capture_output=True, timeout=180)
        if result.returncode:
            raise RuntimeError(result.stderr.decode(errors='replace').strip() or result.stdout.decode(errors='replace').strip() or 'ADB command failed.')
        return result.stdout
    run('get-state')
    run('shell', 'run-as', PACKAGE, 'id')
    # Closing the app flushes LevelDB and avoids copying a changing journal.
    # Close any unsaved editor on the phone before running this helper.
    run('shell', 'am', 'force-stop', PACKAGE)
    raw = run('exec-out', 'run-as', PACKAGE, 'tar', '-cf', '-', ROOT)
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as archive:
        files = archive.getmembers()
        if not files or not any(m.isfile() and m.size for m in files):
            raise RuntimeError('No saved journal files were found. Nothing was written.')
        for member in files:
            parts = Path(member.name).parts
            if member.name.startswith('/') or '..' in parts or not (member.name.rstrip('/') == ROOT or member.name.startswith(ROOT + '/')) or member.issym() or member.islnk():
                raise RuntimeError('Unexpected archive path. Nothing was written.')
    metadata = {'app': PACKAGE, 'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'format': 'raw-debug-journal-rescue-v1', 'root': ROOT,
                'sha256': hashlib.sha256(raw).hexdigest(), 'files': len(files),
                'note': 'Raw IndexedDB rescue archive. Not a .nthbackup file. Keep until the journal has been recovered.'}
    # Exclusive creation keeps an earlier rescue from being overwritten.
    with output.open('xb') as handle:
        with zipfile.ZipFile(handle, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('journal-data.tar', raw)
            archive.writestr('rescue-info.json', json.dumps(metadata, indent=2))
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert hashlib.sha256(archive.read('journal-data.tar')).hexdigest() == metadata['sha256']
    print(f'Saved and checked: {output.resolve()} ({output.stat().st_size:,} bytes, {len(files)} entries).')
    print('Keep the installed app and this archive until recovery is confirmed. This helper does not uninstall or restore anything.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', help='New local ZIP filename, e.g. Nth-FootPrints-rescue.zip')
    parser.add_argument('--serial', help='ADB device serial if more than one device is connected')
    args = parser.parse_args()
    try:
        rescue(args.output, args.serial)
    except (RuntimeError, OSError, subprocess.TimeoutExpired, tarfile.TarError) as error:
        parser.exit(1, f'Rescue could not complete: {error}\nDo not uninstall the current app.\n')
