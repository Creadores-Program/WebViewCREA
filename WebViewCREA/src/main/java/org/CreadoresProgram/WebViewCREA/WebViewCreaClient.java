package org.CreadoresProgram.WebViewCREA;
import android.webkit.WebViewClient;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.os.Build;

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
        if(!urlPassed){
            return false;
        }
        if(url.startsWith(urlsPassed[2])){
            //javascript:
            final String data = url.replaceFirst(urlsPassed[2]+":", "");
            background.execute(new Runnable(){
                @Override public void run(){
                    patchJs(view, data, url, true, false);
                }
            });
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
                    if (contentType.contains(MIMETYPE_HTML)) {
                        urlsVerified.add(url);
                        patchHtml(view, res.getData(), url);
                    } else if (contentType.contains(MIMETYPE_CSS)) {
                        urlsVerified.add(url);
                        patchCss(view, res.getData(), url);
                    } else if (contentType.contains(urlsPassed[2]) || contentType.contains("ecmascript")) {
                        urlsVerified.add(url);
                        patchJs(view, res.getData(), url, false, false);
                    }else if(contentType.contains("text/") || contentType.contains("json")){
                        urlsVerified.add(url);
                        view.loadDataWithBaseURL(url, res.getData(), contentType, ENCODE, null);
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

    public void loadUrl(WebView view, String url){
        if(!uniShouldOverrideUrlLoading(view, url)){
            urlsVerified.add(url);
            view.loadUrl(url);
        }
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
    private void patchHtml(WebView view, String data, String url){
        data = insertTagWebView(data, url);
        NetRes res = null;
        try{
            res = client.post(PROXY_PATCH_HTML, view.getSettings().getUserAgentString(), desktop, data);
            data = res.getData();
        }catch(Exception e){
            e.printStackTrace();
        }finally{
            if(res != null){
                res.close();
            }
        }
        view.loadDataWithBaseURL(url, data, MIMETYPE_HTML, ENCODE, null);
    }
    private String insertTagWebView(String data, String url){
        url = url.replace("\"", "&quot;");
        if(data.matches("(?s).*"+REGEX_HEADTAG + ".*")){
            return data.replaceFirst(REGEX_HEADTAG, "$1>" + "<webviewcrea baseurl=\""+url+"\"/>");
        }else{
            return "<webviewcrea baseurl=\""+url+"\"/>" + data;
        }
    }
    private void patchJs(WebView view, String data, String url, boolean execute, boolean kitkatExecute){
        NetRes res = null;
        try{
            res = client.post(PROXY_PATCH_JS, view.getSettings().getUserAgentString(), desktop, data);
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
            urlsVerified.add(url);
            view.loadUrl(url);
        }else{
            view.loadDataWithBaseURL(url, data, MIMETYPE_JS, ENCODE, null);
        }
    }
    private static void evalJsKK(final WebView view, final String code){
        view.post(new Runnable(){
            @Override public void run(){
                view.evaluateJavascript(code, null);
            }
        });
    }
    private void patchCss(WebView view, String data, String url){
        NetRes res = null;
        try{
            res = client.post(PROXY_PATCH_CSS, view.getSettings().getUserAgentString(), desktop, data);
            data = res.getData();
        }catch(Exception e){
            e.printStackTrace();
        }finally{
            if(res != null){
                res.close();
            }
        }
        view.loadDataWithBaseURL(url, data, MIMETYPE_CSS, ENCODE, null);
    }
    public String getUserAgent(WebView view, UserAgentsIds userAgentId) throws Exception{
        String userStr = userAgentId.toString();
        NetRes res = null;
        try{
            res = client.post(PROXY_GET_USERAGENT, view.getSettings().getUserAgentString(), desktop, userStr);
            return res.getData();
        }finally{
            if(res != null){
                res.close();
            }
        }
    }
    public void evaluateJavascript(final WebView view, final String code){
        background.execute(new Runnable(){
            @Override public void run(){
                patchJs(view, code, code, true, true);
            }
        });
    }
    public enum UserAgentsIds{
        DEFAULT("default"),//Chrome Mobile 151+ (Android 10)
        FIREFOX_MOBILE("firefoxMobile"),//Firefox Mobile 154+ (Android 13)
        SAFARI_MOBILE("safariMobile"),//Safari Mobile 605+ (iPhone 17)
        CHROME_DESK("chromeDesktop"),//Chrome Desktop 151+ (Linux)
        FIREFOX_DESK("firefoxDesktop"),//Firefox Desktop 154+ (Linux)
        SAFARI_DESK("safariDesktop"),//Safari Desktop 605+ (Mac)
        WEBVIEW_MOBILE("defWebViewCREAMobile"),//WebViewCREA 1.1+ (Android 10)
        WEBVIEW_DESK("defWebViewCREADesktop");//WebViewCREA 1.1+ (Linux)

        private final String userAgentId;

        UserAgentsIds(String userAgentId){
            this.userAgentId = userAgentId;
        }
        @Override
        public String toString() {
            return this.userAgentId;
        }
    }
}
