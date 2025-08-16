# housekeeping/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    ChecklistItem,
    HousekeepingTask,
    InventoryItem,
    InventoryMovement,
    IncidentReport,
    IncidentLine,
)

# =========================
# CHECKLIST → estado tarea
# =========================

def _recalc_task(task: HousekeepingTask):
    total = task.checklist.count()
    done = task.checklist.filter(is_completed=True).count()
    if total > 0 and done == total:
        # Todo completo => DONE + finished_at
        updates = []
        if task.status != HousekeepingTask.Status.DONE:
            task.status = HousekeepingTask.Status.DONE
            updates.append("status")
        if not task.finished_at:
            task.finished_at = timezone.now()
            updates.append("finished_at")
        if updates:
            task.save(update_fields=updates)
    else:
        # Si estaba DONE y alguien desmarca, vuelve a IN_PROGRESS
        if task.status == HousekeepingTask.Status.DONE:
            task.status = HousekeepingTask.Status.IN_PROGRESS
            task.finished_at = None
            task.save(update_fields=["status", "finished_at"])

@receiver(post_save, sender=ChecklistItem)
def checklistitem_saved(sender, instance: ChecklistItem, created, **kwargs):
    task = instance.task
    # Primer completado pasa la tarea a IN_PROGRESS y setea started_at
    if instance.is_completed and task.started_at is None:
        task.started_at = timezone.now()
        if task.status == HousekeepingTask.Status.PENDING:
            task.status = HousekeepingTask.Status.IN_PROGRESS
        task.save(update_fields=["started_at", "status"])
    _recalc_task(task)

@receiver(post_delete, sender=ChecklistItem)
def checklistitem_deleted(sender, instance: ChecklistItem, **kwargs):
    _recalc_task(instance.task)


# =======================================
# INVENTORY MOVEMENT → ajustar item.stock
# (ya usas estos movimientos como fuente
#  de verdad para sumar/restar stock)
# =======================================

@receiver(post_save, sender=InventoryMovement)
def invmovement_created(sender, instance: InventoryMovement, created, **kwargs):
    if not created:
        return  # inmutable: solo al crear
    item = instance.item
    if instance.type == InventoryMovement.Type.IN:
        item.stock = (item.stock or 0) + int(instance.quantity)
    else:
        item.stock = (item.stock or 0) - int(instance.quantity)
    item.save(update_fields=["stock"])

@receiver(post_delete, sender=InventoryMovement)
def invmovement_deleted(sender, instance: InventoryMovement, **kwargs):
    # revertir efecto al borrar
    item = instance.item
    if instance.type == InventoryMovement.Type.IN:
        item.stock = (item.stock or 0) - int(instance.quantity)
    else:
        item.stock = (item.stock or 0) + int(instance.quantity)
    item.save(update_fields=["stock"])


# ======================================================
# INCIDENT LINE → crear movimientos automáticos de stock
# (MISSING/BROKEN/EXTRA_SUPPLY => OUT; al borrar => IN)
# ======================================================

OUTCOMES_TO_OUT = {"MISSING", "BROKEN", "EXTRA_SUPPLY"}

def _mk_reason_from_incident(line: IncidentLine, reverse: bool = False) -> str:
    base = f"Incident #{line.report_id} · outcome={line.outcome}"
    return f"REVERT {base}" if reverse else base

@receiver(post_save, sender=IncidentLine)
def incidentline_created_to_movement(sender, instance: IncidentLine, created, **kwargs):
    if not created:
        # Para mantener contabilidad simple, solo ajustamos al crear.
        # Si cambias cantidad/outcome, borra y vuelve a crear la línea.
        return
    if instance.inventory_item_id and instance.outcome in OUTCOMES_TO_OUT:
        InventoryMovement.objects.create(
            item=instance.inventory_item,
            type=InventoryMovement.Type.OUT,
            quantity=instance.quantity,
            reason=_mk_reason_from_incident(instance),
            created_by=getattr(instance.report, "reported_by", None),
        )

@receiver(post_delete, sender=IncidentLine)
def incidentline_deleted_to_movement(sender, instance: IncidentLine, **kwargs):
    if instance.inventory_item_id and instance.outcome in OUTCOMES_TO_OUT:
        InventoryMovement.objects.create(
            item=instance.inventory_item,
            type=InventoryMovement.Type.IN,
            quantity=instance.quantity,
            reason=_mk_reason_from_incident(instance, reverse=True),
            created_by=getattr(instance.report, "reported_by", None),
        )