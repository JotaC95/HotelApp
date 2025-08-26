from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from django.utils import timezone

from .models import Room, HousekeepingTask, ChecklistItem, StaffAvailability
from .serializers import (
    RoomSerializer,
    HousekeepingTaskSerializer,
    ChecklistItemSerializer,
    StaffAvailabilitySerializer,
)
from .utils import pick_best_staff_for_task
from django.db import models  # <- para F() en alerts
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import InventoryItem, InventoryMovement  
from .serializers import InventoryItemSerializer, InventoryMovementSerializer  
from .models import IncidentReport, IncidentLine
from .serializers import IncidentReportSerializer, IncidentLineSerializer
from django.db.models import Sum
from rest_framework.decorators import action

from django.db import models
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from django.contrib.auth import get_user_model
User = get_user_model()

from .models import ChatRoom, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer
from .permissions import IsHKStaffOrHasModelView


class IsStaffOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all().order_by("number")
    serializer_class = RoomSerializer
    permission_classes = [IsHKStaffOrHasModelView]


class HousekeepingTaskViewSet(viewsets.ModelViewSet):
    queryset = HousekeepingTask.objects.select_related("room", "assigned_to").all().order_by("-created_at")
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "status",
        "priority",
        "task_type",
        "room",
        "assigned_to",
        "scheduled_for",
    ]
    search_fields = ["title", "description", "room__number"]
    ordering_fields = ["priority", "status", "scheduled_for", "created_at"]

    @extend_schema(
        request=None,
        responses={200: None},
        description="Sugiere el mejor empleado para esta tarea sin asignar."
    )
    @action(detail=True, methods=["post", "get"], url_path="suggest_assignee")
    def suggest_assignee(self, request, pk=None):
        task = self.get_object()
        best, info = pick_best_staff_for_task(task)
        if not best:
            return Response({"detail": "No hay personal disponible."}, status=404)
        return Response(
            {
                "task_id": task.id,
                "suggested_user_id": best.user_id,
                "suggested_username": best.user.username,
                "active_load": info.get("active_load"),
                "criteria": info.get("criteria"),
                "mode": request.method,
            }
        )

    @extend_schema(
        request=None,
        responses={200: None},
        description="Asigna automáticamente la tarea al mejor empleado (POST). En GET solo muestra el candidato."
    )
    @action(detail=True, methods=["post", "get"], url_path="auto_assign")
    def auto_assign(self, request, pk=None):
        task = self.get_object()
        best, info = pick_best_staff_for_task(task)
        if not best:
            return Response({"detail": "No hay personal disponible."}, status=404)

        if request.method == "POST":
            task.assigned_to_id = best.user_id
            if task.status == task.Status.PENDING:
                task.status = task.Status.ASSIGNED
            task.scheduled_for = task.scheduled_for or timezone.now().date()
            task.save(update_fields=["assigned_to", "status", "scheduled_for"])

        return Response(
            {
                "task_id": task.id,
                "candidate": best.user.username,
                "assigned": (request.method == "POST"),
                "status": task.status,
                "scheduled_for": task.scheduled_for,
                "mode": request.method,
            }
        )


class ChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = ChecklistItem.objects.select_related("task").all()
    serializer_class = ChecklistItemSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["task", "is_completed"]


class StaffAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = StaffAvailability.objects.select_related("user").all()
    serializer_class = StaffAvailabilitySerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["user", "is_available"]
    

# ==== Inventory Views ====
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "location"]
    search_fields = ["name", "sku", "location"]
    ordering_fields = ["stock", "reorder_level", "name"]

    @action(detail=False, methods=["get"], url_path="alerts")
    def alerts(self, request):
        qs = self.get_queryset().filter(is_active=True, stock__lte=models.F("reorder_level"))
        page = self.paginate_queryset(qs)
        ser = self.get_serializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(ser.data)
        return Response(ser.data)


