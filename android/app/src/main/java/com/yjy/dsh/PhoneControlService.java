package com.yjy.dsh;

import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import org.json.JSONArray;
import org.json.JSONObject;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public class PhoneControlService extends Service {
    private static final String CHANNEL = "dsh-phone-control";
    private Thread worker;
    private long generation;
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public int onStartCommand(Intent intent,int flags,int startId) {
        if (intent == null || "stop".equals(intent.getAction())) {
            PhoneState.stop("手机操控已停止"); PhoneAccessibilityService.updateOverlay(); stopSelf(); return START_NOT_STICKY;
        }
        if (worker != null || !PhoneState.ready()) return START_NOT_STICKY;
        generation=PhoneState.generation;
        String cookie=intent.getStringExtra("cookie"),session=intent.getStringExtra("sessionId");
        ArrayList<String> packages=intent.getStringArrayListExtra("packages"),labels=intent.getStringArrayListExtra("labels");
        if(cookie==null||!PhonePolicy.sessionId(session)||packages==null||labels==null||packages.size()!=labels.size()){PhoneState.stop("无效的手机操控授权");stopSelf();return START_NOT_STICKY;}
        NotificationManager nm=getSystemService(NotificationManager.class);
        if(Build.VERSION.SDK_INT>=26){NotificationChannel ch=new NotificationChannel(CHANNEL,"手机操控与停止",NotificationManager.IMPORTANCE_LOW);nm.createNotificationChannel(ch);}
        Intent stop=new Intent(this,PhoneControlService.class).setAction("stop");
        PendingIntent stopIntent=PendingIntent.getService(this,11,stop,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        PendingIntent open=PendingIntent.getActivity(this,12,new Intent(this,PhoneControlActivity.class).putExtra("sessionId",session),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder n=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        n.setSmallIcon(R.drawable.ic_launcher).setContentTitle("DSH 手机操控已开启").setContentText("仅本次授权应用 · 最多 10 分钟 · 点停止可立即结束").setOngoing(true).setContentIntent(open).addAction(new Notification.Action.Builder(android.R.drawable.ic_media_pause,"停止",stopIntent).build());
        startForeground(71,n.build());PhoneAccessibilityService.updateOverlay();
        worker=new Thread(()->connect(cookie,session,packages,labels,generation),"dsh-phone-session");worker.start();
        return START_NOT_STICKY;
    }
    private void connect(String cookie,String session,ArrayList<String> packages,ArrayList<String> labels,long grant) {
        byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);StringBuilder hex=new StringBuilder();for(byte b:bytes)hex.append(String.format(java.util.Locale.ROOT,"%02x",b&255));String key=hex.toString();
        HashSet<String> seen=new HashSet<>();
        try {
            JSONArray apps=new JSONArray();for(int i=0;i<packages.size();i++)apps.put(new JSONObject().put("package",packages.get(i)).put("label",labels.get(i)));
            PhoneHttp.post("start",cookie,key,new JSONObject().put("key",key).put("sessionId",session).put("apps",apps));
            if(!PhoneState.ready(grant))return;
            PhoneState.status="已连接，等待这条对话的指令";long backoff=1500;
            while(PhoneState.ready(grant)) {
                if(getSystemService(KeyguardManager.class).isKeyguardLocked()){PhoneState.stop("手机已锁屏，操控已停止");break;}
                if(PhoneAccessibilityService.get()==null){PhoneState.stop("无障碍服务已关闭，操控已停止");break;}
                try {
                    JSONObject response=PhoneHttp.post("poll",cookie,key,new JSONObject());backoff=1500;
                    if(!PhoneState.ready(grant))break;
                    JSONObject command=response.optJSONObject("command");
                    if(command!=null) {
                        String id=command.optString("id");
                        if(!id.matches("[a-f0-9]{32}")||command.optLong("remainingMs")<=0||!seen.add(id))throw new IllegalStateException("重复或过期指令已拦截");
                        PhoneState.status="正在执行："+command.optString("operation");
                        AtomicReference<JSONObject> value=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
                        PhoneAccessibilityService service=PhoneAccessibilityService.get();
                        if(service==null){PhoneState.stop("无障碍服务已关闭");break;}
                        service.execute(command,grant,result->{value.set(result);done.countDown();});
                        if(!done.await(6,TimeUnit.SECONDS)){PhoneState.stop("指令执行未确认，请先检查屏幕；不会自动重试");break;}
                        if(!PhoneState.ready(grant))break;
                        JSONObject result=new JSONObject().put("id",id).put("result",value.get());
                        // Retrying a RESULT is safe; the action itself is never retried.
                        try{PhoneHttp.post("result",cookie,key,result);}catch(PhoneHttp.Rejected rejected){throw rejected;}catch(Exception transientFailure){Thread.sleep(500);PhoneHttp.post("result",cookie,key,result);}
                        PhoneState.commands++;
                        PhoneState.status="已执行 "+PhoneState.commands+" 条指令，等待下一条";
                    }
                } catch(PhoneHttp.Rejected rejected){PhoneState.stop("授权或连接已失效，请回手机重新开启（"+rejected.status+"）");break;}
                catch(InterruptedException cancelled){break;}
                catch(Exception unavailable){PhoneState.status="网络暂不可用，未确认的操作不会重试";backoff=Math.min(12000,backoff*2);}
                Thread.sleep(backoff);
            }
        } catch(InterruptedException cancelled){Thread.currentThread().interrupt();}
        catch(Exception failure){if(PhoneState.generation==grant)PhoneState.stop("无法连接手机操控服务，请确认配对与网络");}
        finally {
            if(PhoneState.generation==grant){if(PhoneState.active)PhoneState.stop("本次手机操控已结束");PhoneAccessibilityService.updateOverlay();stopSelf();}
            try{PhoneHttp.post("stop",cookie,key,new JSONObject());}catch(Exception ignored){ }
        }
    }
    @Override public void onDestroy(){
        if(PhoneState.generation==generation)PhoneState.stop("手机操控已停止");
        PhoneAccessibilityService.updateOverlay();if(worker!=null)worker.interrupt();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
}
