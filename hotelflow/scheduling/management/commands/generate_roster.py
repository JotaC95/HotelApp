# scheduling/management/commands/generate_roster.py
from __future__ import annotations
from typing import Dict, List, Tuple
from datetime import date, datetime, timedelta, time
from collections import defaultdict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

# ===== Ajusta estos imports a tu estructura real =====
from scheduling.models import (
    Roster, Shift, ShiftAssignment, TaskAssignment,
    StaffProfile, AvailabilityRule, Leave, Team, TaskTimeEstimate
)
from housekeeping.models import Room, HousekeepingTask


# -------- Utilidades simples --------
def week_monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def daterange(d0: date, d1: date):
    cur = d0
    while cur <= d1:
        yield cur
        cur += timedelta(days=1)


def to_minutes(hours: float) -> int:
    return int(round(hours * 60))


def overlaps(a_start: time, a_end: time, b_start: time, b_end: time) -> bool:
    return not (a_end <= b_start or b_end <= a_start)


# -------- Nueva configuración de ventanas --------
# Ventana de entrada: todos entran por la mañana, entre 07:00 y 10:00
START_WINDOW_START = time(7, 0)
START_WINDOW_END = time(10, 0)
STAGGER_MINUTES = 30  # escalonamiento entre equipos

# Duraciones por defecto (puedes ajustar)
DEFAULT_SHIFT_HOURS = 6
LATE_TEAM_END = time(18, 0)  # si hay daily use, un equipo entra tarde y puede quedarse hasta esta hora

# Horas máximas semanales (simple, aproximado)
EMPLOYMENT_MAX_HOURS = {
    "FULL_TIME": 38,
    "PART_TIME": 24,
    "CASUAL": 20,
}

# Si no existe TaskTimeEstimate en DB, usa estimaciones por defecto (minutos)
FALLBACK_TASK_MINUTES = {
    "TURNOVER": 45,
    "DEEP_CLEAN": 90,
    "INSPECTION": 20,
    "AMENITIES": 15,
    "DAILY_USE": 40,  # <- añadido para daily use si lo manejas como task_type
    # Otros -> 40
}


def get_task_minutes(task_type: str, cached: Dict[str, int]) -> int:
    if task_type in cached:
        return cached[task_type]
    return FALLBACK_TASK_MINUTES.get(task_type, 40)


def load_estimates_cache() -> Dict[str, int]:
    cache: Dict[str, int] = {}
    for e in TaskTimeEstimate.objects.all():
        cache[e.task_type] = e.minutes
    return cache


# -------- Disponibilidad --------
def staff_available_for_day(staff: List[StaffProfile], d: date) -> List[StaffProfile]:
    out = []
    weekday = d.weekday()
    for s in staff:
        # Vacaciones/ausencias
        if Leave.objects.filter(staff=s.user, start_date__lte=d, end_date__gte=d).exists():
            continue
        # Reglas de disponibilidad del día (debe existir al menos una ventana disponible)
        if not AvailabilityRule.objects.filter(staff=s.user, weekday=weekday, is_available=True).exists():
            continue
        out.append(s)
    return out


def availability_windows(user, d: date) -> List[Tuple[time, time]]:
    weekday = d.weekday()
    wins: List[Tuple[time, time]] = []
    for r in AvailabilityRule.objects.filter(staff=user, weekday=weekday, is_available=True):
        wins.append((r.start_time, r.end_time))
    return wins


def window_contains(user, d: date, start: time, end: time) -> bool:
    """¿El usuario puede cubrir totalmente [start, end] según sus ventanas del día d?"""
    for s, e in availability_windows(user, d):
        if start >= s and end <= e:
            return True
    return False


# -------- Equipos --------
def pair_into_teams(staff: List[StaffProfile]) -> List[List[StaffProfile]]:
    """Equipos de 2 (si impar, el último queda solo)."""
    teams = []
    cur = []
    for s in staff:
        cur.append(s)
        if len(cur) == 2:
            teams.append(cur[:])
            cur.clear()
    if cur:
        teams.append(cur[:])
    return teams


# -------- Carga de tareas --------
def tasks_for_day(d: date) -> List[HousekeepingTask]:
    return list(
        HousekeepingTask.objects.filter(
            Q(scheduled_for=d) | Q(scheduled_for__isnull=True),
            status__in=["PENDING", "ASSIGNED"]
        ).select_related("room").order_by("priority", "id")
    )


def has_daily_use(tasks: List[HousekeepingTask]) -> bool:
    """Marca si existen tareas de tipo 'DAILY_USE' (ajusta si usas otro nombre/campo)."""
    return any((t.task_type or "").upper() == "DAILY_USE" for t in tasks)


