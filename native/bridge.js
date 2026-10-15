import {registerPlugin} from '@capacitor/core';
import {Camera} from '@capacitor/camera';
import {Geolocation} from '@capacitor/geolocation';
const BackupFiles=registerPlugin('BackupFiles');
const FootprintWidget=registerPlugin('FootprintWidget');
window.NthNative={Camera,Geolocation,BackupFiles,FootprintWidget};
