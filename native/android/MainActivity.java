package com.nthexperience.footprints;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackupFilesPlugin.class);
        registerPlugin(FootprintWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
