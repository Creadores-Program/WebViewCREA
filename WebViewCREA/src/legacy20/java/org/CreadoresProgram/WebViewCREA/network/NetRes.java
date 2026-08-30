package org.CreadoresProgram.WebViewCREA.network;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.zip.GZIPInputStream;

public class NetRes {
    private HttpURLConnection connection;

    public NetRes(HttpURLConnection connection) {
        this.connection = connection;
    }

    public Map<String, String> getHeaders() {
        Map<String, String> headersMap = new HashMap<String, String>();
        Map<String, List<String>> map = connection.getHeaderFields();
        if (map != null) {
            for (Map.Entry<String, List<String>> entry : map.entrySet()) {
                String key = entry.getKey();
                List<String> values = entry.getValue();
                if (key != null && values != null && !values.isEmpty()) {
                    headersMap.put(key.toLowerCase(), values.get(values.size() - 1));
                }
            }
        }
        return headersMap;
    }

    public boolean isSuccessful() throws IOException {
        return getStatusCode() == HttpURLConnection.HTTP_OK;
    }

    public int getStatusCode() throws IOException {
        return connection.getResponseCode();
    }

    public String getData() throws IOException {
        InputStream rawStream = null;
        try {
            int responseCode = connection.getResponseCode();
            if (responseCode >= 400) {
                rawStream = connection.getErrorStream();
            } else {
                rawStream = connection.getInputStream();
            }

            if (rawStream == null) {
                return "";
            }

            String encoding = connection.getContentEncoding();
            boolean isGzip = (encoding != null && encoding.toLowerCase().contains("gzip"));

            InputStream streamToRead = isGzip ? new GZIPInputStream(rawStream) : rawStream;

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buffer = new byte[2048];
            int len;
            while ((len = streamToRead.read(buffer)) != -1) {
                baos.write(buffer, 0, len);
            }
            streamToRead.close();

            return new String(baos.toByteArray(), "UTF-8");

        } finally {
            if (rawStream != null) {
                try { rawStream.close(); } catch (IOException e) {}
            }
        }
    }

    public void close() {
        if (connection == null) return;
        try {
            connection.disconnect();
        } catch (Exception e) {
        } finally {
            connection = null;
        }
    }
}