# -------- Horas semanales ya asignadas --------
def current_week_minutes(user, mon: date, sun: date) -> int:
    qs = ShiftAssignment.objects.filter(
        staff=user,
        shift__date__gte=mon,
        shift__date__lte=sun,
    ).select_related("shift")
    total = 0
    for sa in qs:
        s: Shift = sa.shift
        delta = datetime.combine(s.date, s.end_time) - datetime.combine(s.date, s.start_time)
        total += int(delta.total_seconds() // 60)
    return total


def within_week_limit(profile: StaffProfile, already_min: int, add_min: int) -> bool:
    max_hours = EMPLOYMENT_MAX_HOURS.get(profile.employment_type or "PART_TIME", 24)
    return already_min + add_min <= to_minutes(max_hours)


# -------- Lógica de cálculo de horas de inicio --------
def staggered_starts(n_teams: int, day: date, late_team: bool) -> List[Tuple[time, time]]:
    """
    Genera tuplas (start_time, end_time) por equipo.
    - Escalona desde 07:00 cada STAGGER_MINUTES.
    - Si late_team=True, reserva el ÚLTIMO equipo con inicio tardío (10:00 -> LATE_TEAM_END).
    """
    starts: List[Tuple[time, time]] = []
    # número de equipos “tempranos”; si hay late team, uno queda para el late
    early_teams = max(n_teams - 1, 0) if late_team and n_teams > 0 else n_teams

    # early cohort: 07:00 -> 10:00 escalonados
    base_dt = datetime.combine(day, START_WINDOW_START)
    latest_start = datetime.combine(day, START_WINDOW_END)

    for i in range(early_teams):
        st_dt = base_dt + timedelta(minutes=STAGGER_MINUTES * i)
        if st_dt > latest_start:
            # si se excede la ventana, clamp a END
            st_dt = latest_start
        et_dt = st_dt + timedelta(hours=DEFAULT_SHIFT_HOURS)
        starts.append((st_dt.time(), et_dt.time()))

    # late team (si aplica)
    if late_team and n_teams > 0:
        late_start = time(10, 0)
        starts.append((late_start, LATE_TEAM_END))

    return starts


# -------- Comando principal --------
class Command(BaseCommand):
    help = "Genera automáticamente el roster semanal con entradas AM (07:00–10:00) y un equipo tardío si hay 'daily use'."

    def add_arguments(self, parser):
        parser.add_argument("--week", help="YYYY-MM-DD (cualquier día), por defecto hoy", default=None)
        parser.add_argument("--dry", action="store_true", help="No guarda en DB, solo simula (log)")

    @transaction.atomic
    def handle(self, *args, **opts):
        # 1) Semana objetivo
        if opts["week"]:
            try:
                base_day = datetime.strptime(opts["week"], "%Y-%m-%d").date()
            except ValueError:
                raise CommandError("Formato de --week debe ser YYYY-MM-DD")
        else:
            base_day = date.today()

        monday = week_monday(base_day)
        sunday = monday + timedelta(days=6)

        self.stdout.write(self.style.NOTICE(f"Generando roster para semana {monday} a {sunday}"))

        # 2) Roster
        roster, created = Roster.objects.get_or_create(
            week_start=monday,
            defaults={"name": f"Roster {monday}"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Roster creado: {roster}"))
        else:
            self.stdout.write(self.style.WARNING(f"Usando roster existente: {roster}"))

        # 3) Staff activo
        staff = list(StaffProfile.objects.select_related("user").filter(is_active=True))
        if not staff:
            raise CommandError("No hay StaffProfile activos.")

        estimates = load_estimates_cache()

        created_shifts = []
        created_shift_assignments = []
        created_task_assignments = []

        # 4) Por día
        for d in daterange(monday, sunday):
            day_staff = staff_available_for_day(staff, d)
            if not day_staff:
                self.stdout.write(self.style.WARNING(f"{d}: sin personal disponible"))
                continue

            # Ordena por carga semanal (menos minutos primero) para equipo más equitativo
            day_staff.sort(key=lambda p: current_week_minutes(p.user, monday, sunday))

            # Emparejar equipos de 2
            teams = pair_into_teams(day_staff)
            if not teams:
                self.stdout.write(self.style.WARNING(f"{d}: no se formaron equipos"))
                continue

            # Tareas del día y bandera daily-use
            day_tasks = tasks_for_day(d)
            daily_use_flag = has_daily_use(day_tasks)

            # Genera horas de inicio para N equipos
            team_times = staggered_starts(n_teams=len(teams), day=d, late_team=daily_use_flag)

            # Filtrar por disponibilidad real de cada miembro del equipo (la ventana del equipo debe ser cubierta por TODOS sus miembros)
            valid_team_specs: List[Tuple[List[StaffProfile], time, time]] = []
            for team, (st, et) in zip(teams, team_times):
                ok = True
                for member in team:
                    if not window_contains(member.user, d, st, et):
                        ok = False
                        break
                if ok:
                    valid_team_specs.append((team, st, et))

            if not valid_team_specs:
                self.stdout.write(self.style.WARNING(f"{d}: ningún equipo tiene ventana suficiente en su horario asignado"))
                continue

            # Crear shifts y asignaciones por equipo válido
            for team, st, et in valid_team_specs:
                shift = Shift.objects.create(
                    roster=roster,
                    date=d,
                    slot="AM",          # mantenemos 'AM' como etiqueta; la hora real viene en start/end
                    start_time=st,
                    end_time=et,
                    zone=""
                )
                created_shifts.append(shift)
                for member in team:
                    sa = ShiftAssignment.objects.create(
                        shift=shift,
                        staff=member.user,
                        role="HOUSEKEEPING"
                    )
                    created_shift_assignments.append(sa)

            # Asignación de tareas por carga (greedy)
            day_shifts = list(Shift.objects.filter(roster=roster, date=d).order_by("start_time", "id"))
            if not day_shifts or not day_tasks:
                continue

            shift_load: Dict[int, int] = {s.id: 0 for s in day_shifts}

            for task in day_tasks:
                minutes = get_task_minutes((task.task_type or "").upper(), estimates)
                target_shift = min(day_shifts, key=lambda s: shift_load[s.id])
                TaskAssignment.objects.create(
                    shift=target_shift,
                    task=task,
                    estimated_minutes=minutes,
                    status="ASSIGNED"
                )
                created_task_assignments.append(task.id)
                shift_load[target_shift.id] += minutes

        if opts["dry"]:
            self.stdout.write(self.style.NOTICE("DRY RUN: se revertirán los cambios."))
            raise transaction.Rollback

        self.stdout.write(self.style.SUCCESS(
            f"OK. Shifts: {len(created_shifts)}, ShiftAssignments: {len(created_shift_assignments)}, TaskAssignments: {len(created_task_assignments)}"
        ))