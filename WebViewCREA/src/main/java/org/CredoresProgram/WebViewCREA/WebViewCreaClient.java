package org.CredoresProgram.WebViewCREA.utils;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebViewClient;
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
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request){
        String url = request.getUrl().toString();
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
                    return super.shouldInterceptRequest(view, request);
                }
                Document content = Jsoup.parse(response.body().string());
                Element head = content.head();
                for (Element script : content.select("script")) {
                    if (script.attr("type").isEmpty() || script.attr("type").equalsIgnoreCase("text/javascript") || script.attr("type").equalsIgnoreCase("application/javascript")) {
                        script.attr("type", "text/babel");
                    }
                }
                if (head != null) {
                    head.prepend("<script src='https://cdn.jsdelivr.net/npm/babel-standalone@6.26.0/babel.min.js'></script>\n<script src='https://cdn.jsdelivr.net/npm/regenerator-runtime@0.14.1/runtime.min.js' type='text/babel'></script>\n<script src='https://cdnjs.cloudflare.com/ajax/libs/core-js/3.41.0/minified.min.js' type='text/babel'></script>");
                }
                InputStream inputStream = new ByteArrayInputStream(content.html().getBytes("UTF-8"));
                return new WebResourceResponse("text/html", "UTF-8", inputStream);
            }catch(Exception e){
                return super.shouldInterceptRequest(view, request);
            }
        }
        return super.shouldInterceptRequest(view, request);
    }
}