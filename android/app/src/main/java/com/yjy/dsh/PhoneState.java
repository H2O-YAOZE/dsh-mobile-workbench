package com.yjy.dsh;

import android.os.SystemClock;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/** A grant lives only in memory. Process death/stop/expiry never restores it. */
final class PhoneState {
    static volatile boolean active;
    static volatile long expiresAt;
    static volatile int commands;
    static volatile long generation;
    static volatile Set<String> apps = Collections.emptySet();
    static volatile String status = "手机操控未开启";
    static synchronized void start(Set<String> allowed) {
        apps = Collections.unmodifiableSet(new HashSet<>(allowed));
        commands = 0;
        generation++;
        expiresAt = SystemClock.elapsedRealtime() + PhonePolicy.MAX_SESSION_MS;
        active = true;
        status = "连接云端中…";
    }
    static boolean ready() { return active && SystemClock.elapsedRealtime() < expiresAt && commands < PhonePolicy.MAX_COMMANDS; }
    static boolean ready(long value) { return generation == value && ready(); }
    static synchronized void stop(String reason) { active = false; apps = Collections.emptySet(); status = reason; }
    private PhoneState() { }
}