class InventoryMovementViewSet(viewsets.ModelViewSet):
    queryset = InventoryMovement.objects.select_related("item").all()
    serializer_class = InventoryMovementSerializer
    permission_classes = [IsStaffOrReadOnly]
    # movimientos inmutables (no update)
    http_method_names = ["get", "post", "delete", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
        
        

# ==== Incident Views ====
class IncidentReportViewSet(viewsets.ModelViewSet):
    queryset = IncidentReport.objects.select_related("room", "task", "reported_by").prefetch_related("lines")
    serializer_class = IncidentReportSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "room", "task", "reported_by"]
    search_fields = ["notes", "room__number"]
    ordering_fields = ["created_at"]

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """
        Resumen por fechas:
        /api/housekeeping/incidents/summary/?date_from=2025-08-01&date_to=2025-08-16
        Devuelve totales por inventory_item + outcome (para lavandería y faltantes/rotos).
        """
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        qs = IncidentLine.objects.select_related("inventory_item", "report")
        if date_from:
            qs = qs.filter(report__created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(report__created_at__date__lte=date_to)
        agg = (
            qs.values("inventory_item_id", "inventory_item__name", "outcome")
              .annotate(total_qty=Sum("quantity"))
              .order_by("inventory_item__name", "outcome")
        )
        return Response(list(agg), status=200)


class IncidentLineViewSet(viewsets.ModelViewSet):
    queryset = IncidentLine.objects.select_related("report", "inventory_item").all()
    serializer_class = IncidentLineSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["report", "category", "outcome", "inventory_item"]
    ordering_fields = ["id"]
    
    
# roles esperados en tu modelo User.role
ALLOWED_ROLES_CHAT = {"HOUSEKEEPER", "SUPERVISOR", "RECEPTION", "MAINTENANCE", "HOUSEMAN", "ADMIN"}

class IsChatUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        role = getattr(u, "role", None)
        return role in ALLOWED_ROLES_CHAT

    def has_object_permission(self, request, view, obj):
        # El usuario debe ser participante del room
        if isinstance(obj, ChatRoom):
            return obj.participants.filter(pk=request.user.pk).exists()
        if isinstance(obj, ChatMessage):
            return obj.room.participants.filter(pk=request.user.pk).exists()
        return False
    
# ==== Chat Views ====
class ChatRoomViewSet(viewsets.ModelViewSet):
    queryset = ChatRoom.objects.all().prefetch_related("participants")
    serializer_class = ChatRoomSerializer
    permission_classes = [IsChatUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["room_type", "task", "room"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "name"]

    def get_queryset(self):
        # Solo rooms donde soy participante
        return super().get_queryset().filter(participants=self.request.user)

    def perform_create(self, serializer):
        room = serializer.save()
        # si no se envió participants, agrega al creador por defecto
        if not room.participants.exists():
            room.participants.add(self.request.user)

    @action(detail=False, methods=["post"], url_path="open_or_create")
    def open_or_create(self, request):
        """
        Crea (o reabre) un room para los flujos típicos:
        body:
        {
          "room_type": "HK_RECEPTION" | "HK_MAINTENANCE" | "HK_HOUSEMAN" | "HK_INTERNAL" | "TASK" | "ROOM",
          "task": <id opcional>,
          "room": <id opcional>,
          "include_roles": ["HOUSEKEEPER","RECEPTION"] // opcional, autopuebla participants por roles
        }
        """
        data = request.data
        room_type = data.get("room_type")
        task_id = data.get("task")
        room_id = data.get("room")
        include_roles = data.get("include_roles", [])

        qs = ChatRoom.objects.filter(room_type=room_type)
        if task_id:
            qs = qs.filter(task_id=task_id)
        if room_id:
            qs = qs.filter(room_id=room_id)

        room = qs.first()
        created = False
        if not room:
            room = ChatRoom.objects.create(
                room_type=room_type,
                task_id=task_id or None,
                room_id=room_id or None,
                name=data.get("name") or "",
            )
            created = True

        # asegurar que quien llama quede dentro
        room.participants.add(request.user)

        # autopoblar por roles (para tus flujos HK<->Recepción/Mantenimiento/Houseman)
        if include_roles:
            users = User.objects.filter(role__in=include_roles)
            room.participants.add(*users)

        ser = self.get_serializer(room)
        return Response({"created": created, "room": ser.data}, status=status.HTTP_200_OK)


class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.select_related("room", "sender").all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsChatUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["room"]

    def get_queryset(self):
        # Solo mensajes de rooms en los que participo
        return super().get_queryset().filter(room__participants=self.request.user)

    def perform_create(self, serializer):
        room = ChatRoom.objects.get(pk=self.request.data.get("room"))
        # aseguro que el emisor sea participante
        if not room.participants.filter(pk=self.request.user.pk).exists():
            room.participants.add(self.request.user)
        serializer.save(sender=self.request.user)

    @action(detail=True, methods=["post"], url_path="mark_read")
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        # marcar leído solo si soy participante del room
        if not msg.room.participants.filter(pk=request.user.pk).exists():
            return Response({"detail": "No autorizado"}, status=403)
        msg.is_read = True
        msg.save(update_fields=["is_read"])
        return Response({"id": msg.id, "is_read": True})