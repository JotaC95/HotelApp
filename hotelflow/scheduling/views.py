from django.shortcuts import render

# Create your views here.
# scheduling/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Zone, Skill, StaffProfile, AvailabilityRule, Leave, TaskTimeEstimate,
    Roster, Team, Shift, ShiftAssignment, TaskAssignment
)
from .serializers import (
    ZoneSerializer, SkillSerializer, StaffProfileSerializer, AvailabilityRuleSerializer,
    LeaveSerializer, TaskTimeEstimateSerializer, RosterSerializer, TeamSerializer,
    ShiftSerializer, ShiftAssignmentSerializer, TaskAssignmentSerializer
)
from .services.generate import generate_roster


class BaseAuth(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]


class ZoneViewSet(BaseAuth):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer


class SkillViewSet(BaseAuth):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer


class StaffProfileViewSet(BaseAuth):
    queryset = StaffProfile.objects.select_related("user").all()
    serializer_class = StaffProfileSerializer


class AvailabilityRuleViewSet(BaseAuth):
    queryset = AvailabilityRule.objects.select_related("user").all()
    serializer_class = AvailabilityRuleSerializer


class LeaveViewSet(BaseAuth):
    queryset = Leave.objects.select_related("user").all()
    serializer_class = LeaveSerializer


class TaskTimeEstimateViewSet(BaseAuth):
    queryset = TaskTimeEstimate.objects.all()
    serializer_class = TaskTimeEstimateSerializer


class RosterViewSet(BaseAuth):
    queryset = Roster.objects.all()
    serializer_class = RosterSerializer

    @action(detail=True, methods=["post"], url_path="generate")
    def generate(self, request, pk=None):
        roster = self.get_object()
        generate_roster(roster)
        return Response({"detail": "Roster generado"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        roster = self.get_object()
        roster.is_published = True
        roster.save(update_fields=["is_published"])
        return Response({"detail": "Roster publicado"}, status=status.HTTP_200_OK)


class TeamViewSet(BaseAuth):
    queryset = Team.objects.prefetch_related("members").all()
    serializer_class = TeamSerializer


class ShiftViewSet(BaseAuth):
    queryset = Shift.objects.select_related("roster", "zone", "team").prefetch_related("assignments").all()
    serializer_class = ShiftSerializer


class ShiftAssignmentViewSet(BaseAuth):
    queryset = ShiftAssignment.objects.select_related("shift", "user").all()
    serializer_class = ShiftAssignmentSerializer


class TaskAssignmentViewSet(BaseAuth):
    queryset = TaskAssignment.objects.select_related("task", "shift", "assignee", "team").all()
    serializer_class = TaskAssignmentSerializer