package org.CreadoresProgram.WebViewCREA.network;

import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.io.IOException;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.MediaType;

public class NetClient{
  private OkHttpClient clientHt = new OkHttpClient.Builder()
    .connectTimeout(60, TimeUnit.SECONDS)
    .writeTimeout(60, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .build();

  private static final String lang = Locale.getDefault().getLanguage();
  private MediaType mediaType = MediaType.parse("text/html; charset=utf-8");

  public NetRes post(String url, String userAgent, boolean isDesktop, String data) throws IOException{
    RequestBody body = RequestBody.create(mediaType, data);
    Request req = new Request.Builder()
      .url(url)
      .post(body)
      .header("Accept-Language", lang)
      .header("User-Agent", userAgent)
      .header("Sec-CH-UA", "\"WebViewCREA\";v=\"1\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"")
      .header("Sec-CH-UA-Mobile", "?" + (isDesktop ? "0" : "1"))
      .header("Sec-CH-UA-Platform", "\""+(isDesktop ? "Linux" : "Android")+"\"")
      .header("Upgrade-Insecure-Requests", "1")
      .build();
    Response res = clientHt.newCall(req).execute();
    return new NetRes(res);
  }

  public NetRes get(String url, String userAgent, boolean isDesktop) throws IOException{
    Request req = Request.Builder()
      .url(url)
      .header("Accept-Language", lang)
      .header("User-Agent", userAgent)
      .header("Sec-CH-UA", "\"WebViewCREA\";v=\"1\", \"Chromium\";v=\"151\", \"Not.A/Brand\";v=\"24\"")
      .header("Sec-CH-UA-Mobile", "?" + (isDesktop ? "0" : "1"))
      .header("Sec-CH-UA-Platform", "\""+(isDesktop ? "Linux" : "Android")+"\"")
      .header("Upgrade-Insecure-Requests", "1")
      .build();
    Response res = clientHt.newCall(req).execute();
    return new NetRes(res);
  }

  public OkHttpClient getOkClient(){
    return this.clientHt;
  }

  public void setOkClient(OkHttpClient clientHt){
    this.clientHt = clientHt;
  }
}
