from django.db import models

# Create your models here.
# scheduling/models.py
from django.db import models
from django.conf import settings

# Importa Room desde tu app actual
from housekeeping.models import Room, HousekeepingTask

User = settings.AUTH_USER_MODEL


class Zone(models.Model):
    """Zona opcional para normalizar. Si ya usas Room.zone (char), puedes no usar esto aún."""
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Skill(models.Model):
    name = models.CharField(max_length=40, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class StaffProfile(models.Model):
    class EmploymentType(models.TextChoices):
        FULL_TIME = "FULL_TIME", "Tiempo completo"
        PART_TIME = "PART_TIME", "Medio tiempo"
        CASUAL    = "CASUAL", "Por horas"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    employment_type = models.CharField(max_length=16, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME)
    is_on_vacation = models.BooleanField(default=False)
    max_hours_per_week = models.PositiveIntegerField(default=38)
    preferred_zones = models.ManyToManyField(Zone, blank=True)
    skills = models.ManyToManyField(Skill, blank=True)

    def __str__(self):
        return f"StaffProfile({self.user})"


class AvailabilityRule(models.Model):
    class Weekday(models.IntegerChoices):
        MON=0, "Mon"; TUE=1, "Tue"; WED=2, "Wed"; THU=3, "Thu"; FRI=4, "Fri"; SAT=5, "Sat"; SUN=6, "Sun"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="availability_rules")
    weekday = models.IntegerField(choices=Weekday.choices)
    start = models.TimeField()
    end = models.TimeField()
    preferred_shift = models.CharField(max_length=20, blank=True, default="")
    is_unavailable = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "weekday", "start", "end")
        ordering = ["user", "weekday", "start"]

    def __str__(self):
        return f"{self.user} {self.get_weekday_display()} {self.start}-{self.end}"


class Leave(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="leaves")
    start = models.DateTimeField()
    end = models.DateTimeField()
    reason = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        ordering = ["-start"]

    def __str__(self):
        return f"Leave({self.user} {self.start}→{self.end})"


class TaskTimeEstimate(models.Model):
    ROOM_CATEGORY = [
        ("STD", "Standard"),
        ("DLX", "Deluxe"),
        ("STE", "Suite"),
    ]
    CLEAN_TYPE = [
        ("DEPARTURE", "Salida"),
        ("DEEP", "Deep cleaning"),
        ("MAINT", "Mantenimiento"),
        ("ARRIVAL_DU", "Arrival / Daily Use"),
        ("WEEKLY", "Weekly"),
    ]

    room_category = models.CharField(max_length=8, choices=ROOM_CATEGORY)
    clean_type = models.CharField(max_length=16, choices=CLEAN_TYPE)
    minutes = models.PositiveIntegerField(default=30)

    class Meta:
        unique_together = ("room_category", "clean_type")
        ordering = ["room_category", "clean_type"]

    def __str__(self):
        return f"{self.room_category}/{self.clean_type}: {self.minutes}m"


class Roster(models.Model):
    week_start = models.DateField(help_text="Lunes de la semana")
    generated_at = models.DateTimeField(auto_now_add=True)
    is_published = models.BooleanField(default=False)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-week_start", "-version"]
        unique_together = ("week_start", "version")

    def __str__(self):
        return f"Roster {self.week_start} v{self.version}"


class Team(models.Model):
    name = models.CharField(max_length=64)
    members = models.ManyToManyField(User, related_name="teams", blank=True)
    compatibility_score = models.IntegerField(default=0)

    def __str__(self):
        return self.name


class Shift(models.Model):
    roster = models.ForeignKey(Roster, on_delete=models.CASCADE, related_name="shifts")
    date = models.DateField()
    start = models.TimeField()
    end = models.TimeField()
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)
    planned_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["date", "start"]

    def __str__(self):
        return f"Shift {self.date} {self.start}-{self.end}"


class ShiftAssignment(models.Model):
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="assignments")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shift_assignments")
    role = models.CharField(max_length=24, default="cleaner")

    class Meta:
        unique_together = ("shift", "user")


class TaskAssignment(models.Model):
    task = models.ForeignKey(HousekeepingTask, on_delete=models.CASCADE, related_name="roster_assignments")
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="task_assignments")
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)
    planned_start = models.DateTimeField(null=True, blank=True)
    planned_end = models.DateTimeField(null=True, blank=True)
    planned_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("task", "shift")