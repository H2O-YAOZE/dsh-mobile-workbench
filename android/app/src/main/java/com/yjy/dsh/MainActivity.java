package com.yjy.dsh;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final int REQ_FILE_CHOOSER = 1337;
    private static final String WEB_STATE = "dsh.webState";
    private WebView webView;
    private FrameLayout container;
    private LinearLayout errorPanel;
    private TextView errorText;
    private ProgressBar progress;
    private ValueCallback<Uri[]> filePathCallback;
    private boolean pageFailed;
    private boolean loading;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        container = new FrameLayout(this);
        container.setBackgroundColor(Color.rgb(16, 20, 24));
        setContentView(container);
        createWebView();
        createStatusViews();

        Bundle history = savedInstanceState == null ? null : savedInstanceState.getBundle(WEB_STATE);
        if (history == null || webView.restoreState(history) == null
                || !NavigationPolicy.isInternal(webView.getUrl())) {
            webView.loadUrl(NavigationPolicy.HOME);
        }
    }

    @SuppressWarnings("deprecation")
    private void createWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(16, 20, 24));
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " DSH/1.5");
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        // HTML file uploads need selected content:// URIs. Top-level content: navigation is blocked.
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // Preserve the 1.3 behavior used by voice replies from the trusted app.
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebViewClient(new AppWebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int value) {
                if (view != webView || progress == null) return;
                progress.setProgress(value);
                progress.setVisibility(loading && !pageFailed && value < 100 ? View.VISIBLE : View.GONE);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                cancelFileChooser();
                if (view != webView || !NavigationPolicy.isInternal(view.getUrl())) {
                    callback.onReceiveValue(null);
                    return true;
                }
                filePathCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(Intent.createChooser(intent, getString(R.string.choose_file)),
                            REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException | SecurityException error) {
                    cancelFileChooser();
                    Toast.makeText(MainActivity.this, R.string.choose_file_failed, Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        });
        container.addView(webView, 0, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
    }

    private void createStatusViews() {
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(28), dp(28), dp(28));
        errorPanel.setBackgroundColor(Color.rgb(16, 20, 24));
        errorText = new TextView(this);
        errorText.setTextColor(Color.WHITE);
        errorText.setTextSize(17);
        errorText.setGravity(Gravity.CENTER);
        errorPanel.addView(errorText);
        Button retry = new Button(this);
        retry.setText(R.string.retry);
        LinearLayout.LayoutParams buttonLayout = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        buttonLayout.topMargin = dp(18);
        errorPanel.addView(retry, buttonLayout);
        retry.setOnClickListener(view -> {
            if (webView == null) createWebView();
            // A connection retry loads the app; it never resubmits a chat message or POST.
            webView.loadUrl(NavigationPolicy.HOME);
        });
        errorPanel.setVisibility(View.GONE);
        container.addView(errorPanel, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setVisibility(View.GONE);
        container.addView(progress, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP));
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private boolean openPhoneControl(String url) {
        if (!NavigationPolicy.isInternal(url) || !"/phone-control/native".equals(Uri.parse(url).getPath())) return false;
        String session = PhonePolicy.nativeSession(url);
        if (session == null) Toast.makeText(this, "请先打开一条已保存的对话", Toast.LENGTH_LONG).show();
        else startActivity(new Intent(this, PhoneControlActivity.class).putExtra("sessionId", session));
        return true;
    }

    private void showError(int message) {
        pageFailed = true;
        loading = false;
        progress.setVisibility(View.GONE);
        errorText.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
    }

    private final class AppWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (request.isForMainFrame() && openPhoneControl(url)) return true;
            NavigationPolicy.Destination destination = NavigationPolicy.classify(url);
            if (destination == NavigationPolicy.Destination.INTERNAL) return false;
            if (!request.isForMainFrame()) return true;
            if (destination == NavigationPolicy.Destination.EXTERNAL) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addCategory(Intent.CATEGORY_BROWSABLE);
                    startActivity(intent);
                } catch (ActivityNotFoundException | SecurityException error) {
                    Toast.makeText(MainActivity.this, R.string.open_external_failed, Toast.LENGTH_SHORT).show();
                }
            } else {
                Toast.makeText(MainActivity.this, R.string.unsafe_link_blocked, Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            if (view != webView) return;
            // Defense for navigations such as POST which may not call shouldOverrideUrlLoading.
            if (!NavigationPolicy.isInternal(url)) {
                view.stopLoading();
                showError(R.string.unsafe_link_blocked);
                return;
            }
            cancelFileChooser();
            pageFailed = false;
            loading = true;
            errorPanel.setVisibility(View.GONE);
            progress.setProgress(0);
            progress.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (view != webView) return;
            loading = false;
            progress.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (view == webView && request.isForMainFrame()) showError(R.string.connection_failed);
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            // Pairing is an intentional 401 page; keep it visible instead of covering it with an error.
            if (view == webView && request.isForMainFrame() && response.getStatusCode() >= 500) {
                showError(R.string.server_failed);
            }
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            if (view == webView && error.getUrl().equals(view.getUrl())) {
                showError(R.string.secure_connection_failed);
            }
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            if (view == webView) {
                cancelFileChooser();
                container.removeView(view);
                view.destroy();
                webView = null;
                showError(R.string.renderer_failed);
            }
            return true;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        if (webView != null && NavigationPolicy.isInternal(webView.getUrl())) {
            Bundle history = new Bundle();
            webView.saveState(history);
            state.putBundle(WEB_STATE, history);
        }
        super.onSaveInstanceState(state);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onStop() {
        CookieManager.getInstance().flush();
        super.onStop();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQ_FILE_CHOOSER) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        if (filePathCallback == null) return;
        Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        if (results != null) {
            for (Uri uri : results) {
                // Do not let a third-party picker nominate app-private file:// data for upload.
                if (uri == null || !"content".equalsIgnoreCase(uri.getScheme())) {
                    results = null;
                    Toast.makeText(this, R.string.unsafe_file_blocked, Toast.LENGTH_SHORT).show();
                    break;
                }
            }
        }
        ValueCallback<Uri[]> callback = filePathCallback;
        filePathCallback = null;
        callback.onReceiveValue(results);
    }

    private void cancelFileChooser() {
        if (filePathCallback != null) {
            ValueCallback<Uri[]> callback = filePathCallback;
            filePathCallback = null;
            callback.onReceiveValue(null);
        }
    }

    @Override
    protected void onDestroy() {
        cancelFileChooser();
        if (webView != null) {
            container.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
