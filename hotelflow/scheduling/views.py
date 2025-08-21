# scheduling/views.py
from rest_framework import viewsets, permissions
from .models import (
    Zone, Skill, StaffProfile, AvailabilityRule, Leave,
    TaskTimeEstimate, Roster, Team, Shift, ShiftAssignment, TaskAssignment
)
from .serializers import (
    ZoneSerializer, SkillSerializer, StaffProfileSerializer, AvailabilityRuleSerializer, LeaveSerializer,
    TaskTimeEstimateSerializer, RosterSerializer, TeamSerializer, ShiftSerializer,
    ShiftAssignmentSerializer, TaskAssignmentSerializer
)

class BaseAuthViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

class ZoneViewSet(BaseAuthViewSet):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer

class SkillViewSet(BaseAuthViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer

class StaffProfileViewSet(BaseAuthViewSet):
    queryset = StaffProfile.objects.select_related("user").all()
    serializer_class = StaffProfileSerializer

class AvailabilityRuleViewSet(BaseAuthViewSet):
    queryset = AvailabilityRule.objects.select_related("user").all()
    serializer_class = AvailabilityRuleSerializer

class LeaveViewSet(BaseAuthViewSet):
    queryset = Leave.objects.select_related("user").all()
    serializer_class = LeaveSerializer

class TaskTimeEstimateViewSet(BaseAuthViewSet):
    queryset = TaskTimeEstimate.objects.all()
    serializer_class = TaskTimeEstimateSerializer

class TeamViewSet(BaseAuthViewSet):
    queryset = Team.objects.prefetch_related("members").all()
    serializer_class = TeamSerializer

class RosterViewSet(BaseAuthViewSet):
    queryset = Roster.objects.prefetch_related("shifts").all().order_by("-week_start", "-version")
    serializer_class = RosterSerializer

class ShiftViewSet(BaseAuthViewSet):
    queryset = Shift.objects.select_related("roster", "zone", "team").all()
    serializer_class = ShiftSerializer

class ShiftAssignmentViewSet(BaseAuthViewSet):
    queryset = ShiftAssignment.objects.select_related("shift", "user").all()
    serializer_class = ShiftAssignmentSerializer

class TaskAssignmentViewSet(BaseAuthViewSet):
    queryset = TaskAssignment.objects.select_related("task", "shift", "assignee", "team").all()
    serializer_class = TaskAssignmentSerializer