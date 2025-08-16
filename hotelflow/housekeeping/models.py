from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Room(models.Model):
    class Status(models.TextChoices):
        DIRTY = "DIRTY", "Dirty"
        CLEANING = "CLEANING", "Cleaning"
        CLEAN = "CLEAN", "Clean"
        INSPECTION = "INSPECTION", "Inspection"
        OOO = "OOO", "Out of Order"

    number = models.CharField(max_length=20, unique=True)
    floor = models.IntegerField(default=1)
    zone = models.CharField(max_length=50, blank=True, help_text="Ej: Ala Norte / Piso A")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DIRTY)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Room {self.number} ({self.get_status_display()})"


class StaffAvailability(models.Model):
    """Disponibilidad y ubicación del personal en tiempo cercano a real."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="availability")
    is_available = models.BooleanField(default=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} - {'Disponible' if self.is_available else 'Ocupado'}"


class HousekeepingTask(models.Model):
    class TaskType(models.TextChoices):
        TURNOVER = "TURNOVER", "Turnover"
        DEEP_CLEAN = "DEEP_CLEAN", "Deep Clean"
        AMENITIES = "AMENITIES", "Amenities"
        INSPECTION = "INSPECTION", "Inspection"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ASSIGNED = "ASSIGNED", "Assigned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        DONE = "DONE", "Done"
        BLOCKED = "BLOCKED", "Blocked"

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    task_type = models.CharField(max_length=20, choices=TaskType.choices, default=TaskType.TURNOVER)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_tasks")
    scheduled_for = models.DateField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title} - {self.room}"


def photo_upload_path(instance, filename):
    return f"checklists/task_{instance.task_id}/{instance.id or 'new'}/{filename}"


class ChecklistItem(models.Model):
    task = models.ForeignKey(HousekeepingTask, on_delete=models.CASCADE, related_name="checklist")
    text = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    photo_before = models.ImageField(upload_to=photo_upload_path, null=True, blank=True)
    photo_after = models.ImageField(upload_to=photo_upload_path, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"ChecklistItem({self.text[:20]}...) for {self.task_id}"


# ==== Inventory (Paso 6) ====
class InventoryItem(models.Model):
    class Meta:
        ordering = ["name"]

    name = models.CharField(max_length=120)
    sku = models.CharField(max_length=64, unique=True)
    unit = models.CharField(max_length=24, default="unit")  # ej: unidades, paquetes, litros
    stock = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=10)  # alerta cuando stock <= reorder_level
    min_stock = models.IntegerField(default=0)
    location = models.CharField(max_length=80, blank=True, default="")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def low_stock(self):
        return self.stock <= self.reorder_level


class InventoryMovement(models.Model):
    class Type(models.TextChoices):
        IN = "IN", "IN"
        OUT = "OUT", "OUT"

    item = models.ForeignKey(InventoryItem, related_name="movements", on_delete=models.CASCADE)
    type = models.CharField(max_length=3, choices=Type.choices)
    quantity = models.PositiveIntegerField()
    reason = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type} {self.quantity} {self.item.sku}"
    


# ==== Incident reporting (sin IA) ====
class IncidentReport(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        SENT = "SENT", "Sent to area"
        RESOLVED = "RESOLVED", "Resolved"

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="incident_reports")
    task = models.ForeignKey(HousekeepingTask, null=True, blank=True, on_delete=models.SET_NULL, related_name="incident_reports")
    photo = models.ImageField(upload_to="incidents/photos/", null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    reported_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="incidents_reported")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"IncidentReport #{self.id} · Room {self.room_id} · {self.status}"


class IncidentLine(models.Model):
    class Category(models.TextChoices):
        LINEN = "LINEN", "Ropa blanca (sábanas/toallas)"
        AMENITY = "AMENITY", "Amenity"
        APPLIANCE = "APPLIANCE", "Electrodoméstico"
        FURNITURE = "FURNITURE", "Mueble"
        OTHER = "OTHER", "Otro"

    class Outcome(models.TextChoices):
        LAUNDRY_TO_RETURN = "LAUNDRY_TO_RETURN", "Devolver a lavandería"
        LAUNDRY_REJECTED = "LAUNDRY_REJECTED", "Rechazada por lavandería"
        MISSING = "MISSING", "Falta en la habitación"
        BROKEN = "BROKEN", "Roto/dañado"
        EXTRA_SUPPLY = "EXTRA_SUPPLY", "Se requirió reposición extra"

    report = models.ForeignKey(IncidentReport, on_delete=models.CASCADE, related_name="lines")
    category = models.CharField(max_length=16, choices=Category.choices)
    inventory_item = models.ForeignKey("housekeeping.InventoryItem", null=True, blank=True, on_delete=models.SET_NULL, related_name="incident_lines")
    outcome = models.CharField(max_length=24, choices=Outcome.choices)
    quantity = models.PositiveIntegerField(default=1)
    remark = models.CharField(max_length=255, blank=True, default="")

    def __str__(self):
        return f"IncidentLine report={self.report_id} item={self.inventory_item_id} {self.outcome} x{self.quantity}"
    
    

# ==== Chat Interno ====
class ChatRoom(models.Model):
    class RoomType(models.TextChoices):
        HK_INTERNAL   = "HK_INTERNAL", "Housekeeping interno"
        HK_RECEPTION  = "HK_RECEPTION", "Housekeeping ↔ Recepción"
        HK_MAINTENANCE= "HK_MAINTENANCE", "Housekeeping ↔ Mantenimiento"
        HK_HOUSEMAN   = "HK_HOUSEMAN", "Housekeeping ↔ Houseman"
        TASK          = "TASK", "Chat por tarea"
        ROOM          = "ROOM", "Chat por habitación"

    room_type = models.CharField(max_length=20, choices=RoomType.choices, default=RoomType.HK_INTERNAL)
    name = models.CharField(max_length=120, blank=True, default="")
    participants = models.ManyToManyField(User, related_name="chat_rooms", blank=True)
    # enlaces opcionales (útiles para agrupar por contexto)
    task = models.ForeignKey('housekeeping.HousekeepingTask', null=True, blank=True, on_delete=models.CASCADE, related_name='chat_rooms')
    room = models.ForeignKey('housekeeping.Room', null=True, blank=True, on_delete=models.CASCADE, related_name='chat_rooms')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["room_type"]),
        ]

    def __str__(self):
        base = self.name or f"{self.get_room_type_display()}"
        if self.task_id:
            base += f" · Task {self.task_id}"
        if self.room_id:
            base += f" · Room {self.room_id}"
        return base


class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    text = models.TextField(blank=True)
    attachment = models.FileField(upload_to="chat/attachments/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender} → {self.room_id}: {self.text[:20]}"