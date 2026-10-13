package com.yjy.dsh;

import android.app.Activity;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** Local, harmless screen for checking gestures/text. No model or external action. */
public class PhoneTestActivity extends Activity {
    @Override public void onCreate(Bundle state){
        super.onCreate(state);ScrollView scroll=new ScrollView(this);LinearLayout column=new LinearLayout(this);column.setOrientation(LinearLayout.VERTICAL);column.setPadding(24,24,24,24);scroll.addView(column);setContentView(scroll);
        TextView title=new TextView(this);title.setText("DSH 手机操控安全测试页");title.setTextSize(22);column.addView(title);
        TextView result=new TextView(this);result.setText("尚未点击测试按钮");result.setTextSize(18);column.addView(result);
        EditText input=new EditText(this);input.setSingleLine(false);input.setHint("测试输入，不会发送到别人");input.setContentDescription("测试输入框");column.addView(input);
        EditText password=new EditText(this);password.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);password.setText("DSH_TEST_SECRET");password.setContentDescription("虚拟密码测试框");password.setId(R.id.phone_test_password);column.addView(password);
        Button test=new Button(this);test.setText("测试按钮");test.setOnClickListener(v->result.setText("测试按钮已点击："+input.getText()));column.addView(test);
        Button sensitive=new Button(this);sensitive.setText("发送测试（应阻止）");sensitive.setOnClickListener(v->result.setText("ERROR sensitive clicked"));column.addView(sensitive);
        Button stop=new Button(this);stop.setText("停止手机操控");stop.setOnClickListener(v->{PhoneState.stop("你已停止手机操控");startService(new android.content.Intent(this,PhoneControlService.class).setAction("stop"));});column.addView(stop);
        for(int i=1;i<=25;i++){TextView row=new TextView(this);row.setText("滑动测试 · 第 "+i+" 行");row.setPadding(0,18,0,18);column.addView(row);}
    }
}
