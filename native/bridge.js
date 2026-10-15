import {registerPlugin} from '@capacitor/core';
import {Camera} from '@capacitor/camera';
import {Geolocation} from '@capacitor/geolocation';
const App=registerPlugin('App');
const BackupFiles=registerPlugin('BackupFiles');
const FootprintWidget=registerPlugin('FootprintWidget');
window.NthNative={Camera,Geolocation,App,BackupFiles,FootprintWidget};
