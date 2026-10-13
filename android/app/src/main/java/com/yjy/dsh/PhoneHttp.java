package com.yjy.dsh;

import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Fixed-origin native transport. No redirects, external URLs or secret logging. */
final class PhoneHttp {
    static final class Rejected extends Exception {
        final int status;
        Rejected(int code) { super("连接被拒绝（" + code + "）"); status = code; }
    }
    static JSONObject post(String operation, String cookie, String key, JSONObject body) throws Exception {
        if (!operation.matches("start|poll|result|stop")) throw new IllegalArgumentException("Unknown route");
        HttpURLConnection c = (HttpURLConnection) new URL(NavigationPolicy.HOME + "/phone-control/" + operation).openConnection();
        try {
            c.setInstanceFollowRedirects(false);
            c.setRequestMethod("POST"); c.setConnectTimeout(8000); c.setReadTimeout(8000); c.setDoOutput(true);
            c.setRequestProperty("Cookie", cookie);
            c.setRequestProperty("X-DSH-Native", "1"); c.setRequestProperty("X-DSH-Phone", key);
            c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            if (payload.length > 65536) throw new IllegalArgumentException("结果太大");
            c.setFixedLengthStreamingMode(payload.length);
            try (java.io.OutputStream out = c.getOutputStream()) { out.write(payload); }
            int code = c.getResponseCode();
            if (code != 200) throw new Rejected(code);
            try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[2048]; int n;
                while ((n = in.read(buffer)) != -1) { if (out.size() + n > 65536) throw new IllegalArgumentException("响应太大"); out.write(buffer, 0, n); }
                return new JSONObject(out.toString("UTF-8"));
            }
        } finally { c.disconnect(); }
    }
    private PhoneHttp() { }
}
