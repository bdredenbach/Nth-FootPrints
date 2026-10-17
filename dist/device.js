// Browser sources stay dependency-free. The APK supplies the native plugins.
export function createDeviceAccess({native=false,plugins,geolocation,permissions=globalThis.navigator?.permissions,fetchPhoto=globalThis.fetch,convertFileSrc=path=>globalThis.Capacitor?.convertFileSrc?.(path)}={}){
 async function readCameraPhoto(photo){
  const path=photo?.webPath||(photo?.path?convertFileSrc(photo.path):null);
  if(!path)throw Error('The camera did not return a photo. Please try again.');
  const response=await fetchPhoto(path);
  if(!response.ok)throw Error('The new photo could not be opened. Please try again.');
  const blob=await response.blob();if(blob.size>20*1024*1024)throw Error('Choose a photo smaller than 20 MB.');
  return blob.type?blob:new Blob([blob],{type:'image/jpeg'});
 }
 return {
  native,readCameraPhoto,
  async requestLocationPermission(){
   if(native){
    const gps=plugins?.Geolocation;if(!gps)throw Error('Location access is unavailable in this build.');
    try{let allowed=await gps.checkPermissions();if(allowed.location==='granted'||allowed.coarseLocation==='granted')return {state:'granted'};allowed=await gps.requestPermissions({permissions:['location']});return {state:allowed.location==='granted'||allowed.coarseLocation==='granted'?'granted':'denied'};}
    catch(error){throw Error(/disabled|location services|OS-PLUG-GLOC-0007|OS-PLUG-GLOC-0009/i.test(String(error?.message??error?.code??''))?'Turn on Location in your phone’s quick settings, then try again. You can also continue without location.':error.message||'Location permission could not be requested. You can continue without it.');}
   }
   if(!geolocation?.getCurrentPosition)return {state:'unavailable'};
   const allowed=await permissions?.query({name:'geolocation'}).catch(()=>null);if(allowed?.state==='granted')return {state:'granted'};if(allowed?.state==='denied')return {state:'denied'};
   try{await new Promise((resolve,reject)=>geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:10000,maximumAge:60000}));return {state:'granted'};}catch(error){if(error?.code===1)return {state:'denied'};throw Error('Location could not be reached. Check device location settings, retry, or continue without it.');}
  },
  async takePhoto(){
   if(!native||!plugins?.Camera)throw Error('Install the updated APK to use the Android camera.');
   const photo=await plugins.Camera.getPhoto({source:'CAMERA',resultType:'uri',quality:100,allowEditing:false,correctOrientation:true,saveToGallery:false});
   return readCameraPhoto(photo);
  },
  async watchPositions(onPosition,onError,{request=false}={}){
   const options={enableHighAccuracy:false,timeout:20000,maximumAge:60000,minimumUpdateInterval:60000,interval:60000};
   if(native){const gps=plugins?.Geolocation;if(!gps)throw Error('Location tracking is unavailable in this build.');let allowed=await gps.checkPermissions();if(request&&allowed.location!=='granted'&&allowed.coarseLocation!=='granted')allowed=await gps.requestPermissions({permissions:['location']});if(allowed.location!=='granted'&&allowed.coarseLocation!=='granted')throw Error('Enable nearby memories to allow Location for this device.');const id=await gps.watchPosition(options,(position,error)=>{if(error)onError(error);else if(position)onPosition(position);});return ()=>gps.clearWatch({id});}
   if(!geolocation?.watchPosition)throw Error('This browser cannot watch location.');if(!request){const allowed=await permissions?.query({name:'geolocation'}).catch(()=>null);if(allowed?.state!=='granted')throw Error('Enable nearby memories again to allow Location.');}const id=geolocation.watchPosition(onPosition,onError,options);return async()=>geolocation.clearWatch(id);
  },
  async currentPosition({enableHighAccuracy=true,maximumAge=0}={}){
   const options={enableHighAccuracy:!!enableHighAccuracy,timeout:20000,maximumAge:maximumAge===60000?60000:0};
   let position;
   if(native){
    const gps=plugins?.Geolocation;
    if(!gps)throw Error('Install the updated APK to use Android location.');
    let permission=await gps.checkPermissions();
    if(permission.location!=='granted'&&permission.coarseLocation!=='granted')permission=await gps.requestPermissions({permissions:['location']});
    if(permission.location!=='granted'&&permission.coarseLocation!=='granted')throw Error('Location permission was not granted.');
    position=await gps.getCurrentPosition(options);
   }else{
    if(!geolocation)throw Error('Location is unavailable on this device.');
    position=await new Promise((resolve,reject)=>geolocation.getCurrentPosition(resolve,reject,options));
   }
   const c=position?.coords;
   if(!c||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0)throw Error('The device did not return a valid location.');
   return position;
  }
 };
}
export function cameraCancelled(error){return /cancel|no image picked/i.test(String(error?.message??error));}
