"""Transactional email for the rental flow.

The transport is the very same SMTP sender the OTP code already uses — this
module only widens it from "one fixed subject and body" to any subject/body, so
there is still exactly one place that knows how to reach the mail server.

Delivery is best effort on purpose: an SMTP outage must never abort the rental
request, the chat message or the accept/reject that triggered it. Every failure
is logged with flush=True (it lands in backend.log immediately) and the caller
carries on.
"""

import asyncio
import time
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings
from app.services.otp import _smtp_send  # the one and only transport

SMTP_RETRIES = 3
SMTP_RETRY_DELAY = 2


def _log(message: str) -> None:
    """Print with flush so email delivery shows up in backend.log at once."""
    print(message, flush=True)


def build_email(to: str, subject: str, text: str, html: str) -> MIMEMultipart:
    settings = get_settings()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USERNAME
    msg["To"] = to
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def enabled() -> bool:
    """One switch for the whole module (tests / offline runs turn it off)."""
    return bool(get_settings().EMAIL_ENABLED)


def send_email(to: str, subject: str, text: str, html: str) -> bool:
    """Deliver one email. Never raises — an empty or unreachable address is
    logged and swallowed so the flow that triggered it can finish."""
    if not enabled():
        _log(f"[email] disabled — not sending {subject!r} to {to or '<no recipient>'}")
        return False
    if not to:
        _log(f"[email] skipped — no recipient for {subject!r}")
        return False

    msg = build_email(to, subject, text, html)
    for attempt in range(1, SMTP_RETRIES + 1):
        try:
            _smtp_send(msg)
            _log(f"[email] sent to {to} — {subject}")
            return True
        except Exception as exc:  # noqa: BLE001 - delivery must not propagate
            _log(f"[email] attempt {attempt}/{SMTP_RETRIES} to {to} failed: {exc}")
            if attempt < SMTP_RETRIES:
                time.sleep(SMTP_RETRY_DELAY)
    _log(f"[email] gave up on {to} — {subject}")
    return False


# Strong references to the in-flight sends, so a task is never garbage collected
# while it is still talking to the mail server.
_pending: set = set()


def send_in_background(to: str, template: tuple[str, str, str]) -> bool:
    """Fire one of the template tuples off without holding the request open.

    Returns True when a send was scheduled. Anything that goes wrong inside
    happens on its own task and is only logged — the rental request, the chat
    message or the accept/reject that triggered it still succeeds.
    """
    if not enabled():
        _log(f"[email] disabled — not scheduling {template[0]!r}")
        return False
    if not to:
        _log(f"[email] skipped — no recipient for {template[0]!r}")
        return False
    subject, text, html = template
    task = asyncio.create_task(asyncio.to_thread(send_email, to, subject, text, html))
    _pending.add(task)
    task.add_done_callback(_log_done)
    return True


def _log_done(task: "asyncio.Task") -> None:
    _pending.discard(task)
    if task.cancelled():
        return
    exc = task.exception()
    if exc:
        _log(f"[email] background send failed: {exc}")


# ─── shared formatting ────────────────────────────────────────────────────────

def money(value) -> str:
    """240.0 -> '240', 150.5 -> '150.5'."""
    return f"{float(value):g}"


def period(start, end) -> str:
    return f"{start.strftime('%d.%m.%Y')} — {end.strftime('%d.%m.%Y')}"


def duration(days: int) -> str:
    """'3 дня' / '1 день' / '5 дней' — the phrasing the email template uses."""
    d = int(days)
    if d % 10 == 1 and d % 100 != 11:
        word = "день"
    elif d % 10 in (2, 3, 4) and d % 100 not in (12, 13, 14):
        word = "дня"
    else:
        word = "дней"
    return f"{d} {word}"


def _base_url() -> str:
    return get_settings().PUBLIC_BASE_URL.rstrip("/")


def request_url() -> str:
    return f"{_base_url()}/rental-requests"


def chat_url(conversation_id: int | None) -> str:
    if not conversation_id:
        return request_url()
    return f"{_base_url()}/messages?conversation={conversation_id}"


# ─── html pieces ──────────────────────────────────────────────────────────────

_ACCENT = "#FF6B35"


def _shell(body: str) -> str:
    return f"""
    <html>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; padding: 40px;">
      <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 36px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 48px; height: 48px; background: {_ACCENT}; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="color: white; font-weight: bold; font-size: 22px;">R</span>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0;">RentHub</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Equipment &amp; Tool Rental</p>
        </div>
        {body}
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 28px 0 0;">
          Это письмо отправлено сервисом RentHub.
        </p>
      </div>
    </body>
    </html>
    """


