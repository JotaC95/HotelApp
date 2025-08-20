# scheduling/serializers.py
from rest_framework import serializers
from .models import (
    Zone, Skill, StaffProfile, AvailabilityRule, Leave, TaskTimeEstimate,
    Roster, Team, Shift, ShiftAssignment, TaskAssignment
)

class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = "__all__"

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = "__all__"

class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = "__all__"

class AvailabilityRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityRule
        fields = "__all__"

class LeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Leave
        fields = "__all__"

class TaskTimeEstimateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskTimeEstimate
        fields = "__all__"

class RosterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roster
        fields = "__all__"

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = "__all__"

class ShiftAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftAssignment
        fields = "__all__"

class ShiftSerializer(serializers.ModelSerializer):
    assignments = ShiftAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = Shift
        fields = ["id","roster","date","start","end","zone","team","planned_minutes","assignments"]

class TaskAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignment
        fields = "__all__"