package com.geostrand.enlemdenkacis;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/**
 * GeoStrand Android etkinliği.
 * Telefonun "yazı boyutu" ayarı büyükken WebView oyundaki tüm yazıları büyütüp
 * düzeni bozardı; oyun kendi yazı boyutlarını ekrana göre ayarladığı için %100'de sabitlenir.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.getSettings().setTextZoom(100);
            }
        }
    }
}