def _rows(items: list[tuple[str, str]]) -> str:
    cells = "".join(
        f"""
        <tr>
          <td style="padding: 7px 0; color: #6b7280; font-size: 14px; vertical-align: top;">{label}</td>
          <td style="padding: 7px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right;">{value}</td>
        </tr>"""
        for label, value in items
    )
    return f"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 6px 16px; margin: 20px 0;">
          {cells}
        </table>"""


def _buttons(buttons: list[tuple[str, str]]) -> str:
    anchors = "".join(
        f"""
        <a href="{href}" style="display: inline-block; background: {'#111827' if i else _ACCENT}; color: white; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 10px; margin: 0 6px 8px 0;">{label}</a>"""
        for i, (label, href) in enumerate(buttons)
    )
    return f'<div style="text-align: center; margin-top: 22px;">{anchors}</div>'


def _card(greeting: str, lead: str, rows: list[tuple[str, str]], tail: str,
          buttons: list[tuple[str, str]] | None = None) -> str:
    html = f"""
        <p style="color: #374151; font-size: 15px; margin: 0 0 6px;">{greeting}</p>
        <p style="color: #374151; font-size: 15px; margin: 0;">{lead}</p>
        {_rows(rows)}
        <p style="color: #374151; font-size: 15px; margin: 0;">{tail}</p>
    """
    if buttons:
        html += _buttons(buttons)
    return _shell(html)


def _card_text(lead: str, rows: list[tuple[str, str]], tail: str,
               button_labels: list[str] | None = None) -> str:
    lines = [f"{label}: {value}" for label, value in rows]
    body = f"{lead}\n\n" + "\n".join(lines) + f"\n\n{tail}\n"
    if button_labels:
        body += "\n" + "  |  ".join(button_labels) + "\n"
    return body


# ─── the four rental emails ───────────────────────────────────────────────────


def owner_new_request(
    *,
    owner_name: str,
    renter_name: str,
    listing_title: str,
    start_date,
    end_date,
    days: int,
    total,
    conversation_id: int | None,
) -> tuple[str, str, str]:
    subject = "Новый запрос на аренду — RentHub"
    rows = [
        ("Объект", listing_title),
        ("Период аренды", period(start_date, end_date)),
        ("Продолжительность", duration(days)),
        ("Стоимость", f"{money(total)} сомони"),
        ("Статус", "Ожидает подтверждения"),
    ]
    lead = f"Пользователь {renter_name} отправил новый запрос на аренду:"
    tail = "Откройте RentHub, чтобы посмотреть запрос и связаться с пользователем."
    buttons = [
        ("Посмотреть запрос", request_url()),
        ("Открыть чат", chat_url(conversation_id)),
    ]
    text = (
        f"Здравствуйте, {owner_name}!\n\n"
        + _card_text(lead, rows, tail, [b[0] for b in buttons])
    )
    return subject, text, _card(f"Здравствуйте, {owner_name}!", lead, rows, tail, buttons)


def renter_request_sent(
    *,
    renter_name: str,
    listing_title: str,
    start_date,
    end_date,
    days: int,
    total,
    conversation_id: int | None,
) -> tuple[str, str, str]:
    subject = "Ваш запрос на аренду отправлен — RentHub"
    rows = [
        ("Объект", listing_title),
        ("Период", period(start_date, end_date)),
        ("Продолжительность", duration(days)),
        ("Сумма", f"{money(total)} сомони"),
        ("Статус", "Ожидает подтверждения"),
    ]
    lead = "Ваш запрос на аренду отправлен владельцу."
    tail = "Вы получите уведомление, когда владелец примет или отклонит запрос."
    buttons = [("Открыть чат", chat_url(conversation_id))]
    text = (
        f"Здравствуйте, {renter_name}!\n\n"
        + _card_text(lead, rows, tail, [b[0] for b in buttons])
    )
    return subject, text, _card(f"Здравствуйте, {renter_name}!", lead, rows, tail, buttons)


def renter_accepted(
    *,
    renter_name: str,
    listing_title: str,
    start_date,
    end_date,
    days: int,
    total,
    conversation_id: int | None,
) -> tuple[str, str, str]:
    subject = "Аренда подтверждена — RentHub"
    rows = [
        ("Объект", listing_title),
        ("Период", period(start_date, end_date)),
        ("Продолжительность", duration(days)),
        ("Сумма", f"{money(total)} сомони"),
        ("Статус", "Подтверждено"),
    ]
    lead = "Владелец подтвердил вашу аренду."
    tail = "Откройте RentHub, чтобы продолжить."
    buttons = [
        ("Посмотреть запрос", request_url()),
        ("Открыть чат", chat_url(conversation_id)),
    ]
    text = (
        f"Здравствуйте, {renter_name}!\n\n"
        + _card_text(lead, rows, tail, [b[0] for b in buttons])
    )
    return subject, text, _card(f"Здравствуйте, {renter_name}!", lead, rows, tail, buttons)


def renter_rejected(
    *,
    renter_name: str,
    listing_title: str,
    start_date,
    end_date,
    total,
    conversation_id: int | None,
) -> tuple[str, str, str]:
    subject = "Запрос на аренду отклонён — RentHub"
    rows = [
        ("Объект", listing_title),
        ("Период", period(start_date, end_date)),
        ("Сумма", f"{money(total)} сомони"),
        ("Статус", "Отклонено"),
    ]
    lead = f"Ваш запрос на аренду \"{listing_title}\" был отклонён владельцем."
    tail = "Вы можете связаться с владельцем в чате RentHub."
    buttons = [("Открыть чат", chat_url(conversation_id))]
    text = (
        f"Здравствуйте, {renter_name}!\n\n"
        + _card_text(lead, rows, tail, [b[0] for b in buttons])
    )
    return subject, text, _card(f"Здравствуйте, {renter_name}!", lead, rows, tail, buttons)


def dispatch(to: str, template: tuple[str, str, str]) -> bool:
    """Fire one of the tuples above off the request thread."""
    subject, text, html = template
    return send_email(to, subject, text, html)
