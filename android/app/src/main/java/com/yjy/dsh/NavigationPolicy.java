package com.yjy.dsh;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

/** Top-level navigation policy. It never handles credentials or webpage content. */
final class NavigationPolicy {
    static final String HOME = BuildConfig.DSH_BASE_URL;
    private static final String HOST = URI.create(HOME).getHost();

    enum Destination { INTERNAL, EXTERNAL, BLOCKED }

    static Destination classify(String value) {
        if (value == null || value.isEmpty() || containsControlCharacter(value)) {
            return Destination.BLOCKED;
        }
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            if (scheme == null) return Destination.BLOCKED;
            scheme = scheme.toLowerCase(Locale.ROOT);
            if ("https".equals(scheme) || "http".equals(scheme)) {
                // Reject user-info and malformed authorities, including lookalike host tricks.
                if (uri.getHost() == null || uri.getRawUserInfo() != null) {
                    return Destination.BLOCKED;
                }
                int port = uri.getPort();
                if (port < -1 || port > 65535) return Destination.BLOCKED;
                if ("https".equals(scheme) && HOST.equalsIgnoreCase(uri.getHost())
                        && (port == -1 || port == 443)) {
                    return Destination.INTERNAL;
                }
                return Destination.EXTERNAL;
            }
            if (("mailto".equals(scheme) || "tel".equals(scheme))
                    && uri.getRawSchemeSpecificPart() != null
                    && !uri.getRawSchemeSpecificPart().isEmpty()) {
                return Destination.EXTERNAL;
            }
        } catch (URISyntaxException ignored) {
            // Untrusted input is rejected without logging URLs that might carry pairing data.
        }
        return Destination.BLOCKED;
    }

    static boolean isInternal(String value) {
        return classify(value) == Destination.INTERNAL;
    }

    private static boolean containsControlCharacter(String value) {
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isISOControl(c) || c == '\\') return true;
        }
        return false;
    }
}
