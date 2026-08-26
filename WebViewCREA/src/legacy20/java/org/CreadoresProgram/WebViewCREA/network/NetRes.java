package org.CreadoresProgram.WebViewCREA.network;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

public class NetRes {
    private HttpURLConnection connection;

    public NetRes(HttpURLConnection connection) {
        this.connection = connection;
    }

    public Map<String, String> getHeaders() {
        Map<String, String> headersMap = new HashMap<String, String>();
        
        Map<String, List<String>> map = connection.getHeaderFields();
        for (Map.Entry<String, List<String>> entry : map.entrySet()) {
            String key = entry.getKey();
            List<String> values = entry.getValue();
            
            if (key != null && values != null && !values.isEmpty()) {
                headersMap.put(key, values.get(values.size() - 1));
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
        InputStream is = null;
        try {
            int responseCode = connection.getResponseCode();
            if (responseCode >= 400) {
                is = connection.getErrorStream();
            } else {
                is = connection.getInputStream();
            }

            if (is == null) {
                return "";
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } finally {
            if (is != null) {
                try {
                    is.close();
                } catch (IOException e) {
                }
            }
        }
    }

    public void close() {
        if (connection != null) {
            connection.disconnect();
        }
    }
}