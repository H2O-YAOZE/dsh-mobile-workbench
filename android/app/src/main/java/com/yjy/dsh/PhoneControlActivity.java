package com.yjy.dsh;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashSet;

public class PhoneControlActivity extends Activity {
    static volatile boolean configurationVisible;
    private final Handler handler = new Handler(android.os.Looper.getMainLooper());
    private final LinkedHashMap<String,String> apps = new LinkedHashMap<>();
    private final HashSet<String> selected = new HashSet<>();
    private TextView status, selection;
    private String sessionId;
    private final Runnable refresh = new Runnable() { public void run() { update(); handler.postDelayed(this, 1000); } };

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved); sessionId = getIntent().getStringExtra("sessionId");
        if (saved != null) { String[] previous = saved.getStringArray("selected"); if (previous != null) java.util.Collections.addAll(selected, previous); }
        else selected.add(getPackageName());
        ScrollView scroll = new ScrollView(this); LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL); column.setPadding(30,30,30,30); column.setBackgroundColor(Color.rgb(234,242,251)); scroll.addView(column); setContentView(scroll);
        TextView title = new TextView(this); title.setText("手机操控"); title.setTextSize(25); title.setTextColor(Color.rgb(19,36,67)); column.addView(title);
        TextView detail = new TextView(this); detail.setText("只允许当前这条 DSH 对话操作你勾选的应用。每次开启最多 10 分钟、60 条指令。\n\n开启后可读屏、点击、输入和滑动；密码字段不读取、不输入。发送、付款、删除等按钮需你手动完成。\n\n不需要谷歌服务、Shizuku 或 Termux。锁屏后停止操作。关闭本页不会停止，请使用停止按钮或通知。"); detail.setTextSize(16); detail.setTextColor(Color.rgb(64,89,121)); detail.setPadding(0,20,0,20); column.addView(detail);
        status = new TextView(this); status.setTextSize(16); status.setTextColor(Color.rgb(7,91,181)); column.addView(status);
        selection = new TextView(this); selection.setTextColor(Color.rgb(19,36,67)); selection.setPadding(0,20,0,12); column.addView(selection);
        apps.put(getPackageName(), "DSH（含安全测试页）");
        Intent launcher = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        for (ResolveInfo r : getPackageManager().queryIntentActivities(launcher, 0)) if (r.activityInfo != null) apps.put(r.activityInfo.packageName, r.loadLabel(getPackageManager()).toString());
        button(column,"选择允许操作的应用", this::chooseApps);
        button(column,"开启无障碍服务", () -> { Intent i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS); startActivity(i); });
        button(column,"开始本次操控（10 分钟）", this::startControl);
        button(column,"停止手机操控", () -> { PhoneState.stop("你已停止手机操控"); startService(new Intent(this, PhoneControlService.class).setAction("stop")); update(); });
        button(column,"打开安全测试页", () -> startActivity(new Intent(this, PhoneTestActivity.class)));
        button(column,"返回对话", this::finish); update();
    }
    private void button(LinearLayout parent, String label, Runnable action) { Button b = new Button(this); b.setText(label); b.setOnClickListener(v -> action.run()); parent.addView(b); }
    private void update() {
        if (status == null) return;
        status.setText(PhoneState.status + (PhoneState.ready() ? "\n剩余 " + Math.max(0,(PhoneState.expiresAt-android.os.SystemClock.elapsedRealtime())/1000) + " 秒" : "") + "\n无障碍：" + (PhoneAccessibilityService.get() != null ? "已连接" : "未开启"));
        ArrayList<String> labels = new ArrayList<>(); for (String pkg : selected) labels.add(apps.getOrDefault(pkg,pkg)); selection.setText("允许操作：" + String.join("、",labels));
    }
    private void chooseApps() {
        String[] packages = apps.keySet().toArray(new String[0]), labels = apps.values().toArray(new String[0]); boolean[] checks = new boolean[packages.length];
        for(int i=0;i<checks.length;i++)checks[i]=selected.contains(packages[i]);
        new AlertDialog.Builder(this).setTitle("只勾选本次需要的应用").setMultiChoiceItems(labels,checks,(dialog,index,on)->{checks[index]=on;}).setPositiveButton("保存",(d,w)->{selected.clear();for(int i=0;i<checks.length;i++)if(checks[i])selected.add(packages[i]);update();}).setNegativeButton("取消",null).show();
    }
    private void startControl() {
        if (!PhonePolicy.sessionId(sessionId)) { toast("请回到已保存的对话，在更多里开启手机操控"); return; }
        if (PhoneState.active) { toast("请先停止正在进行的操控，再开始新会话"); return; }
        if (PhoneAccessibilityService.get() == null) { toast("请先在系统无障碍设置里开启 DSH 手机操控"); return; }
        if (selected.isEmpty() || selected.size()>20) { toast("请勾选 1 到 20 个应用"); return; }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) { requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 51); return; }
        String raw = CookieManager.getInstance().getCookie(NavigationPolicy.HOME), cookie = null;
        if (raw != null) for (String c : raw.split(";")) if (c.trim().startsWith("lg_device=")) cookie = c.trim();
        if (cookie == null) { toast("请先在 DSH 完成手机配对"); return; }
        new AlertDialog.Builder(this).setTitle("开启这条对话的手机操控？").setMessage("DSH 将在 10 分钟内读取并操作已勾选应用的可访问界面。屏幕文字会传到你的云端用于执行任务。其他对话不获授权；你可随时点屏幕上的停止按钮。").setNegativeButton("取消",null).setPositiveButton("开启",(d,w)->launch(cookieValue())).show();
    }
    private String cookieValue() { String raw=CookieManager.getInstance().getCookie(NavigationPolicy.HOME);if(raw!=null)for(String c:raw.split(";"))if(c.trim().startsWith("lg_device="))return c.trim();return null; }
    private void launch(String cookie) {
        if (cookie == null) { toast("配对已失效，请重新进入 DSH"); return; }
        ArrayList<String> packages = new ArrayList<>(selected), labels = new ArrayList<>();for(String p:packages)labels.add(apps.getOrDefault(p,p));
        PhoneState.start(selected);
        Intent i = new Intent(this,PhoneControlService.class).setAction("start").putExtra("cookie",cookie).putExtra("sessionId",sessionId).putStringArrayListExtra("packages",packages).putStringArrayListExtra("labels",labels);
        try { if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i); }
        catch(RuntimeException e){PhoneState.stop("无法开启后台控制，请检查系统限制");toast(PhoneState.status);}
        update();
    }
    private void toast(String value){Toast.makeText(this,value,Toast.LENGTH_LONG).show();}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){
        super.onRequestPermissionsResult(request,permissions,grants);
        if(request==51){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)startControl();else toast("请允许显示停止通知，再开启手机操控");}
    }
    @Override protected void onResume(){super.onResume();configurationVisible=true;handler.post(refresh);}
    @Override protected void onPause(){configurationVisible=false;handler.removeCallbacks(refresh);super.onPause();}
    @Override protected void onSaveInstanceState(Bundle out){out.putStringArray("selected",selected.toArray(new String[0]));super.onSaveInstanceState(out);}
}
