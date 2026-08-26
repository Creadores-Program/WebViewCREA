package org.CredoresProgram.WebViewCREA;
import android.webkit.WebViewClient;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.CreadoresProgram.WebViewCREA.network.NetClient;
import org.CreadoresProgram.WebViewCREA.network.NetRes;

public class WebViewCreaClient extends WebViewClient{
    private Set<String> urlsVerified = new HashSet<String>();
    private final NetClient client = new NetClient();
    private final ExecutorService background = Executors.newCachedThreadPool();
    private boolean desktop = false;
    private static final String[] urlsPassed = { "http", "https", "data", "javascript" };

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

    private boolean uniShouldOverrideUrlLoading(final WebView view, final String url){
        if(urlsVerified.contains(url)){
            urlsVerified.remove(url);
            return false;
        }
        boolean urlPassed = false;
        for(String scheme : urlsPassed){
            if(url.startsWith(scheme)){
                urlPassed = true;
                break;
            }
        }
        if(url.startsWith(urlsPassed[3])){
            //javascript:
            return true;
        }
        if(url.startsWith(urlsPassed[2])){
            //data:
            return true;
        }
        background.execute(new Runnable() {
            @Override public void run() {
                NetRes res = null;
                try{
                    res = client.get(url, view.getSettings().getUserAgentString(), desktop);
                    Map<String, String> headers = res.getHeaders();
                    if(!headers.containsKey("content-type")){
                        urlsVerified.add(url);
                        view.loadUrl(url);
                        return;
                    }
                    String contentType = headers.get("content-type").toLowerCase();
                    if (contentType.contains("text/html")) {
                        urlsVerified.add(url);
                        patchHtml(view, res.getData(), url);
                    } else if (contentType.contains("text/css")) {
                        urlsVerified.add(url);
                        patchCss(view, res.getData());
                    } else if (contentType.contains("javascript") || contentType.contains("ecmascript")) {
                        urlsVerified.add(url);
                        patchJs(view, res.getData(), url, false);
                    }else{
                        urlsVerified.add(url);
                        view.loadUrl(url);
                    }
                }catch(Exception e){
                    urlsVerified.add(url);
                    view.loadUrl(url);
                    e.printStackTrace();
                }finally{
                    if(res != null){
                        res.close();
                    }
                }
            }
        });
        return true;
    }

    public NetClient getNetClient(){
        return this.client;
    }

    public boolean isDesktop(){
        return this.desktop;
    }
    public void setDesktop(boolean desktop){
        this.desktop = desktop;
    }
    private void patchHtml(WebView view, String data, String url) throws Exception {}
    private void patchJs(WebView view, String data, String url, boolean execute) throws Exception {}
    private void patchCss(WebView view, String data)throws Exception {}
}
