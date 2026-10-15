import {registerPlugin} from '@capacitor/core';
import {Camera} from '@capacitor/camera';
import {Geolocation} from '@capacitor/geolocation';
const BackupFiles=registerPlugin('BackupFiles');
window.NthNative={Camera,Geolocation,BackupFiles};
