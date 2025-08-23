# scheduling/serializers.py
from rest_framework import serializers
from .models import (
    Zone, Skill, StaffProfile, AvailabilityRule, Leave,
    TaskTimeEstimate, Roster, Team, Shift, ShiftAssignment, TaskAssignment
)

class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = ["id", "name"]

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name"]

class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = [
            "id", "user", "employment_type", "is_on_vacation",
            "max_hours_per_week", "preferred_zones", "skills"
        ]

class AvailabilityRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityRule
        fields = ["id", "user", "weekday", "start", "end", "preferred_shift", "is_unavailable"]

class LeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Leave
        fields = ["id", "user", "start", "end", "reason"]

class TaskTimeEstimateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskTimeEstimate
        fields = ["id", "room_category", "clean_type", "minutes"]

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "members", "compatibility_score"]

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = "__all__"

class RosterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roster
        fields = "__all__"

class ShiftAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftAssignment
        fields = ["id", "shift", "user", "role"]

class TaskAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignment
        fields = [
            "id", "task", "shift", "assignee", "team",
            "planned_start", "planned_end", "planned_minutes"
        ]