package org.CredoresProgram.WebViewCREA;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebViewClient;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
public class WebViewCreaClient extends WebViewClient{
    private OkHttpClient client = new OkHttpClient();
    private final Map<String, String> mapMethods = new HashMap<String, String>();
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        String httpMethod = request.getMethod();
        registerMethod(url, httpMethod);
        WebResourceResponse data = uniShouldInterceptRequest(view, url);
        if(data != null){
            return data;
        }
        return super.shouldInterceptRequest(view, url);
    }
    @SuppressWarnings("deprecation")
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, String url){
        WebResourceResponse data = uniShouldInterceptRequest(view, url);
        if(data != null){
            return data;
        }
        return super.shouldInterceptRequest(view, url);
    }
    public String shouldInterceptRequestG(WebView view, String url, String method){}
    private WebResourceResponse uniShouldInterceptRequest(WebView view, String url){}
    private String getRequest(String url){}
    private void optionsRequest(String url){}
    private void headRequest(String url){}
    private String traceRequest(String url){}
    private String connectRequest(String url){}
    private String deleteRequest(String url){}
    public OkHttpClient getOkClient(){
        return this.client;
    }
    public void setOkClient(OkHttpClient client){
        this.client = client;
    }
    @JavascriptInterface
    public void registerMethod(String url, String method){
        this.mapMethods.put(url, method);
    }
}
