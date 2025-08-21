# scheduling/api_urls.py
from rest_framework.routers import DefaultRouter
from .views import (
    ZoneViewSet, SkillViewSet, StaffProfileViewSet, AvailabilityRuleViewSet, LeaveViewSet,
    TaskTimeEstimateViewSet, RosterViewSet, TeamViewSet, ShiftViewSet,
    ShiftAssignmentViewSet, TaskAssignmentViewSet
)

router = DefaultRouter()
router.register(r"scheduling/zones", ZoneViewSet, basename="sched-zone")
router.register(r"scheduling/skills", SkillViewSet, basename="sched-skill")
router.register(r"scheduling/staff-profiles", StaffProfileViewSet, basename="sched-staffprofile")
router.register(r"scheduling/availability", AvailabilityRuleViewSet, basename="sched-availability")
router.register(r"scheduling/leaves", LeaveViewSet, basename="sched-leave")
router.register(r"scheduling/estimates", TaskTimeEstimateViewSet, basename="sched-estimate")
router.register(r"scheduling/rosters", RosterViewSet, basename="sched-roster")
router.register(r"scheduling/teams", TeamViewSet, basename="sched-team")
router.register(r"scheduling/shifts", ShiftViewSet, basename="sched-shift")
router.register(r"scheduling/shift-assignments", ShiftAssignmentViewSet, basename="sched-shiftassign")
router.register(r"scheduling/task-assignments", TaskAssignmentViewSet, basename="sched-taskassign")

urlpatterns = router.urls