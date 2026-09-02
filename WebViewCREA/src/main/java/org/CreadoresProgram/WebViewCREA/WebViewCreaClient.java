package org.CreadoresProgram.WebViewCREA;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.CookieManager;
import android.os.Build;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;

import org.CreadoresProgram.WebViewCREA.network.NetClient;
import org.CreadoresProgram.WebViewCREA.network.NetRes;

public class WebViewCreaClient extends WebViewClient{
    private final NetClient client = new NetClient();
    private WebChromeClient chromeClient = null;
    private final ExecutorService background = Executors.newCachedThreadPool();
    private boolean desktop = false;
    private static final String[] urlsPassed = { "http", "https", "javascript" };
    private static final String PROXY_DEF_URL = "https://webviewcrea.vercel.app/";
    private static final String PROXY_GET_USERAGENT = PROXY_DEF_URL+"api/userAgent";
    private static final String PROXY_PATCH_HTML = PROXY_DEF_URL+"api/patchHtml";
    private static final String PROXY_PATCH_JS = PROXY_DEF_URL+"api/patchJS";
    private static final String PROXY_PATCH_CSS = PROXY_DEF_URL+"api/patchCSS";

    private static final String REGEX_HEADTAG = "(?i)(<head\\s*)>";

    private static final String MIMETYPE_HTML = "text/html";
    private static final String MIMETYPE_CSS = "text/css";
    private static final String MIMETYPE_JS = "text/js";
    private static final String ENCODE = "UTF-8";

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
        boolean urlPassed = false;
        for(String scheme : urlsPassed){
            if(url.startsWith(scheme)){
                urlPassed = true;
                break;
            }
        }
        if(!urlPassed){
            return false;
        }
        final String userAgent = view.getSettings().getUserAgentString();
        if(url.startsWith(urlsPassed[2])){
            //javascript:
            final String data = url.replaceFirst(urlsPassed[2]+":", "");
            background.execute(new Runnable(){
                @Override public void run(){
                    patchJs(view, data, url, true, false, userAgent, null);
                }
            });
            return true;
        }
        final String[] cookie = new String[1];
        try{
            cookie[0] = CookieManager.getInstance().getCookie(url);
        }catch(Exception e){
            cookie[0] = null;
        }
        onProgressChanged(view, 1);
        background.execute(new Runnable() {
            @Override public void run() {
                NetRes res = null;
                try{
                    res = client.get(url, userAgent, desktop, cookie[0]);
                    onProgressChanged(view, 25);
                    Map<String, String> headers = res.getHeaders();
                    if(!headers.containsKey("content-type")){
                        loadUrlNative(view, url);
                        return;
                    }
                    String contentType = headers.get("content-type").toLowerCase();
                    if (contentType.contains(MIMETYPE_HTML)) {
                        patchHtml(view, res.getData(), url, userAgent, cookie[0]);
                    } else if (contentType.contains(MIMETYPE_CSS)) {
                        patchCss(view, res.getData(), url, userAgent, cookie[0]);
                    } else if (contentType.contains(urlsPassed[2]) || contentType.contains("ecmascript")) {
                        patchJs(view, res.getData(), url, false, false, userAgent, cookie[0]);
                    }else if(contentType.contains("text/") || contentType.contains("json")){
                        loadBaseUrlNative(view, url, res.getData(), contentType);
                    }else{
                        loadUrlNative(view, url);
                    }
                }catch(Exception e){
                    loadUrlNative(view, url);
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

    public void loadUrl(WebView view, String url){
        if(!uniShouldOverrideUrlLoading(view, url)){
            view.loadUrl(url);
        }
    }
    public void reload(WebView view){
        if(view.getUrl() != null){
            loadUrl(view, view.getUrl());
        }else{
            view.reload();
        }
    }
    private void loadUrlNative(final WebView view, final String url){
        view.post(new Runnable(){
            @Override
            public void run(){
                onProgressChanged(view, 100);
                view.loadUrl(url);
            }
        });
    }

    private void loadBaseUrlNative(final WebView view, final String url, final String data, final String mimetype){
        view.post(new Runnable(){
            @Override
            public void run(){
                onProgressChanged(view, 100);
                view.loadDataWithBaseURL(url, data, mimetype, ENCODE, url);
            }
        });
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

    public void setWebChromeClient(WebView view, WebChromeClient chromeClient){
        this.chromeClient = chromeClient;
        view.setWebChromeClient(chromeClient);
    }
    private void onProgressChanged(WebView view, int newProgress){
        if(this.chromeClient != null){
            view.post(new Runnable(){
                @Override
                public void run(){
                    chromeClient.onProgressChanged(view, newProgress);
                }
            })
        }
    }
    private void patchHtml(WebView view, String data, String url, String userAgent, String cookie){
        data = insertTagWebView(data, url);
        NetRes res = null;
        try{
            res = client.post(PROXY_PATCH_HTML, userAgent, desktop, data, cookie);
            onProgressChanged(view, 50);
            data = res.getData();
        }catch(Exception e){
            e.printStackTrace();
        }finally{
            if(res != null){
                res.close();
            }
        }
        loadBaseUrlNative(view, url, data, MIMETYPE_HTML);
    }
    private String insertTagWebView(String data, String url){
        url = url.replace("\"", "&quot;");
        if(data.matches("(?s).*"+REGEX_HEADTAG + ".*")){
            return data.replaceFirst(REGEX_HEADTAG, "$1>" + "<webviewcrea baseurl=\""+url+"\"/>");
        }else{
            return "<webviewcrea baseurl=\""+url+"\"/>" + data;
        }
    }
    private void patchJs(WebView view, String data, String url, boolean execute, boolean kitkatExecute, String userAgent, String cookie){
        NetRes res = null;
        try{
            res = client.post(PROXY_PATCH_JS, userAgent, desktop, data, cookie);
            if(!execute){
                onProgressChanged(view, 50);
            }
            data = res.getData();
        }catch(Exception e){
            e.printStackTrace();
        }finally{
            if(res != null){
                res.close();
            }
        }
        if(execute){
            if(kitkatExecute && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT){
                evalJsKK(view, data);
                return;
            }
            url = urlsPassed[2]+":"+data;
            loadUrlNative(view, url);
        }else{
            loadBaseUrlNative(view, url, data, MIMETYPE_JS);
        }
    }
    private static void evalJsKK(final WebView view, final String code){
        view.post(new Runnable(){
            @Override public void run(){
                view.evaluateJavascript(code, null);
            }
        });
    }
    private void patchCss(WebView view, String data, String url, String userAgent, String cookie){
        NetRes res = null;
        try{
            res = client.post(PROXY_PATCH_CSS, userAgent, desktop, data, cookie);
            onProgressChanged(view, 50);
            data = res.getData();
        }catch(Exception e){
            e.printStackTrace();
        }finally{
            if(res != null){
                res.close();
            }
        }
        loadBaseUrlNative(view, url, data, MIMETYPE_CSS);
    }
    public String getUserAgent(final WebView view, final RemoteUserAgentsIds userAgentId){
        final CountDownLatch latch = new CountDownLatch(1);
        final String[] result = new String[1];
        background.execute(new Runnable(){
            @Override
            public void run(){
                NetRes res = null;
                try{
                    String userStr = userAgentId.toString();
                    res = client.post(PROXY_GET_USERAGENT, "", desktop, userStr, null);
                    result[0] = res.getData();
                }catch(Exception e){
                    result[0] = view.getSettings().getUserAgentString();
                }finally{
                    latch.countDown();
                    if(res != null){
                        res.close();
                    }
                }
            }
        });
        try {
            latch.await(); 
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return result[0];
    }
    public void evaluateJavascript(final WebView view, final String code){
        final String userAgent = view.getSettings().getUserAgentString();
        background.execute(new Runnable(){
            @Override public void run(){
                patchJs(view, code, code, true, true, userAgent, null);
            }
        });
    }
    public enum LocalUserAgents{
        LEGACY_WEBKIT("Mozilla/5.0 (Linux; U; Android 4.3; es-es; Galaxy Nexus Build/JWR66Y) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30"),//Webkit 534 (Android 4.3)
        LEGACY_CHROME("Mozilla/5.0 (Linux; Android 4.4.2; Nexus 5 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.0.0 Mobile Safari/537.36"),//Chrome 30 (Android 4.4)
        CHROME_M("Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.95 Mobile Safari/537.36"),//Chrome 48 (Android 6)
        CHROME_K("Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.36"),//Chrome 80 (Android 10)
        CHROME_MODERN("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"),//Chrome 124 (Android 14)
        LEGACY_WEBKIT_DESK("Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30"),//Webkit 534 (Linux Ubuntu)
        LEGACY_CHROME_DESK("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.114 Safari/537.36"),//Chrome 30 (Linux)
        CHROME_M_DESK("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36"),//Chrome 48 (Linux)
        CHROME_K_DESK("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Safari/537.36"),//Chrome 80 (Linux)
        CHROME_MODERN_DESK("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");//Chrome 124 (Linux)

        private final String userAgent;
        
        LocalUserAgents(String userAgent){
            this.userAgent = userAgent;
        }
        @Override
        public String toString() {
            return this.userAgent;
        }
    }
    public enum RemoteUserAgentsIds{
        DEFAULT("default"),//Chrome Mobile 151+ (Android 10)
        FIREFOX_MOBILE("firefoxMobile"),//Firefox Mobile 154+ (Android 13)
        SAFARI_MOBILE("safariMobile"),//Safari Mobile 605+ (iPhone 17)
        CHROME_DESK("chromeDesktop"),//Chrome Desktop 151+ (Linux)
        FIREFOX_DESK("firefoxDesktop"),//Firefox Desktop 154+ (Linux)
        SAFARI_DESK("safariDesktop"),//Safari Desktop 605+ (Mac)
        WEBVIEW_MOBILE("defWebViewCREAMobile"),//WebViewCREA 1.1+ (Android 10)
        WEBVIEW_DESK("defWebViewCREADesktop");//WebViewCREA 1.1+ (Linux)

        private final String userAgentId;

        RemoteUserAgentsIds(String userAgentId){
            this.userAgentId = userAgentId;
        }
        @Override
        public String toString() {
            return this.userAgentId;
        }
    }
}
