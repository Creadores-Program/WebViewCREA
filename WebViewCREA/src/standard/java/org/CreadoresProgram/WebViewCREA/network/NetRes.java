package org.CreadoresProgram.WebViewCREA.network;

import okhttp3.Response;
import okhttp3.Headers;

import java.io.IOException;
import java.util.Map;
import java.util.HashMap;

public class NetRes {
  private Response response;

  public NetRes(Response response){
    this.response = response;
  }

  public boolean isSuccessful() throws IOException {
    return response.isSuccessful();
  }

  public int getStatusCode() throws IOException {
    return response.code();
  }

  public Map<String, String> getHeaders(){
    Headers headers = response.headers();
    Map<String, String> HeadersMap = new HashMap<String, String>();

    for (String name : headers.names()) {
      HeadersMap.put(name, response.header(name));
    }
    return headersMap;
  }
  public String getData(){
    return response.body().string();
  }
  public void close(){
    response.close();
  }
}
