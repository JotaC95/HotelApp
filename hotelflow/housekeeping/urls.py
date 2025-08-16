from rest_framework.routers import DefaultRouter
from .views import (
    RoomViewSet,
    HousekeepingTaskViewSet,
    ChecklistItemViewSet,
    StaffAvailabilityViewSet,
    InventoryItemViewSet,
    InventoryMovementViewSet,
    IncidentReportViewSet, IncidentLineViewSet,
    ChatRoomViewSet, ChatMessageViewSet
)

router = DefaultRouter()
router.register(r"rooms", RoomViewSet)
router.register(r"tasks", HousekeepingTaskViewSet)
router.register(r"checklist", ChecklistItemViewSet)
router.register(r"staff-availability", StaffAvailabilityViewSet)
router.register(r"inventory/items", InventoryItemViewSet, basename="inventory-items")
router.register(r"inventory/movements", InventoryMovementViewSet, basename="inventory-movements")
router.register(r"incidents", IncidentReportViewSet, basename="incidents")
router.register(r"incident-lines", IncidentLineViewSet, basename="incident-lines")
router.register(r"chat/rooms", ChatRoomViewSet, basename="chatroom")
router.register(r"chat/messages", ChatMessageViewSet, basename="chatmessage")

urlpatterns = router.urls
