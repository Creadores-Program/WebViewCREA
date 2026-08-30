package org.CreadoresProgram.WebViewCREA.network;

import java.util.Locale;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.io.IOException;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.MediaType;
import okhttp3.ConnectionPool;
import okhttp3.Cookie;
import okhttp3.CookieJar;
import okhttp3.HttpUrl;
import okio.BufferedSink;
import okio.GzipSink;
import okio.Okio;
import android.webkit.CookieManager;

public class NetClient {
  private OkHttpClient clientHt = new OkHttpClient.Builder()
    .connectionPool(new ConnectionPool(5, 5, TimeUnit.MINUTES))
    .connectTimeout(60, TimeUnit.SECONDS)
    .writeTimeout(60, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .cookieJar(new CookieJar() {
      @Override
      public void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
        CookieManager cookieManager = CookieManager.getInstance();
        for (Cookie cookie : cookies) {
          cookieManager.setCookie(url.toString(), cookie.toString());
        }
      }
      @Override
      public List<Cookie> loadForRequest(HttpUrl url) {
        List<Cookie> cookieList = new ArrayList<Cookie>();
        CookieManager cookieManager = CookieManager.getInstance();
        String cookieString = cookieManager.getCookie(url.toString());
        if (cookieString != null && !cookieString.isEmpty()) {
          String[] cookies = cookieString.split(";");
          for (String cookie : cookies) {
            Cookie parsedCookie = Cookie.parse(url, cookie.trim());
            if (parsedCookie != null) {
              cookieList.add(parsedCookie);
            }
          }
        }
        return cookieList;
      }
    })
    .build();

  private static final String lang = Locale.getDefault().getLanguage();
  private MediaType mediaType = MediaType.parse("text/html; charset=utf-8");

  private RequestBody gzipRequestBody(final RequestBody body) {
    return new RequestBody() {
      @Override
      public MediaType contentType() {
        return body.contentType();
      }

      @Override
      public long contentLength() {
        return -1;
      }

      @Override
      public void writeTo(BufferedSink sink) throws IOException {
        BufferedSink gzipSink = Okio.buffer(new GzipSink(sink));
        body.writeTo(gzipSink);
        gzipSink.close();
      }
    };
  }

  public NetRes post(String url, String userAgent, boolean isDesktop, String data, String cookie) throws IOException {
    RequestBody rawBody = RequestBody.create(mediaType, data);
    RequestBody gzippedBody = gzipRequestBody(rawBody);

    Request req = new Request.Builder()
      .url(url)
      .post(gzippedBody)
      .header("Content-Encoding", "gzip")
      .header("Accept-Language", lang)
      .header("User-Agent", userAgent)
      .header("Sec-CH-UA", "\"WebViewCREA\";v=\"1\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"")
      .header("Sec-CH-UA-Mobile", "?" + (isDesktop ? "0" : "1"))
      .header("Sec-CH-UA-Platform", "\"" + (isDesktop ? "Linux" : "Android") + "\"")
      .header("Upgrade-Insecure-Requests", "1")
      .header("Connection", "keep-alive")
      .header("Keep-Alive", "timeout=60, max=100")
      .header("Sec-Fetch-Dest", "document")
      .header("Sec-Fetch-Mode", "navigate")
      .header("Sec-Fetch-Site", "cross-site")
      .header("Sec-Fetch-User", "?1")
      .header("Cookie", (cookie != null) ? cookie : "")
      .build();

    Response res = clientHt.newCall(req).execute();
    return new NetRes(res);
  }

  public NetRes get(String url, String userAgent, boolean isDesktop, String cookie) throws IOException {
    Request req = new Request.Builder()
      .url(url)
      .header("Accept-Language", lang)
      .header("User-Agent", userAgent)
      .header("Sec-CH-UA", "\"WebViewCREA\";v=\"1\", \"Chromium\";v=\"151\", \"Not.A/Brand\";v=\"24\"")
      .header("Sec-CH-UA-Mobile", "?" + (isDesktop ? "0" : "1"))
      .header("Sec-CH-UA-Platform", "\"" + (isDesktop ? "Linux" : "Android") + "\"")
      .header("Upgrade-Insecure-Requests", "1")
      .header("Connection", "keep-alive")
      .header("Keep-Alive", "timeout=60, max=100")
      .header("Sec-Fetch-Dest", "document")
      .header("Sec-Fetch-Mode", "navigate")
      .header("Sec-Fetch-Site", "cross-site")
      .header("Sec-Fetch-User", "?1")
      .build();

    Response res = clientHt.newCall(req).execute();
    return new NetRes(res);
  }

  public OkHttpClient getOkClient() {
    return this.clientHt;
  }

  public void setOkClient(OkHttpClient clientHt) {
    this.clientHt = clientHt;
  }
}
