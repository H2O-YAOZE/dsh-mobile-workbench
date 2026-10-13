package com.yjy.dsh;

import android.app.Instrumentation;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.EditText;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Test-only runner, never packaged in the release APK. No pairing or model call. */
public class PhoneInstrumentation extends Instrumentation {
    private int checks;
    @Override public void onCreate(Bundle args){super.onCreate(args);start();}
    private void check(boolean value,String message){checks++;if(!value)throw new AssertionError(message);}
    private JSONObject operation(JSONObject command) throws Exception {
        PhoneAccessibilityService service=PhoneAccessibilityService.get();check(service!=null,"Accessibility service is connected");
        AtomicReference<JSONObject> result=new AtomicReference<>();CountDownLatch latch=new CountDownLatch(1);
        service.execute(command,PhoneState.generation,value->{result.set(value);latch.countDown();});
        check(latch.await(8,TimeUnit.SECONDS),"Native operation completed");return result.get();
    }
    private JSONObject read() throws Exception {JSONObject r=operation(new JSONObject().put("operation","read"));check(r.optBoolean("ok"),"Screen readable: "+r.optString("message"));return r;}
    private JSONObject waitText(String text) throws Exception {JSONObject screen=null;for(int i=0;i<12;i++){Thread.sleep(250);screen=read();if(screen.toString().contains(text))return screen;}throw new AssertionError("Updated screen text missing: "+text+"; "+screen);}
    private int find(JSONObject screen,String field,String text) throws Exception {JSONArray nodes=screen.getJSONArray("nodes");for(int i=0;i<nodes.length();i++)if(nodes.getJSONObject(i).optString(field).equals(text))return nodes.getJSONObject(i).getInt("id");throw new AssertionError("Node missing: "+text);}
    @Override public void onStart(){
        Bundle summary=new Bundle();Activity activity=null;
        try{
            for(int i=0;i<40&&PhoneAccessibilityService.get()==null;i++)Thread.sleep(250);
            HashSet<String> apps=new HashSet<>();apps.add(getTargetContext().getPackageName());PhoneState.start(apps);
            activity=startActivitySync(new Intent(getTargetContext(),PhoneTestActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));waitForIdleSync();Thread.sleep(600);
            JSONObject screen=read();check(!screen.toString().contains("DSH_TEST_SECRET"),"Password text never leaves phone");
            int input=find(screen,"description","测试输入框");JSONObject tapped=operation(new JSONObject().put("operation","tap").put("screen_id",screen.getString("screen_id")).put("node_id",input));check(tapped.optBoolean("ok"),"Input tapped: "+tapped);Thread.sleep(500);
            screen=read();JSONObject typed=operation(new JSONObject().put("operation","type").put("screen_id",screen.getString("screen_id")).put("text","DSH QA"));check(typed.optBoolean("ok"),"Text input works: "+typed);
            screen=waitText("DSH QA");check(screen.toString().contains("DSH QA"),"New input text read back");
            JSONObject stale=operation(new JSONObject().put("operation","tap").put("screen_id","stale").put("node_id",0));check(!stale.optBoolean("ok"),"Stale screen rejected");
            int password=find(screen,"text","[password redacted]");JSONObject denied=operation(new JSONObject().put("operation","tap").put("screen_id",screen.getString("screen_id")).put("node_id",password));check(!denied.optBoolean("ok"),"Password tap rejected");
            Activity target=activity;runOnMainSync(()->((EditText)target.findViewById(R.id.phone_test_password)).requestFocus());Thread.sleep(300);screen=read();JSONObject passwordType=operation(new JSONObject().put("operation","type").put("screen_id",screen.getString("screen_id")).put("text","should-not-write"));check(!passwordType.optBoolean("ok"),"Password typing rejected");
            operation(new JSONObject().put("operation","back"));Thread.sleep(350);screen=read();int test=find(screen,"text","测试按钮");JSONObject click=operation(new JSONObject().put("operation","tap").put("screen_id",screen.getString("screen_id")).put("node_id",test));check(click.optBoolean("ok"),"Test button clicked: "+click);screen=waitText("测试按钮已点击：DSH QA");check(screen.toString().contains("测试按钮已点击：DSH QA"),"Actual Android widget updated");
            int sensitive=find(screen,"text","发送测试（应阻止）");JSONObject sensitiveTap=operation(new JSONObject().put("operation","tap").put("screen_id",screen.getString("screen_id")).put("node_id",sensitive));check(!sensitiveTap.optBoolean("ok"),"Sensitive action button remains blocked");
            android.graphics.Bitmap screenshot=getUiAutomation(android.app.UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES).takeScreenshot();
            if(screenshot==null)throw new AssertionError("Native QA screenshot unavailable");
            java.io.File qaDirectory=getTargetContext().getExternalFilesDir(null);if(qaDirectory==null)throw new AssertionError("Target screenshot storage unavailable");
            try(java.io.FileOutputStream file=new java.io.FileOutputStream(new java.io.File(qaDirectory,"native-qa.png"))){screenshot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,file);}finally{screenshot.recycle();}
            JSONObject swipe=operation(new JSONObject().put("operation","swipe").put("screen_id",screen.getString("screen_id")).put("x",0.98).put("y",0.9).put("x2",0.98).put("y2",0.5));check(!swipe.optBoolean("ok"),"Coordinate swipe rejected: "+swipe);Thread.sleep(400);
            runOnMainSync(()->PhoneAccessibilityService.updateOverlay());Thread.sleep(300);
            java.lang.reflect.Field overlayField=PhoneAccessibilityService.class.getDeclaredField("overlay");overlayField.setAccessible(true);
            android.widget.Button overlay=(android.widget.Button)overlayField.get(PhoneAccessibilityService.get());check(overlay!=null&&overlay.isShown(),"Visible native stop overlay");
            runOnMainSync(overlay::performClick);check(!PhoneState.ready(),"Native stop overlay revokes grant");JSONObject stopped=operation(new JSONObject().put("operation","read"));check(!stopped.optBoolean("ok"),"Stop rejects all new operations");
            HashSet<String> none=new HashSet<>();none.add("com.ungranted.app");PhoneState.start(none);JSONObject ungranted=operation(new JSONObject().put("operation","read"));check(!ungranted.optBoolean("ok"),"Ungrant blocks screen read");PhoneState.stop("QA finished");
            summary.putString("result","passed");summary.putInt("checks",checks);finish(Activity.RESULT_OK,summary);
        }catch(Throwable error){PhoneState.stop("QA failed");summary.putString("result","failed");summary.putString("error",String.valueOf(error));summary.putInt("checks",checks);finish(Activity.RESULT_CANCELED,summary);}
    }
}
