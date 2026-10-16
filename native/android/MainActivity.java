package com.nthexperience.footprints;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private PhotoWebChromeClient photoChooser;
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackupFilesPlugin.class);
        registerPlugin(FootprintWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        if (bridge != null) { photoChooser=new PhotoWebChromeClient(bridge); bridge.getWebView().setWebChromeClient(photoChooser); }
    }
    @Override
    protected void onDestroy() {
        if (photoChooser != null) photoChooser.dispose();
        super.onDestroy();
    }
}
