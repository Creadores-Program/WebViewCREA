package org.CreadoresProgram.WebViewCREA.network;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
public class NetClient{
  private OkHttpClient clientHt = new OkHttpClient.Builder()
    .connectTimeout(60, TimeUnit.SECONDS)
    .writeTimeout(60, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .build();
}
