# scheduling/urls.py
from rest_framework.routers import DefaultRouter
from .views import (
    ZoneViewSet, SkillViewSet, StaffProfileViewSet, AvailabilityRuleViewSet, LeaveViewSet,
    TaskTimeEstimateViewSet, RosterViewSet, TeamViewSet, ShiftViewSet, ShiftAssignmentViewSet,
    TaskAssignmentViewSet
)

router = DefaultRouter()
router.register(r"zones", ZoneViewSet)
router.register(r"skills", SkillViewSet)
router.register(r"staff-profiles", StaffProfileViewSet)
router.register(r"availability-rules", AvailabilityRuleViewSet)
router.register(r"leaves", LeaveViewSet)
router.register(r"task-time-estimates", TaskTimeEstimateViewSet)
router.register(r"rosters", RosterViewSet)
router.register(r"teams", TeamViewSet)
router.register(r"shifts", ShiftViewSet)
router.register(r"shift-assignments", ShiftAssignmentViewSet)
router.register(r"task-assignments", TaskAssignmentViewSet)

urlpatterns = router.urls