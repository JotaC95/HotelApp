from rest_framework import serializers
from .models import Room, HousekeepingTask, ChecklistItem, StaffAvailability, InventoryItem, InventoryMovement, IncidentReport, IncidentLine
from django.contrib.auth import get_user_model
User = get_user_model()
from .models import ChatRoom, ChatMessage

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"

class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = "__all__"

class HousekeepingTaskSerializer(serializers.ModelSerializer):
    checklist = ChecklistItemSerializer(many=True, read_only=True)

    class Meta:
        model = HousekeepingTask
        fields = "__all__"

class StaffAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffAvailability
        fields = "__all__"
        
        

# ==== Inventory serializers ====
class InventoryItemSerializer(serializers.ModelSerializer):
    low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = "__all__"


class InventoryMovementSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = InventoryMovement
        fields = "__all__"
        read_only_fields = ("created_at", "created_by")

    def validate(self, attrs):
        item = attrs.get("item")
        type_ = attrs.get("type")
        qty = attrs.get("quantity")
        if qty is None or qty <= 0:
            raise serializers.ValidationError({"quantity": "Debe ser > 0"})
        if type_ == "OUT":
            new_stock = (item.stock or 0) - int(qty)
            if new_stock < 0:
                raise serializers.ValidationError({"quantity": "Stock insuficiente (no puede quedar negativo)."})
            if new_stock < (item.min_stock or 0):
                raise serializers.ValidationError({"quantity": f"Operacion dejaría stock ({new_stock}) por debajo de min_stock ({item.min_stock})."})
        return attrs
    

# ==== Incident serializers ====
class IncidentLineSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source="inventory_item.name", read_only=True)
    class Meta:
        model = IncidentLine
        fields = ["id", "report", "category", "inventory_item", "inventory_item_name", "outcome", "quantity", "remark"]

    def validate(self, attrs):
        qty = attrs.get("quantity") or 0
        if qty <= 0:
            raise serializers.ValidationError({"quantity": "Debe ser > 0"})
        return attrs


class IncidentReportSerializer(serializers.ModelSerializer):
    lines = IncidentLineSerializer(many=True)
    reported_by = serializers.PrimaryKeyRelatedField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = IncidentReport
        fields = ["id", "room", "task", "photo", "notes", "status", "reported_by", "created_at", "lines"]

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        request = self.context.get("request")
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            validated_data["reported_by"] = request.user
        report = IncidentReport.objects.create(**validated_data)
        for line in lines_data:
            IncidentLine.objects.create(report=report, **line)
        return report

    def update(self, instance, validated_data):
        # Solo actualizamos cabecera. Las líneas se gestionan vía endpoint propio o PATCH del reporte (opcional).
        for attr, val in validated_data.items():
            if attr != "lines":
                setattr(instance, attr, val)
        instance.save()
        return instance
    
    

# ==== Chat Serializers ====
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "room", "sender", "sender_name", "text", "attachment", "created_at", "is_read"]
        read_only_fields = ["sender", "created_at", "is_read"]


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, required=False)
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatRoom
        fields = ["id", "room_type", "name", "participants", "task", "room", "messages", "created_at"]
        read_only_fields = ["created_at"]