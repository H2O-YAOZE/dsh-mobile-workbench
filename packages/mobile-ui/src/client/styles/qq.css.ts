import { SESSION_HEADER } from './session-header.ts'
/** Phone-only classic QQ chrome. The production host still owns all chat controls. */
export const QQ_CSS = `
[data-qq="session-brand"], [data-qq="chat-profile"], [data-qq="chat-tools"], [data-qq="input-tools"] { display:none; }
[data-qq="more-label"], [data-qq="file-label"] { display:none; }
@media (max-width:767px) {
  :root {
    --qq-ink:#132443; --qq-line:#9ab4d1; --qq-blue:#0878eb;
    --dsw-alias-bg-base:#fff; --dsw-alias-bg-layer-1:#fff; --dsw-alias-bg-layer-2:#f0f5fb;
    --dsw-alias-label-primary:#132443; --dsw-alias-label-secondary:#516b8b;
    --dsw-specific-sidebar-fill:#eaf2fb; --dsw-alias-border-l1:#b2c6de;
  }
  /* The host declares theme tokens on body, so :root overrides alone
     cannot change descendants on a phone following Android's dark mode.
     Set the light QQ palette at the mobile frame and generated UI roots;
     use tokens instead of forcing every child to black (code, buttons,
     charts and semantic highlights own their foreground/background). */
  [data-mobile-nav="frame"], [data-genui], [data-genui-panel], [data-question-key], [data-plan-review-key], [data-approval-key] {
    color-scheme:light;
    --dsw-alias-bg-base:#fff;
    --dsw-alias-bg-layer-1:#fff;
    --dsw-alias-bg-layer-2:#f0f5fb;
    --dsw-alias-bg-layer-3:#e2ecf8;
    --dsw-alias-label-primary:#132443;
    --dsw-alias-label-secondary:#405979;
    --dsw-alias-label-tertiary:#516b8b;
    --dsw-alias-label-caption:#516b8b;
    --dsw-alias-border-l1:#b2c6de;
    --dsw-alias-border-l2:#9ab4d1;
    --dsw-alias-markdown-hr:#b2c6de;
    --dsw-specific-input-major:#fff;
  }
  [data-genui], [data-genui-panel] {
    --dsw-alias-state-business-primary:#075bb5;
    --dsw-alias-state-success-primary:#065c34;
    --dsw-alias-state-success-secondary:#065c34;
    --dsw-alias-state-warn-primary:#8a5300;
    --dsw-alias-state-warn-secondary:#8a5300;
    --dsw-alias-state-error-primary:#b42332;
    --dsw-alias-state-error-secondary:#b42332;
  }
  body, [data-mobile-nav="home"], [data-phase] { color:var(--qq-ink); font-family:Tahoma,"Microsoft YaHei",Arial,sans-serif; }
  [data-qq] button, [data-qq] a { -webkit-tap-highlight-color:transparent; }
  [data-qq], [data-qq] * { box-sizing:border-box; }
  [data-mobile-nav="home-logo"] { box-sizing:border-box; }
  [data-qq] button:focus-visible, [data-qq] a:focus-visible, [data-mobile-nav="home-row"]:focus-visible { outline:2px solid #0878eb; outline-offset:-3px; }
  [data-qq="titlebar"] { display:flex; align-items:center; height:42px; flex:none; padding:0 0 0 10px; border-top:1px solid #a5d9ff; border-bottom:1px solid #0058b9; background:linear-gradient(#45a5fc 0%,#147ff1 48%,#0571e4 50%,#2388f4 100%); color:white; box-shadow:inset 0 0 0 1px #72baff; }
  [data-qq="titlebar"] > img { width:26px; height:26px; object-fit:contain; margin-right:8px; }
  [data-qq="titlebar"] strong { font-size:18px; font-weight:bold; text-shadow:0 1px #0356ab; }
  [data-qq="titlebar"] > span { margin-left:8px; font-size:12px; color:#dff1ff; }
  [data-qq="titlebar"] > button { display:grid; place-items:center; height:41px; width:48px; margin-left:auto; background:transparent; color:#fff; border:0; border-left:1px solid #0064c8; box-shadow:inset 1px 0 #77bdff; border-radius:0; }
  [data-mobile-nav="home"] { background:#edf4fc !important; transition:none !important; }
  [data-mobile-nav="home-top"] { display:flex; align-items:center; gap:10px; min-height:86px; padding:10px 12px !important; margin:6px 6px 0; border:1px solid #a7bfdc; border-radius:3px; background:linear-gradient(#f5f9ff,#dbe9f9); box-shadow:inset 0 0 0 1px white; }
  [data-mobile-nav="home-logo"] { display:block !important; width:58px !important; height:58px !important; padding:4px; border:1px solid #8caed8; border-radius:4px !important; background:#a8cef9; object-fit:contain; image-rendering:auto; }
  body[data-ds-dark-theme] [data-mobile-nav="home-logo"] { filter:none !important; }
  [data-qq="identity"] { min-width:0; display:flex; flex-direction:column; gap:4px; }
  [data-qq="identity"] strong { font-size:19px; color:#102340; }
  [data-qq="identity"] > span { font-size:12px; color:#4d6890; white-space:nowrap; }
  [data-mobile-nav="ws-switch"] { margin-left:auto; flex:none; max-width:88px; padding:6px 2px !important; font-size:12px !important; color:#40638c; }
  [data-mobile-nav="home-settings"] { display:none !important; }
  [data-mobile-nav="home-top"] [data-usage-entry] { display:none !important; }
  [data-qq="home-tools"] { display:flex; height:42px; flex:none; margin:0 6px; border:1px solid var(--qq-line); border-top:0; background:linear-gradient(#f6faff,#cbdced); }
  [data-qq="home-tools"] > * { display:flex; align-items:center; justify-content:center; flex:1; border:0; border-right:1px solid var(--qq-line); border-radius:0; background:none; color:#096fd5; box-shadow:inset 1px 0 white; }
  [data-qq="home-tools"] > :last-child { border-right:0; }
  [data-qq="home-tools"] img { width:24px; height:24px; object-fit:contain; }
  [data-qq="search"] { display:flex; align-items:center; height:40px; flex:none; margin:6px; padding:0 10px; gap:8px; border:1px solid #789ecb; border-radius:4px; background:white; box-shadow:inset 1px 1px 2px #c2d3e9; }
  [data-qq="search"] img { width:18px; height:18px; }
  [data-qq="search"] input { width:100%; min-width:0; border:0; outline:0; padding:6px 0; background:transparent; color:#102340; font:16px Tahoma,"Microsoft YaHei",sans-serif; }
  [data-mobile-nav="home"] > [data-mobile-nav="chip-row"] { display:none !important; }
  [data-mobile-nav="home-list"] { padding:0 6px !important; gap:0 !important; margin:0 !important; flex:1; min-height:0; }
  [data-qq="session-group"] { list-style:none; }
  [data-qq="session-group"] > ul { list-style:none; padding:0; margin:0; }
  [data-qq="group-toggle"] { display:flex; gap:8px; align-items:center; width:100%; height:36px; border:1px solid #b4c8df; border-radius:0; padding:0 10px; color:#172d4c; background:linear-gradient(#eef5fe,#d9e7f7); text-align:left; font: bold 14px Tahoma,"Microsoft YaHei",sans-serif; }
  [data-qq="group-toggle"][aria-expanded="false"] svg { transform:rotate(-90deg); }
  [data-mobile-nav="home-swipe"] { border-radius:0 !important; margin:0 !important; flex:none; }
  [data-mobile-nav="home-swipe-card"] { border-radius:0 !important; background:#fff !important; }
  [data-mobile-nav="home-pin"] { border-radius:0 !important; }
  [data-mobile-nav="home-row"] { min-height:72px !important; border:1px solid #c0d1e6 !important; border-top:0 !important; border-radius:0 !important; padding:8px 9px !important; gap:10px !important; background:linear-gradient(#fff,#f7faff) !important; color:#132443 !important; }
  [data-mobile-nav="home-row"][data-current], [data-mobile-nav="home-row"]:active { background:linear-gradient(#cee6ff,#accef7) !important; box-shadow:inset 0 0 0 1px #71affb; }
  [data-mobile-nav="home-row-avatar"] { position:relative; display:grid; place-items:center; height:48px !important; width:48px !important; padding:4px; border:1px solid #9ebada; border-radius:4px !important; background:linear-gradient(#fff,#dceafb) !important; }
  [data-mobile-nav="home-row-avatar"] > img { width:40px; height:40px; object-fit:contain; }
  [data-mobile-nav="home-row-avatar"] > :not(img) { position:absolute; right:1px; bottom:1px; }
  [data-mobile-nav="home-row-title"] { font: bold 16px/22px Tahoma,"Microsoft YaHei",sans-serif !important; }
  [data-mobile-nav="home-row-status"] { display:block; color:#57759e !important; font-size:13px !important; line-height:20px !important; }
  [data-mobile-nav="home-row-time"] { color:#527196 !important; font-size:12px !important; }
  [data-mobile-nav="home-fab"] { position:static !important; flex:none; align-self:stretch; display:flex !important; justify-content:center; min-height:36px; margin:6px; border:1px solid #829fc0 !important; border-radius:3px !important; box-shadow:inset 0 0 0 1px white !important; background:linear-gradient(#fff,#d1deed) !important; color:#18395f !important; font-size:13px; }
  [data-qq="footer"] { display:flex; flex:none; min-height:60px; padding-bottom:var(--mnav-sab); border-top:1px solid #8daacf; background:linear-gradient(#f1f7ff,#c9daee); }
  [data-qq="footer"] > * { display:flex; flex:1; align-items:center; justify-content:center; flex-direction:column; gap:2px; padding:6px 2px; border:0; border-right:1px solid #9db5d1; border-radius:0; background:none; color:#163963; box-shadow:inset 1px 0 white; text-decoration:none; font:12px Tahoma,"Microsoft YaHei",sans-serif; }
  [data-qq="footer"] img { width:24px; height:24px; object-fit:contain; }
  [data-qq="footer"] > [data-active] { background:linear-gradient(#c2deff,#e1efff); }
  [data-qq="session-brand"] { display:block; position:absolute; top:var(--mnav-sat); left:0; right:0; z-index:6; pointer-events:auto; }
  [data-qq="titlebar"] > [data-qq="back"] { width:40px; height:41px; margin:0 5px 0 -10px; border:0; box-shadow:none; }
  [data-mobile-nav="hero-back"] { display:none !important; }
  ${SESSION_HEADER} { display:flex !important; flex-direction:column; padding:42px 8px 0 !important; background:#e5effa !important; border-bottom:1px solid #91afd2 !important; }
  ${SESSION_HEADER}[class$="_headerBlank"] { height:42px !important; min-height:42px !important; display:block !important; }
  ${SESSION_HEADER}::after { display:none !important; }
  ${SESSION_HEADER} [class$="_titleRow"] { width:100%; grid-template-columns:minmax(0,1fr) 112px !important; grid-template-rows:44px !important; min-height:44px !important; height:44px !important; }
  ${SESSION_HEADER} [class$="_headerActions"] { display:contents !important; }
  ${SESSION_HEADER} [data-slot="conversation.session.header.actions"] > [data-mobile-nav="header-back"],
  ${SESSION_HEADER} [data-slot="conversation.session.header.actions"] > [data-qq="chat-profile"],
  ${SESSION_HEADER} [data-slot="conversation.session.header.actions"] > [data-qq="chat-tools"],
  ${SESSION_HEADER} [data-slot="conversation.session.header.actions"] > [data-mobile-nav="header-activity"] { display:none !important; }
  ${SESSION_HEADER} [class$="_headerUtilities"], ${SESSION_HEADER} > :first-child > :last-child { grid-column:2 !important; gap:0 !important; }
  ${SESSION_HEADER} [class$="_crumbSeg"]:not(:last-child) { display:none !important; }
  ${SESSION_HEADER} > [class$="_titleRow"] { padding-left:0 !important; }
  ${SESSION_HEADER} > [class$="_headerLeading"] { display:contents !important; padding:0 !important; }
  ${SESSION_HEADER} [class$="_crumbCurrent"] { box-sizing:border-box; display:block; padding:0 !important; color:#172e4f !important; font:bold 14px/44px Tahoma,"Microsoft YaHei",sans-serif !important; height:44px; min-height:44px !important; }
  ${SESSION_HEADER} [class$="_crumbs"] { grid-column:1 !important; justify-content:flex-start !important; color:#172e4f; font-size:14px; }
  [data-mobile-nav="header-info"], [data-mobile-nav="header-workbench"] { width:56px !important; height:44px !important; border-radius:2px !important; color:#254c78 !important; font-size:13px; }
  [data-mobile-nav="header-workbench"] { order:-1; }
  [data-mobile-nav="header-info"] > svg, [data-mobile-nav="header-workbench"] > svg { display:none; }
  [data-qq="more-label"], [data-qq="file-label"] { display:inline-flex; align-items:center; gap:4px; }
  [data-qq="file-label"] img { width:20px; height:20px; }
  [data-qq="chat-profile"] { display:flex; position:absolute; top:36px; left:-8px; right:-8px; height:60px; align-items:center; gap:10px; padding:6px 12px; border-top:1px solid #a6beda; background:linear-gradient(#f4f8fe,#dce9f8); }
  [data-qq="chat-profile"] > img { width:46px; height:46px; padding:3px; border:1px solid #94b2d8; border-radius:3px; background:#aecffa; }
  [data-qq="chat-profile"] > div { display:flex; flex-direction:column; gap:3px; }
  [data-qq="chat-profile"] strong { font-size:16px; }
  [data-qq="chat-profile"] span { color:#4f6d92; font-size:12px; }
  [data-qq="chat-tools"] { display:flex; position:absolute; top:96px; left:-8px; right:64px; height:36px; background:linear-gradient(#f8fbff,#d0dfef); border-top:1px solid #b0c4de; }
  [data-qq="chat-tools"] > * { display:flex; flex:1; gap:6px; align-items:center; justify-content:center; border:0; border-right:1px solid #9db6d4; background:transparent; border-radius:0; color:#163963; text-decoration:none; font-size:13px; }
  [data-qq="chat-tools"] img { width:22px; height:22px; object-fit:contain; }
  [data-mobile-nav="header-activity"] [data-mobile-nav="activity-pill"] { border:1px solid #aac1dc; border-radius:3px !important; background:#eef5fe !important; color:#3c6089 !important; height:28px !important; }
  /* Use the host's real tabs, with their own state and click handlers. A
     mirrored toggle beside a long title is too easy to miss. Reserve a
     separate, always-visible row in both views; do not move React nodes. */
  ${SESSION_HEADER} [data-slot="conversation.session.header.actions"] > [data-mobile-nav="header-viewrow"] { display:none !important; }
  ${SESSION_HEADER} [data-conversation-tabs][role="tablist"] {
    display:flex !important; flex:none; align-items:stretch; gap:0;
    width:100%; min-height:44px; margin:0; padding:0;
    border-top:1px solid #b2c6de; background:#f2f7fe;
  }
  ${SESSION_HEADER} [data-conversation-tabs] > [role="tab"] {
    flex:1; min-width:44px; min-height:44px; padding:0 12px;
    border:0; border-radius:0; background:transparent;
    color:#405979; font:14px/20px Tahoma,"Microsoft YaHei",sans-serif;
    touch-action:manipulation;
  }
  ${SESSION_HEADER} [data-conversation-tabs] > [role="tab"][aria-selected="true"] {
    background:#d7e9ff; color:#075bb5; font-weight:bold;
    box-shadow:inset 0 -3px #0878eb;
  }
  ${SESSION_HEADER} [data-conversation-tabs] > [role="tab"]::after { display:none; }
  ${SESSION_HEADER} [data-conversation-tabs] > [role="tab"]:focus-visible { outline:2px solid #0878eb; outline-offset:-3px; }
  [data-code-explanation="view"] { padding:14px 12px 20px; color:#132443; font:14px/1.6 Tahoma,"Microsoft YaHei",sans-serif; }
  [data-code-explanation="view"] h2 { margin:0 0 8px; font-size:18px; }
  [data-code-explanation="view"] p { margin:8px 0; white-space:pre-wrap; overflow-wrap:anywhere; }
  [data-code-explanation="view"] details { margin:10px 0; padding:8px; border:1px solid #b2c6de; background:#f2f7fe; }
  [data-code-explanation="view"] summary { min-height:32px; cursor:pointer; color:#075bb5; }
  [data-code-explanation="scope"], [data-code-explanation="view"] small { color:#516b8b; }
  [data-code-explanation="view"] article { margin:14px 0; padding:12px; border:1px solid #aac1dc; border-radius:3px; background:white; }
  [data-code-explanation="view"] h3 { margin:0; font-size:16px; overflow-wrap:anywhere; }
  [data-code-explanation="path"] { font-size:12px; color:#516b8b; }
  [data-code-explanation="view"] h4 { margin:12px 0 2px; font-size:14px; }
  [data-code-explanation="view"] button { min-height:44px; margin-top:8px; padding:0 12px; border:1px solid #91afd2; border-radius:3px; background:#e5effa; color:#075bb5; font:inherit; }
  [data-code-explanation="view"] pre { max-height:260px; overflow:auto; padding:8px; background:#1c293c; color:#e7edf7; font-size:12px; white-space:pre; }
  [data-code-translation="chat"] textarea { box-sizing:border-box; width:100%; padding:10px; margin-top:8px; border:1px solid #91afd2; background:white; color:#132443; font:16px/1.5 Tahoma,"Microsoft YaHei",sans-serif; }
  [data-code-translation="chat"] label { display:block; margin-top:18px; }
  [data-code-translation="chat"] select { width:100%; max-width:100%; min-height:44px; margin-top:8px; color:#132443; background:white; border:1px solid #91afd2; }
  [data-phase]:has([data-code-explanation="view"]) [class$="_composerSeat"] { display:none !important; }
  [data-mobile-nav="header-activity"] { display:none !important; }
  [data-phase] [class$="_scrollBody"] { background:#fff !important; }
  [data-chat-flow] { padding-left:12px !important; padding-right:12px !important; color:#121e31; font-size:var(--qq-chat-font,15px); }
  [data-chat-flow-kind="user"] { justify-content:flex-start !important; align-items:flex-start !important; }
  [data-chat-flow-kind="user"] [class$="_userRow"], [data-chat-flow-kind="steering"] [class$="_userRow"] { display:flex !important; flex-direction:column !important; align-items:flex-start !important; justify-content:flex-start !important; width:100%; gap:3px !important; }
  [data-chat-flow-kind="user"] [class$="_userStack"], [data-chat-flow-kind="steering"] [class$="_userStack"] { align-items:flex-start !important; max-width:100% !important; }
  [data-chat-flow-kind="user"] [class$="_bubble"], [data-chat-flow-kind="steering"] [class$="_bubble"] { background:transparent !important; border:0 !important; border-radius:0 !important; padding:0 !important; color:#14213b !important; box-shadow:none !important; max-width:100% !important; font-size:var(--qq-chat-font,15px); }
  [data-chat-flow-kind="user"] [class$="_timeStart"], [data-chat-flow-kind="steering"] [class$="_timeStart"] { display:none; }
  [data-chat-flow] [class*="_markdown_"] { font-size:var(--qq-chat-font,15px) !important; line-height:1.55 !important; color:#14213b !important; }
  [data-chat-flow] :not(pre) > code { color:#224772 !important; background:#eaf1f9 !important; border:1px solid #d3e0ef; border-radius:3px; padding:0 3px; }
  [data-chat-flow] pre { color:#e7edf7 !important; background:#1c293c !important; }
  [data-chat-flow] pre code { color:#e7edf7 !important; background:transparent !important; }
  [data-chat-flow] a { color:#075bb5 !important; }
  [data-phase] h1 { color:#244c7b !important; }
  [data-phase] [class$="_heroWorkspaceRow"] button { color:#315578 !important; }
  [data-content-phase="hero"] [data-conversation-scroll] { justify-content:flex-end !important; }
  [data-phase] [class$="_composerHero"] { padding-bottom:0 !important; }
  [data-phase] [class$="_composerHero"] [class$="_headline"] { color:#315578 !important; font-size:17px !important; line-height:28px !important; padding:8px 12px 0; }
  [data-phase] [class$="_composerHero"] [class$="_fish"] { color:#315578 !important; width:24px !important; height:24px !important; }
  [data-qq="transcript-label"] { display:flex; align-items:center; gap:10px; padding:0 0 4px; color:#0059ea; font:var(--qq-chat-font,15px) Tahoma,"Microsoft YaHei",sans-serif; }
  [data-qq="transcript-label"] strong { font-weight:bold; }
  [data-qq="transcript-label"][data-speaker="assistant"] { color:#008544; }
  [data-qq="transcript-label"] time { font-size:12px; }
  [data-phase] [class$="_composerSeat"] { background:#e2ecf8 !important; border-top:1px solid #98b4d4; padding-top:0 !important; }
  [data-phase] [class$="_composerSeat"]::before, [data-phase] [class$="_composerSeat"]::after { display:none !important; }
  [data-slot="conversation.composer.bar"] > [class$="_root"] { display:flex !important; padding:0 6px clamp(6px,var(--mnav-sab),16px) !important; background:#e3edf9 !important; }
  [data-slot="conversation.composer.bar"] [class$="_card"] { display:grid !important; grid-template-columns:minmax(0,1fr) 74px; gap:5px; width:100%; border:0 !important; border-radius:0 !important; background:transparent !important; box-shadow:none !important; padding:0 !important; }
  [data-slot="conversation.composer.bar"][data-qq-controls-expanded="true"] [class$="_card"] { grid-template-columns:34px 44px minmax(0,1fr) 74px; }
  [data-slot="conversation.composer.bar"] [class$="_card"]::after { display:none !important; }
  [data-slot="conversation.composer.bar"] [class$="_card"] > [class$="_row"] { display:contents !important; }
  [data-slot="conversation.composer.bar"] [class$="_row"]::before { display:none !important; }
  [data-slot="conversation.composer.bar"] [class$="_dock"] { display:none !important; }
  [data-slot="conversation.input.left"] { display:contents !important; }
  [data-qq="input-tools"] { display:flex !important; position:relative; grid-column:1/-1; grid-row:1; height:44px; align-items:center; gap:5px; border-bottom:1px solid #a8bed8; }
  [data-qq="input-tools"] > button, [data-qq="input-tools"] > a { display:flex; gap:5px; align-items:center; justify-content:center; min-width:44px; height:44px; border:0; border-radius:2px; background:none; color:#0758c6; padding:0 8px; font-size:12px; text-decoration:none; }
  [data-qq="options"] { margin-left:auto; }
  [data-qq="input-tools"] img { width:20px; height:20px; object-fit:contain; }
  [data-qq="history"] { margin-left:auto; }
  [data-qq="faces"] { position:absolute; left:0; bottom:46px; display:flex; padding:6px; border:1px solid #7b9bc4; background:white; box-shadow:0 2px 8px #284b7933; z-index:12; }
  [data-qq="faces"] button { min-width:44px; min-height:44px; padding:8px; border:0; background:white; font-size:20px; }
  [data-slot="conversation.composer.bar"] [data-input-scroll] { grid-column:1/-1; grid-row:3; width:100%; margin:0 !important; padding:0 !important; background:white !important; border:1px solid #8eaad0 !important; border-radius:3px !important; max-height:160px; }
  [data-slot="conversation.composer.bar"], [data-slot="conversation.composer.bar"] * { box-sizing:border-box; }
  [data-slot="conversation.composer.bar"] [data-composer-input] { margin:0 !important; width:100% !important; padding:9px !important; min-height:48px !important; color:#182945 !important; font:16px/1.5 Tahoma,"Microsoft YaHei",sans-serif !important; }
  [data-slot="conversation.composer.bar"] [data-composer-placeholder] { padding:9px !important; color:#6a84a6; font-size:14px; }
  [data-slot="conversation.composer.bar"] [data-slot="conversation.input.attachments"] > * { grid-column:1/-1; grid-row:2; }
  [data-slot="conversation.input.attachments"] { --dsw-alias-label-primary:#244772; --dsw-alias-label-primary-dimmed:#244772; --dsw-alias-label-secondary:#526b8d; --dsw-alias-label-tertiary:#526b8d; }
  [data-slot="conversation.composer.bar"] [class$="_tools"] > [class$="_add"] { display:none !important; grid-row:4; grid-column:1; width:34px !important; height:40px !important; border-radius:3px !important; background:#f0f6fd !important; color:#215080 !important; }
  [data-slot="conversation.composer.bar"] [class$="_modes"] { display:none !important; grid-row:4; grid-column:2; }
  [data-slot="conversation.composer.bar"][data-qq-controls-expanded="true"] [class$="_tools"] > [class$="_add"], [data-slot="conversation.composer.bar"][data-qq-controls-expanded="true"] [class$="_modes"] { display:block !important; }
  [data-slot="conversation.composer.bar"] [data-slot="conversation.input.model"] > [class$="_root"] { grid-row:4; grid-column:1; width:100%; min-width:0; max-width:100% !important; }
  [data-slot="conversation.composer.bar"][data-qq-controls-expanded="true"] [data-slot="conversation.input.model"] > [class$="_root"] { grid-column:3; }
  [data-slot="conversation.composer.bar"] [data-slot="conversation.input.model"] > [class$="_root"] > button,
  [data-slot="conversation.composer.bar"] [class$="_modes"] button[class$="_trigger"] { border:1px solid #9bb5d4 !important; border-radius:3px !important; background:linear-gradient(#fff,#d8e6f6) !important; color:#284b78 !important; height:34px !important; }
  [data-slot="conversation.composer.bar"] [data-slot="conversation.input.model"] > [class$="_root"]::before { display:none !important; }
  [data-slot="conversation.composer.bar"] [class$="_card"] > [class$="_row"] > [class$="_trailing"] > [class$="_standardControls"] > [data-slot="conversation.input.model"] > [class$="_root"] > button[class$="_trigger"],
  [data-slot="conversation.composer.bar"] [class$="_card"] > [class$="_row"] > [class$="_tools"] > [class$="_modes"] button[class$="_trigger"] { border:1px solid #9bb5d4 !important; border-radius:3px !important; background:linear-gradient(#fff,#d8e6f6) !important; color:#284b78 !important; height:34px !important; }
  [data-slot="conversation.composer.bar"] [class$="_trailing"] > button[class$="_primary"] { grid-row:4; grid-column:2; margin:0 !important; width:74px !important; height:40px !important; border:1px solid #7393bc !important; border-radius:3px !important; background:linear-gradient(#fff,#cedceb) !important; color:#163c72 !important; }
  [data-slot="conversation.composer.bar"][data-qq-controls-expanded="true"] [class$="_trailing"] > button[class$="_primary"] { grid-column:4; }
  [data-slot="conversation.composer.bar"] button[class$="_primary"]:disabled { opacity:.5; }
  [data-slot="conversation.composer.bar"] button[class$="_primary"]::after { content:'发送'; font-size:13px; }
  [data-slot="conversation.composer.bar"] button[class$="_primary"][aria-label*="停止"]::after { content:'停止'; }
  [data-slot="conversation.composer.bar"] button[class$="_primary"] svg { width:14px !important; height:14px !important; margin-right:4px; }
  [data-slot="conversation.composer.bar"] [class$="_card"] > [class$="_row"] > [class$="_trailing"] > [class$="_standardControls"] > [data-slot="conversation.input.model"] > [class$="_root"] > button[class$="_trigger"],
  [data-slot="conversation.composer.bar"] [class$="_card"] > [class$="_row"] > [class$="_tools"] > [class$="_modes"] button[class$="_trigger"] { height:44px !important; }
  [data-slot="conversation.composer.bar"] [class$="_trailing"] > button[class$="_primary"] { height:44px !important; }
  /* Official question/approval takeovers keep their own headers and actions.
     Fit long option lists and keep submission reachable when the keyboard opens. */
  [data-question-key], [data-plan-review-key], [data-approval-key] { padding:6px 6px max(6px,var(--mnav-sab)) !important; color:#132443; }
  [data-question-key] > section { max-height:min(75dvh,520px); }
  [data-question-key] header { flex-wrap:wrap; gap:4px; }
  [data-question-key] [class$="_headingBlock"] { flex:1 1 100%; }
  [data-question-key] [class$="_headerActions"] { display:flex; flex:1 1 100%; align-items:center; }
  [data-question-key] [class$="_waitStatus"] { margin-right:auto; }
  [data-question-key] footer { flex-wrap:wrap; gap:6px; }
  [data-question-key] footer [class$="_feedback"] { flex:1 1 100%; order:3; }
  [data-question-key] button, [data-plan-review-key] button, [data-approval-key] button { min-height:44px; }
  [data-question-key] [class$="_iconButton"] { min-width:44px; }
  [data-question-key] [class$="_body"] { min-height:0; overflow-y:auto; }
}
`
