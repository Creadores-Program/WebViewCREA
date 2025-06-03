package org.CredoresProgram.WebViewCREA.utils;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebViewClient;
import android.webkit.WebView;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
public class WebViewCreaClient extends WebViewClient{
    private OkHttpClient client = new OkHttpClient();
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        return shouldInterceptRequest(view, url);
    }
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, String url){
        String[] partes = url.split("/");
        if(url.toLowerCase().endsWith(".html") || !partes[partes.length - 1].contains(".")){
            Request request = new Request.Builder()
            .url(url)
            .addHeader("User-Agent", view.getSettings().getUserAgentString())
            .build();
            Response response = null;
            try {
                response = client.newCall(request).execute();
                if (!response.isSuccessful() || response.body() == null) {
                    return super.shouldInterceptRequest(view, url);
                }
                Document content = Jsoup.parse(response.body().string());
                Element head = content.head();
                for (Element script : content.select("script")) {
                    if (script.attr("type").isEmpty() || script.attr("type").equalsIgnoreCase("text/javascript") || script.attr("type").equalsIgnoreCase("application/javascript")) {
                        script.attr("type", "text/babel");
                    }
                }
                if (head != null) {
                    String urlPrefix = "file:///android_asset/WebViewCrea";
                    head.prepend("<script src='"+urlPrefix+"/babel.min.js'></script>\n<script src='"+urlPrefix+"/runtime.js' type='text/babel'></script>\n<script src='"+urlPrefix+"/core-js.min.js' type='text/babel'></script>\n<script src='"+urlPrefix+"/customEventPoly.js' type='text/babel'></script>\n<script src='"+urlPrefix+"/fetch.js' type='text/babel'></script>\n<script src='"+urlPrefix+"/url-polyfill.js' type='text/babel'></script>\n");
                }
                InputStream inputStream = new ByteArrayInputStream(content.html().getBytes("UTF-8"));
                return new WebResourceResponse("text/html", "UTF-8", inputStream);
            }catch(Exception e){
                return super.shouldInterceptRequest(view, url);
            }
        }
        return super.shouldInterceptRequest(view, url);
    }
}