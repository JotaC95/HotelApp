# scheduling/admin.py
from django.contrib import admin
from .models import (
    Zone, Skill, StaffProfile, AvailabilityRule, Leave, TaskTimeEstimate,
    Roster, Team, Shift, ShiftAssignment, TaskAssignment
)

@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "employment_type", "is_on_vacation", "max_hours_per_week")
    autocomplete_fields = ("user", "preferred_zones", "skills")
    search_fields = ("user__username", "user__first_name", "user__last_name")

@admin.register(AvailabilityRule)
class AvailabilityRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "weekday", "start", "end", "is_unavailable")
    list_filter = ("weekday", "is_unavailable")
    autocomplete_fields = ("user",)
    search_fields = ("user__username", "user__first_name", "user__last_name")

@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "start", "end", "reason")
    autocomplete_fields = ("user",)
    search_fields = ("user__username", "user__first_name", "user__last_name", "reason")

@admin.register(TaskTimeEstimate)
class TaskTimeEstimateAdmin(admin.ModelAdmin):
    list_display = ("id", "room_category", "clean_type", "minutes")
    list_filter = ("room_category", "clean_type")
    search_fields = ("room_category", "clean_type")

@admin.register(Roster)
class RosterAdmin(admin.ModelAdmin):
    list_display = ("id", "week_start", "version", "is_published", "generated_at")
    list_filter = ("is_published",)
    search_fields = ("week_start",)

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "compatibility_score")
    filter_horizontal = ("members",)
    search_fields = ("name", "members__username", "members__first_name", "members__last_name")

class ShiftAssignmentInline(admin.TabularInline):
    model = ShiftAssignment
    extra = 0
    raw_id_fields = ("user",)

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("id", "roster", "date", "start", "end", "zone", "team", "planned_minutes")
    list_filter = ("date", "zone")
    inlines = [ShiftAssignmentInline]
    # Añadimos search_fields para búsquedas rápidas
    search_fields = (
        "roster__week_start",
        "team__name",
        "zone__name",
    )
    raw_id_fields = ("roster", "zone", "team")

@admin.register(TaskAssignment)
class TaskAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "shift", "assignee", "team", "planned_minutes")
    # Usamos raw_id_fields para evitar requisitos de autocomplete_fields
    raw_id_fields = ("task", "shift", "assignee", "team")
    search_fields = (
        "task__title",
        "assignee__username",
        "assignee__first_name",
        "assignee__last_name",
        "team__name",
    )