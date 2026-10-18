package com.nthexperience.footprints;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private PhotoWebChromeClient photoChooser;
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackupFilesPlugin.class);
        registerPlugin(FootprintWidgetPlugin.class);
        registerPlugin(PedometerPlugin.class);
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(AdventureWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
        if (bridge != null) { photoChooser=new PhotoWebChromeClient(bridge); bridge.getWebView().setWebChromeClient(photoChooser); }
    }
    @Override
    public void onDestroy() {
        if (photoChooser != null) photoChooser.dispose();
        super.onDestroy();
    }
}
