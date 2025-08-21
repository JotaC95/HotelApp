# scheduling/admin.py
from django.contrib import admin
from .models import (
    Zone, Skill, StaffProfile, AvailabilityRule, Leave,
    TaskTimeEstimate, Roster, Team, Shift, ShiftAssignment, TaskAssignment
)

@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ["id", "name"]

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ["id", "name"]

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "employment_type", "is_on_vacation", "max_hours_per_week"]
    list_filter = ["employment_type", "is_on_vacation"]
    search_fields = ["user__username", "user__first_name", "user__last_name"]

@admin.register(AvailabilityRule)
class AvailabilityRuleAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "weekday", "start", "end", "preferred_shift", "is_unavailable"]
    list_filter = ["weekday", "is_unavailable"]
    search_fields = ["user__username", "user__first_name", "user__last_name"]

@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "start", "end", "reason"]
    search_fields = ["user__username", "user__first_name", "user__last_name", "reason"]

@admin.register(TaskTimeEstimate)
class TaskTimeEstimateAdmin(admin.ModelAdmin):
    list_display = ["id", "room_category", "clean_type", "minutes"]
    list_filter = ["room_category", "clean_type"]

@admin.register(Roster)
class RosterAdmin(admin.ModelAdmin):
    list_display = ["id", "week_start", "version", "is_published", "generated_at"]
    list_filter = ["is_published", "week_start"]
    date_hierarchy = "week_start"

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "compatibility_score"]
    search_fields = ["name"]
    filter_horizontal = ["members"]

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ["id", "roster", "date", "start", "end", "zone", "team", "planned_minutes"]
    list_filter = ["date", "zone"]
    search_fields = ["roster__week_start", "team__name"]

@admin.register(ShiftAssignment)
class ShiftAssignmentAdmin(admin.ModelAdmin):
    list_display = ["id", "shift", "user", "role"]
    search_fields = ["user__username", "user__first_name", "user__last_name", "shift__roster__week_start"]
    raw_id_fields = ["shift", "user"]

@admin.register(TaskAssignment)
class TaskAssignmentAdmin(admin.ModelAdmin):
    list_display = ["id", "task", "shift", "assignee", "team", "planned_start", "planned_end", "planned_minutes"]
    search_fields = [
        "task__title", "assignee__username", "assignee__first_name", "assignee__last_name",
        "team__name", "shift__roster__week_start"
    ]
    list_filter = ["shift__date", "team"]
    # Evita dependencia de admin externo:
    raw_id_fields = ["task", "shift", "assignee", "team"]