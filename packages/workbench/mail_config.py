"""Optional 163 IMAP adapter. Never reads production files or logs credentials."""
import os
def load_config():
    user = os.environ.get('DSH_MAIL_USER', '')
    password = os.environ.get('DSH_MAIL_PASSWORD', '')
    if not user or not password:
        raise RuntimeError('Set DSH_MAIL_USER and DSH_MAIL_PASSWORD in a private service environment')
    return {'SMTP_USER': user, 'SMTP_PASS': password, 'MAIL_TO': user}
