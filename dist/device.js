// Browser sources stay dependency-free. The APK supplies the native plugins.
export function createDeviceAccess({native=false,plugins,geolocation,fetchPhoto=globalThis.fetch}={}){
 return {
  native,
  async takePhoto(){
   if(!native||!plugins?.Camera)throw Error('Install the updated APK to use the Android camera.');
   const photo=await plugins.Camera.getPhoto({source:'CAMERA',resultType:'uri',quality:100,allowEditing:false,correctOrientation:true,saveToGallery:false});
   if(!photo.webPath)throw Error('The camera did not return a photo. Please try again.');
   const response=await fetchPhoto(photo.webPath);
   if(!response.ok)throw Error('The new photo could not be opened. Please try again.');
   const blob=await response.blob();
   return blob.type?blob:new Blob([blob],{type:'image/jpeg'});
  },
  async currentPosition(){
   const options={enableHighAccuracy:true,timeout:20000,maximumAge:0};
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
