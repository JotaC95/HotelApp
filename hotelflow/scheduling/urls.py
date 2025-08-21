# scheduling/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from scheduling.views import (
    ZoneViewSet, SkillViewSet, StaffProfileViewSet, AvailabilityRuleViewSet, LeaveViewSet,
    TaskTimeEstimateViewSet, RosterViewSet, TeamViewSet, ShiftViewSet,
    ShiftAssignmentViewSet, TaskAssignmentViewSet
)

router = DefaultRouter()
router.register(r"zones", ZoneViewSet, basename="sched-zone")
router.register(r"skills", SkillViewSet, basename="sched-skill")
router.register(r"staff-profiles", StaffProfileViewSet, basename="sched-staffprofile")
router.register(r"availability", AvailabilityRuleViewSet, basename="sched-availability")
router.register(r"leaves", LeaveViewSet, basename="sched-leave")
router.register(r"estimates", TaskTimeEstimateViewSet, basename="sched-estimate")
router.register(r"rosters", RosterViewSet, basename="sched-roster")
router.register(r"teams", TeamViewSet, basename="sched-team")
router.register(r"shifts", ShiftViewSet, basename="sched-shift")
router.register(r"shift-assignments", ShiftAssignmentViewSet, basename="sched-shiftassign")
router.register(r"task-assignments", TaskAssignmentViewSet, basename="sched-taskassign")

urlpatterns = [
    path("", include(router.urls)),   # sin admin
]