package org.CreadoresProgram.WebViewCREA.network;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.zip.GZIPOutputStream;

public class NetClient {

    static {
        System.setProperty("http.keepAlive", "true");
        System.setProperty("http.maxConnections", "10");
    }

    private static final int TIMEOUT_MS = 60 * 1000;
    private static final String lang = Locale.getDefault().getLanguage();

    public NetRes post(String url, String userAgent, boolean isDesktop, String data, String cookie) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(TIMEOUT_MS);
        
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "text/html; charset=utf-8");
        conn.setRequestProperty("Content-Encoding", "gzip");
        
        setCommonHeaders(conn, userAgent, isDesktop, cookie);

        byte[] compressedData = compressGzip(data);

        conn.setFixedLengthStreamingMode(compressedData.length);
        OutputStream os = null;
        try {
            os = conn.getOutputStream();
            os.write(compressedData, 0, compressedData.length);
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

    public NetRes get(String url, String userAgent, boolean isDesktop, String cookie) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(TIMEOUT_MS);
        
        conn.setRequestMethod("GET");
        setCommonHeaders(conn, userAgent, isDesktop, cookie);

        return new NetRes(conn);
    }

    private byte[] compressGzip(String data) throws IOException {
        if (data == null || data.length() == 0) {
            return new byte[0];
        }
        ByteArrayOutputStream obj = new ByteArrayOutputStream();
        GZIPOutputStream gzip = new GZIPOutputStream(obj);
        gzip.write(data.getBytes("UTF-8"));
        gzip.flush();
        gzip.close();
        return obj.toByteArray();
    }

    private void setCommonHeaders(HttpURLConnection conn, String userAgent, boolean isDesktop, String cookie) {
        conn.setRequestProperty("Accept-Language", lang);
        conn.setRequestProperty("User-Agent", userAgent);
        conn.setRequestProperty("Sec-CH-UA", "\"WebViewCREA\";v=\"1\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"");
        conn.setRequestProperty("Sec-CH-UA-Mobile", "?" + (isDesktop ? "0" : "1"));
        conn.setRequestProperty("Sec-CH-UA-Platform", "\"" + (isDesktop ? "Linux" : "Android") + "\"");
        conn.setRequestProperty("Sec-Fetch-Dest", "document");
        conn.setRequestProperty("Sec-Fetch-Mode", "navigate");
        conn.setRequestProperty("Sec-Fetch-Site", "cross-site");
        conn.setRequestProperty("Sec-Fetch-User", "?1");
        conn.setRequestProperty("Upgrade-Insecure-Requests", "1");
        conn.setRequestProperty("Connection", "keep-alive");
        conn.setRequestProperty("Keep-Alive", "timeout=60, max=100");
        if (cookie != null && cookie.trim().length() > 0) {
            conn.setRequestProperty("Cookie", cookie);
        }
    }
}
