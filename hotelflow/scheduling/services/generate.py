# scheduling/services/generate.py
from datetime import datetime, date, time, timedelta
from collections import defaultdict
from typing import Dict, List, Tuple

from django.db import transaction
from django.utils.timezone import make_aware

from housekeeping.models import HousekeepingTask, Room
from scheduling.models import Roster, Shift, TaskAssignment, Team


def _monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _default_shifts_for_day() -> List[Tuple[time, time]]:
    """
    Turnos por defecto (MVP). Puedes parametrizar luego.
    """
    return [(time(8, 0), time(16, 0))]  # 8 horas


@transaction.atomic
def generate_roster(roster: Roster):
    """
    Heurístico básico:
    - Busca tareas con scheduled_for dentro de la semana del roster.
    - Agrupa por día.
    - Crea un turno de 8h por día (MVP).
    - Asigna todas las tareas del día a ese turno, sin empaquetado fino.
    - (En siguientes iteraciones: usar zonas, equipos, disponibilidad, etc.)
    """
    week_start = roster.week_start
    week_days = [week_start + timedelta(days=i) for i in range(7)]

    # Limpia lo existente si regeneras
    roster.shifts.all().delete()

    # 1) Trae tareas planificadas esta semana (usa tu campo scheduled_for)
    tasks_by_day: Dict[date, List[HousekeepingTask]] = defaultdict(list)
    qs = HousekeepingTask.objects.filter(scheduled_for__in=week_days).select_related("room")
    for t in qs:
        tasks_by_day[t.scheduled_for].append(t)

    # 2) Crea 1 turno por día (MVP) y mete tareas dentro
    for d in week_days:
        day_tasks = tasks_by_day.get(d, [])
        if not day_tasks:
            continue

        for start, end in _default_shifts_for_day():
            shift = Shift.objects.create(
                roster=roster,
                date=d,
                start=start,
                end=end,
                zone=None,     # TODO: derivar de Room.zone
                team=None,     # TODO: formar equipos
                planned_minutes=0
            )

            # 3) Asigna tareas a este turno (sin cálculo de minutos MVP)
            for task in day_tasks:
                TaskAssignment.objects.create(
                    task=task,
                    shift=shift,
                    assignee=None,
                    team=None,
                    planned_start=None,
                    planned_end=None,
                    planned_minutes=0
                )

    return roster