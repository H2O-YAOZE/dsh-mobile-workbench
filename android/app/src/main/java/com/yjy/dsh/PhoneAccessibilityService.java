package com.yjy.dsh;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.app.KeyguardManager;
import android.content.Intent;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.PixelFormat;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Button;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

public class PhoneAccessibilityService extends AccessibilityService {
    private static volatile java.lang.ref.WeakReference<PhoneAccessibilityService> reference=new java.lang.ref.WeakReference<>(null);
    static PhoneAccessibilityService get(){return reference.get();}
    private final Handler main=new Handler(Looper.getMainLooper());
    private Button overlay;
    private String screenId,screenPackage;
    private int screenWindow;
    private long readAt;
    private final List<NodePath> nodes=new ArrayList<>();
    private static final class NodePath {
        final int[] path;final String stamp;final Rect bounds;
        NodePath(int[] p,String s,Rect r){path=p;stamp=s;bounds=r;}
    }
    @Override protected void onServiceConnected(){reference=new java.lang.ref.WeakReference<>(this);showOverlay();}
    @Override public void onAccessibilityEvent(AccessibilityEvent event){
        if(event!=null&&event.getEventType()==AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED&&event.getPackageName()!=null&&!event.getPackageName().toString().equals(screenPackage))invalidate();
    }
    @Override public void onInterrupt(){PhoneState.stop("无障碍服务被中断");invalidate();showOverlay();}
    @Override public void onDestroy(){if(get()==this)reference.clear();PhoneState.stop("无障碍服务已断开");invalidate();removeOverlay();super.onDestroy();}
    private void invalidate(){screenId=null;nodes.clear();}
    static void updateOverlay(){PhoneAccessibilityService service=get();if(service!=null)service.main.post(service::showOverlay);}
    private void removeOverlay(){if(overlay!=null){try{getSystemService(WindowManager.class).removeView(overlay);}catch(RuntimeException ignored){}overlay=null;}}
    private void showOverlay(){
        if(!PhoneState.ready()){removeOverlay();return;}if(overlay!=null)return;
        overlay=new Button(this);overlay.setText("DSH 操控中 · 停止");overlay.setTextSize(12);overlay.setTextColor(android.graphics.Color.WHITE);overlay.setBackgroundColor(android.graphics.Color.rgb(7,91,181));
        // This stop control is never part of the agent's screen tree.
        overlay.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        overlay.setOnClickListener(v->{PhoneState.stop("你已停止手机操控");invalidate();removeOverlay();startService(new Intent(this,PhoneControlService.class).setAction("stop"));});
        WindowManager.LayoutParams p=new WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT);
        p.gravity=Gravity.TOP|Gravity.END;p.y=Math.round(48*getResources().getDisplayMetrics().density);
        try{getSystemService(WindowManager.class).addView(overlay,p);}catch(RuntimeException unavailable){overlay=null;PhoneState.stop("无法显示停止按钮，操控未开启");}
    }
    private JSONObject fail(String message){return value(false,message);}
    private JSONObject value(boolean ok,String message){try{return new JSONObject().put("ok",ok).put("message",message);}catch(Exception e){return new JSONObject();}}
    private boolean unlocked(){return !getSystemService(KeyguardManager.class).isKeyguardLocked();}
    private AccessibilityNodeInfo root(){
        if(!unlocked())throw new IllegalStateException("锁屏时不能操作手机");
        AccessibilityNodeInfo root=getRootInActiveWindow();if(root==null)throw new IllegalStateException("当前应用未提供可访问界面");
        if(!root.refresh()){root.recycle();throw new IllegalStateException("界面已改变，请重新读屏");}
        String pkg=String.valueOf(root.getPackageName());
        if(!PhonePolicy.allowed(PhoneState.apps,pkg)){root.recycle();throw new IllegalStateException("当前应用未被允许；请切回已授权应用");}
        return root;
    }
    private String shortText(CharSequence s){if(s==null)return "";String text=s.toString();return text.substring(0,Math.min(80,text.length()));}
    private String stamp(AccessibilityNodeInfo n){return n.getClassName()+"|"+n.getViewIdResourceName()+"|"+(n.isPassword()?"":shortText(n.getText()))+"|"+(n.isPassword()?"":shortText(n.getContentDescription()));}
    private int[] dimensions(){android.util.DisplayMetrics m=new android.util.DisplayMetrics();getSystemService(WindowManager.class).getDefaultDisplay().getRealMetrics(m);return new int[]{m.widthPixels,m.heightPixels};}
    private void walk(AccessibilityNodeInfo n,int[] path,int depth,JSONArray output) throws Exception {
        if(depth>24||nodes.size()>=120)return;
        Rect bounds=new Rect();n.getBoundsInScreen(bounds);
        if(n.isVisibleToUser()&&!bounds.isEmpty()&&(n.isClickable()||n.isEditable()||n.isScrollable()||n.getText()!=null||n.getContentDescription()!=null)){
            int id=nodes.size();nodes.add(new NodePath(path,stamp(n),bounds));
            output.put(new JSONObject().put("id",id).put("text",n.isPassword()?"[password redacted]":shortText(n.getText())).put("description",n.isPassword()?"":shortText(n.getContentDescription())).put("clickable",n.isClickable()).put("editable",n.isEditable()&&!n.isPassword()).put("scrollable",n.isScrollable()).put("bounds",new JSONArray(new int[]{bounds.left,bounds.top,bounds.right,bounds.bottom})));
        }
        if(n.isPassword())return;
        for(int i=0;i<n.getChildCount()&&nodes.size()<120;i++){
            AccessibilityNodeInfo child=n.getChild(i);if(child==null)continue;
            int[] next=java.util.Arrays.copyOf(path,path.length+1);next[next.length-1]=i;
            try{walk(child,next,depth+1,output);}finally{child.recycle();}
        }
    }
    private JSONObject read(AccessibilityNodeInfo root) throws Exception {
        nodes.clear();JSONArray array=new JSONArray();walk(root,new int[0],0,array);
        while(array.length()>0&&array.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>40000){array.remove(array.length()-1);nodes.remove(nodes.size()-1);}
        screenId=UUID.randomUUID().toString();screenPackage=String.valueOf(root.getPackageName());screenWindow=root.getWindowId();readAt=SystemClock.elapsedRealtime();int[] size=dimensions();
        return new JSONObject().put("ok",true).put("screen_id",screenId).put("package",screenPackage).put("width",size[0]).put("height",size[1]).put("nodes",array).put("note","Only accessibility UI, no screenshot. Read again after any action. Password content is redacted.");
    }
    private void fresh(JSONObject c,AccessibilityNodeInfo root){
        if(screenId==null||!screenId.equals(c.optString("screen_id"))||SystemClock.elapsedRealtime()-readAt>20000||!screenPackage.equals(String.valueOf(root.getPackageName()))||screenWindow!=root.getWindowId())throw new IllegalStateException("屏幕信息已过期，请先重新读屏");
    }
    private AccessibilityNodeInfo find(AccessibilityNodeInfo root,int id){
        if(id<0||id>=nodes.size())throw new IllegalStateException("未知节点，请重新读屏");
        NodePath target=nodes.get(id);AccessibilityNodeInfo n=AccessibilityNodeInfo.obtain(root);
        for(int index:target.path){AccessibilityNodeInfo next=n.getChild(index);n.recycle();if(next==null)throw new IllegalStateException("节点已改变，请重新读屏");n=next;}
        if(!n.refresh()){n.recycle();throw new IllegalStateException("节点已改变，请重新读屏");}
        Rect bounds=new Rect();n.getBoundsInScreen(bounds);
        if(!target.stamp.equals(stamp(n))||!target.bounds.equals(bounds)||!n.isVisibleToUser()){n.recycle();throw new IllegalStateException("节点已改变，请重新读屏");}
        return n;
    }
    private boolean passwordAt(AccessibilityNodeInfo n,int x,int y,int depth){
        if(depth>24)return false;Rect r=new Rect();n.getBoundsInScreen(r);if(n.isPassword()&&r.contains(x,y))return true;
        for(int i=0;i<Math.min(n.getChildCount(),100);i++){AccessibilityNodeInfo c=n.getChild(i);if(c==null)continue;boolean password;try{password=passwordAt(c,x,y,depth+1);}finally{c.recycle();}if(password)return true;}return false;
    }
    private boolean sensitiveTarget(AccessibilityNodeInfo n,int depth){
        if(n.isPassword())return true;
        // Focusing an editable field does not submit its text. Its hint/content
        // may mention sending or deleting; reserve that check for action nodes.
        if(!n.isEditable()&&PhonePolicy.requiresManual(shortText(n.getText())+" "+shortText(n.getContentDescription())))return true;
        if(depth>=8)return false;
        for(int i=0;i<Math.min(n.getChildCount(),100);i++){AccessibilityNodeInfo child=n.getChild(i);if(child==null)continue;boolean blocked;try{blocked=sensitiveTarget(child,depth+1);}finally{child.recycle();}if(blocked)return true;}return false;
    }
    private void gesture(JSONObject c,long grant,Consumer<JSONObject> reply,boolean hold) throws Exception {
        int[] size=dimensions();double x=c.getDouble("x"),y=c.getDouble("y"),x2=c.optDouble("x2",x),y2=c.optDouble("y2",y);
        if(!PhonePolicy.fraction(x)||!PhonePolicy.fraction(y)||!PhonePolicy.fraction(x2)||!PhonePolicy.fraction(y2))throw new IllegalStateException("坐标必须在 0 到 1 之间");
        AccessibilityNodeInfo root=root();try{if(passwordAt(root,(int)(x*size[0]),(int)(y*size[1]),0)||passwordAt(root,(int)(x2*size[0]),(int)(y2*size[1]),0))throw new IllegalStateException("不操作密码字段");}finally{root.recycle();}
        Path path=new Path();path.moveTo((float)(x*(size[0]-1)),(float)(y*(size[1]-1)));if("swipe".equals(c.optString("operation")))path.lineTo((float)(x2*(size[0]-1)),(float)(y2*(size[1]-1)));
        GestureDescription g=new GestureDescription.Builder().addStroke(new GestureDescription.StrokeDescription(path,0,hold?650:350)).build();
        if(!PhoneState.ready(grant))throw new IllegalStateException("操控已停止");invalidate();
        boolean accepted=dispatchGesture(g,new GestureResultCallback(){@Override public void onCompleted(GestureDescription d){reply.accept(value(true,"手势已完成"));}@Override public void onCancelled(GestureDescription d){reply.accept(fail("手势被取消，不会重试"));}},main);
        if(!accepted)reply.accept(fail("系统拒绝手势，不会重试"));
    }
    void execute(JSONObject command,long grant,Consumer<JSONObject> reply){main.post(()->{
        AccessibilityNodeInfo root=null;
        try {
            if(!PhoneState.ready(grant)||!unlocked())throw new IllegalStateException("操控未开启或手机已锁屏");
            String op=command.getString("operation");
            if(PhoneControlActivity.configurationVisible&&!"read".equals(op)&&!"open_app".equals(op)&&!"home".equals(op))throw new IllegalStateException("手机操控授权设置只能由你本人操作");
            if("home".equals(op)){invalidate();reply.accept(value(performGlobalAction(GLOBAL_ACTION_HOME),"返回桌面"));return;}
            if("open_app".equals(op)){
                String pkg=command.getString("package");if(!PhonePolicy.allowed(PhoneState.apps,pkg))throw new IllegalStateException("应用没有被授权");
                Intent i=getPackageManager().getLaunchIntentForPackage(pkg);if(i==null)throw new IllegalStateException("应用没有可启动入口");
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);startActivity(i);invalidate();reply.accept(value(true,"已请求打开应用"));return;
            }
            root=root();
            if("read".equals(op)){reply.accept(read(root));return;}
            if("back".equals(op)){invalidate();reply.accept(value(performGlobalAction(GLOBAL_ACTION_BACK),"返回"));return;}
            fresh(command,root);
            if("swipe".equals(op))throw new IllegalStateException("Coordinate swipes are disabled; scroll manually");
            if("type".equals(op)){
                AccessibilityNodeInfo input=root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
                if(input==null){throw new IllegalStateException("请先点击输入框");}
                try{if(!input.isEditable()||input.isPassword())throw new IllegalStateException("只在非密码输入框中输入");String text=command.getString("text");if(text.length()>1000)throw new IllegalStateException("输入过长");Bundle args=new Bundle();args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,text);boolean ok=input.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,args);invalidate();reply.accept(value(ok,ok?"文字已输入，未点击发送":"应用不支持直接输入"));}finally{input.recycle();}return;
            }
            if(!"tap".equals(op)&&!"long_press".equals(op))throw new IllegalStateException("不支持的操作");
            int id=command.optInt("node_id",-1);
            if(id<0){int[] size=dimensions();double fx=command.getDouble("x"),fy=command.getDouble("y");if(!PhonePolicy.fraction(fx)||!PhonePolicy.fraction(fy))throw new IllegalStateException("无效坐标");for(int i=0;i<nodes.size();i++)if(nodes.get(i).bounds.contains((int)(fx*size[0]),(int)(fy*size[1])))id=i;}
            AccessibilityNodeInfo target=find(root,id);
            try{
                if(target.isPassword())throw new IllegalStateException("不操作密码字段");
                if(sensitiveTarget(target,0))throw new IllegalStateException("发送、付款、删除或密码等操作请你在手机上手动完成");
                int action="long_press".equals(op)?AccessibilityNodeInfo.ACTION_LONG_CLICK:AccessibilityNodeInfo.ACTION_CLICK;
                if(target.performAction(action)){invalidate();reply.accept(value(true,"节点操作已完成"));return;}
                Rect r=new Rect();target.getBoundsInScreen(r);int[] size=dimensions();command.put("x",r.exactCenterX()/size[0]).put("y",r.exactCenterY()/size[1]);gesture(command,grant,reply,"long_press".equals(op));
            }finally{target.recycle();}
        }catch(Exception error){reply.accept(fail(error.getMessage()==null?"无法执行本次操作":error.getMessage()));}
        finally{if(root!=null)root.recycle();}
    });}
}
