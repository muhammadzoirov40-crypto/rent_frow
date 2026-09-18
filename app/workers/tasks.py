from datetime import datetime, timedelta
from app.workers.celery_app import celery_app


@celery_app.task(name="send_rental_reminder")
def send_rental_reminder(rental_id: int, customer_id: int, expected_return_date: str):
    print(f"[CELERY] Rental reminder: rental_id={rental_id}, customer_id={customer_id}, return_date={expected_return_date}")
    return {"status": "reminder_sent", "rental_id": rental_id}


@celery_app.task(name="send_overdue_notification")
def send_overdue_notification(rental_id: int, customer_id: int):
    print(f"[CELERY] Overdue notification: rental_id={rental_id}, customer_id={customer_id}")
    return {"status": "overdue_notified", "rental_id": rental_id}


@celery_app.task(name="send_payment_notification")
def send_payment_notification(payment_id: int, customer_id: int, amount: float):
    print(f"[CELERY] Payment notification: payment_id={payment_id}, customer_id={customer_id}, amount={amount}")
    return {"status": "payment_notified", "payment_id": payment_id}


@celery_app.task(name="send_return_reminder")
def send_return_reminder(rental_id: int, customer_id: int, expected_return_date: str):
    print(f"[CELERY] Return reminder: rental_id={rental_id}, customer_id={customer_id}, return_date={expected_return_date}")
    return {"status": "return_reminder_sent", "rental_id": rental_id}


@celery_app.task(name="send_maintenance_notification")
def send_maintenance_notification(equipment_id: int, maintenance_id: int):
    print(f"[CELERY] Maintenance notification: equipment_id={equipment_id}, maintenance_id={maintenance_id}")
    return {"status": "maintenance_notified", "equipment_id": equipment_id}


@celery_app.task(name="check_overdue_rentals")
def check_overdue_rentals():
    print("[CELERY] Checking overdue rentals...")
    return {"status": "check_completed"}
