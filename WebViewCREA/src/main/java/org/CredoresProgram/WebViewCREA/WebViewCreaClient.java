package org.CredoresProgram.WebViewCREA;
import android.webkit.WebViewClient;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.CreadoresProgram.WebViewCREA.network.NetClient;

public class WebViewCreaClient extends WebViewClient{
    private NetClient client = new NetClient();

    @SuppressWarnings("deprecation")
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return uniShouldOverrideUrlLoading(view, request.getUrl().toString());
    }
    @SuppressWarnings("deprecation")
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return uniShouldOverrideUrlLoading(view, url);
    }

    private boolean uniShouldOverrideUrlLoading(WebView view, String url){
        //code...
        return true;
    }

    public NetClient getNetClient(){
        return this.client;
    }
}
