package org.CreadoresProgram.WebViewCREA.network;

import java.io.OutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public class NetClient {

    static {
        System.setProperty("http.keepAlive", "true");
        System.setProperty("http.maxConnections", "10");
    }

    private static final int TIMEOUT_MS = 60 * 1000;
    private static final String lang = Locale.getDefault().getLanguage();

    public NetRes post(String url, String userAgent, boolean isDesktop, String data) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(TIMEOUT_MS);
        
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "text/html; charset=utf-8");
        setCommonHeaders(conn, userAgent, isDesktop);

        OutputStream os = null;
        try {
            byte[] input = data.getBytes("UTF-8");
            conn.setFixedLengthStreamingMode(input.length);
            os = conn.getOutputStream();
            os.write(input, 0, input.length);
            os.flush();
        } finally {
            if (os != null) {
                try {
                    os.close();
                } catch (IOException e) {
                }
            }
        }

        return new NetRes(conn);
    }

    public NetRes get(String url, String userAgent, boolean isDesktop) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(TIMEOUT_MS);
        
        conn.setRequestMethod("GET");
        setCommonHeaders(conn, userAgent, isDesktop);

        return new NetRes(conn);
    }

    private void setCommonHeaders(HttpURLConnection conn, String userAgent, boolean isDesktop) {
        conn.setRequestProperty("Accept-Language", lang);
        conn.setRequestProperty("User-Agent", userAgent);
        conn.setRequestProperty("Sec-CH-UA", "\"WebViewCREA\";v=\"1\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"");
        conn.setRequestProperty("Sec-CH-UA-Mobile", "?" + (isDesktop ? "0" : "1"));
        conn.setRequestProperty("Sec-CH-UA-Platform", "\"" + (isDesktop ? "Linux" : "Android") + "\"");
        conn.setRequestProperty("Upgrade-Insecure-Requests", "1");
        conn.setRequestProperty("Connection", "keep-alive");
        conn.setRequestProperty("Keep-Alive", "timeout=60, max=100");
    }
}
