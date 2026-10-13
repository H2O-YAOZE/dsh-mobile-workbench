package com.yjy.dsh;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

/** Pure policy shared with local JVM regression checks. No implicit permissions. */
final class PhonePolicy {
    static final long MAX_SESSION_MS = 600_000;
    static final int MAX_COMMANDS = 60;
    static boolean sessionId(String value) { return value != null && value.matches("[-A-Za-z0-9:_~]{1,256}"); }
    static String nativeSession(String url) {
        if (!NavigationPolicy.isInternal(url)) return null;
        try {
            URI u = new URI(url);
            if (!"/phone-control/native".equals(u.getPath())) return null;
            String query = u.getRawQuery();
            if (query == null) return null;
            for (String part : query.split("&")) {
                if (part.startsWith("sessionId=")) {
                    String id = java.net.URLDecoder.decode(part.substring(10), "UTF-8");
                    return sessionId(id) ? id : null;
                }
            }
        } catch (Exception ignored) { }
        return null;
    }
    static boolean fraction(double value) { return Double.isFinite(value) && value >= 0 && value <= 1; }
    static boolean allowed(Set<String> packages, String pkg) { return pkg != null && packages.contains(pkg); }
    static boolean requiresManual(String text) {
        if (text == null) return false;
        String t = text.toLowerCase(Locale.ROOT).trim();
        return t.matches(".*(付款|支付|转账|购买|删除|发送|提交订单|确认订单|卸载|恢复出厂|重置手机).*" )
                || t.matches(".*\\b(send|pay|purchase|delete|uninstall|factory reset)\\b.*");
    }
    private PhonePolicy() { }
}
