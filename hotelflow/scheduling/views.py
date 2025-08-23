# scheduling/views.py
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils.dateparse import parse_date
from django.utils import timezone

from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from datetime import date as dt_date, time as dt_time, datetime, timedelta

# OpenAI (SDK v1.x)
try:
    from openai import OpenAI
except Exception:
    OpenAI = None  # para poder arrancar sin el paquete instalado

from .models import (
    Zone,
    Skill,
    StaffProfile,
    AvailabilityRule,
    Leave,
    TaskTimeEstimate,
    Roster,
    Team,
    Shift,
    ShiftAssignment,
    TaskAssignment,
)
from .serializers import (
    ZoneSerializer,
    SkillSerializer,
    StaffProfileSerializer,
    AvailabilityRuleSerializer,
    LeaveSerializer,
    TaskTimeEstimateSerializer,
    RosterSerializer,
    TeamSerializer,
    ShiftSerializer,
    ShiftAssignmentSerializer,
    TaskAssignmentSerializer,
)

# Si necesitas HousekeepingTask/Room para estimar carga:
# (no se usan directamente aquí, pero quedan importables si quisieras extender)
try:
    from housekeeping.models import HousekeepingTask, Room  # noqa
except Exception:
    pass

User = get_user_model()


# ======================================================================
# Helpers internos
# ======================================================================
def _parse_time_hhmm(val: str) -> dt_time:
    if not val or not isinstance(val, str):
        raise ValueError("Hora requerida en formato HH:MM")
    try:
        return datetime.strptime(val, "%H:%M").time()
    except ValueError:
        # acepta HH:MM:SS
        return datetime.strptime(val, "%H:%M:%S").time()


def _monday_of(d: dt_date) -> dt_date:
    """Devuelve el lunes de la semana de la fecha d."""
    return d - timedelta(days=d.weekday())


def _ensure_zone(name: Optional[str]) -> Optional[Zone]:
    if not name:
        return None
    z, _ = Zone.objects.get_or_create(name=str(name).strip())
    return z


def _ensure_team(name: Optional[str]) -> Optional[Team]:
    if not name:
        return None
    t, _ = Team.objects.get_or_create(name=str(name).strip())
    return t


class IsAuthenticated(permissions.IsAuthenticated):
    """Alias explícito por legibilidad."""
    pass


# ======================================================================
# CRUD básicos
# ======================================================================
class ZoneViewSet(viewsets.ModelViewSet):
    queryset = Zone.objects.all().order_by("name")
    serializer_class = ZoneSerializer
    permission_classes = [IsAuthenticated]


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all().order_by("name")
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]


class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = (
        StaffProfile.objects.select_related("user")
        .prefetch_related("preferred_zones", "skills")
        .all()
        .order_by("user__username")
    )
    serializer_class = StaffProfileSerializer
    permission_classes = [IsAuthenticated]


# ======================================================================
# Disponibilidad (incluye endpoints "my" y "bulk_upsert")
# ======================================================================
class IsSelfOrAdmin(permissions.BasePermission):
    """
    Empleados solo pueden modificar su disponibilidad.
    Admin/Staff pueden modificar para cualquiera enviando user_id.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class AvailabilityRuleViewSet(viewsets.ModelViewSet):
    """
    CRUD /scheduling/availability/

    Extras:
    - GET  /scheduling/availability/my/
    - POST /scheduling/availability/bulk_upsert/
    """
    queryset = AvailabilityRule.objects.select_related("user").all()
    serializer_class = AvailabilityRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get("user_id") or self.request.query_params.get("user")
        weekday = self.request.query_params.get("weekday")
        if user_id:
            qs = qs.filter(user_id=user_id)
        if weekday is not None:
            try:
                wd = int(weekday)
                qs = qs.filter(weekday=wd)
            except ValueError:
                pass
        return qs.order_by("user__username", "weekday", "start")

    @action(detail=False, methods=["get"], url_path="my", permission_classes=[IsAuthenticated])
    def my(self, request):
        rules = AvailabilityRule.objects.filter(user=request.user).order_by("weekday", "start")
        return Response(AvailabilityRuleSerializer(rules, many=True).data)

    @action(detail=False, methods=["post"], url_path="bulk_upsert", permission_classes=[IsSelfOrAdmin])
    def bulk_upsert(self, request):
        """
        Body:
        {
          "user_id": 12,          # opcional; si no, se usa el usuario autenticado
          "replace": true,        # default true (sobrescribe todo)
          "set_vacation": false,  # opcional: actualizar flag en StaffProfile
          "days": [
            {
              "weekday": 0,        # 0..6
              "intervals": [
                {"start":"07:00","end":"15:00","preferred_shift":"", "is_unavailable": false},
                {"start":"16:00","end":"20:00","is_unavailable": true}
              ]
            }
          ]
        }
        """
        data = request.data or {}

        # target user
        if request.user.is_staff or request.user.is_superuser:
            target_user_id = data.get("user_id", request.user.id)
        else:
            target_user_id = request.user.id

        replace = bool(data.get("replace", True))
        set_vacation = data.get("set_vacation", None)
        days: List[Dict[str, Any]] = data.get("days", [])

        if not isinstance(days, list) or not days:
            return Response({"detail": "Se requiere 'days' con al menos un día."}, status=400)

        to_create: List[AvailabilityRule] = []
        seen = set()  # (weekday, start, end) en esta carga

        try:
            for d in days:
                wd = d.get("weekday", None)
                if wd is None:
                    return Response({"detail": "Cada día debe incluir 'weekday'."}, status=400)
                try:
                    wd = int(wd)
                except (TypeError, ValueError):
                    return Response({"detail": f"weekday inválido: {wd}"}, status=400)
                if not (0 <= wd <= 6):
                    return Response({"detail": f"weekday fuera de rango (0-6): {wd}"}, status=400)

                intervals = d.get("intervals", [])
                if not isinstance(intervals, list) or not intervals:
                    return Response({"detail": f"weekday={wd} requiere 'intervals'."}, status=400)

                for it in intervals:
                    start_s = it.get("start")
                    end_s = it.get("end")
                    pref = (it.get("preferred_shift") or "").strip()
                    is_unav = bool(it.get("is_unavailable", False))
                    if not start_s or not end_s:
                        return Response({"detail": f"weekday={wd} requiere 'start' y 'end'."}, status=400)

                    start_t = _parse_time_hhmm(start_s)
                    end_t = _parse_time_hhmm(end_s)
                    if start_t >= end_t:
                        return Response({"detail": f"weekday={wd}: start<{end_s} debe ser < end."}, status=400)

                    key = (wd, start_t, end_t)
                    if key in seen:
                        return Response({"detail": f"Duplicado en carga: weekday={wd} {start_s}-{end_s}."}, status=400)
                    seen.add(key)

                    to_create.append(AvailabilityRule(
                        user_id=target_user_id,
                        weekday=wd,
                        start=start_t,
                        end=end_t,
                        preferred_shift=pref,
                        is_unavailable=is_unav
                    ))
        except ValueError as ve:
            return Response({"detail": f"Formato de hora inválido: {ve}"}, status=400)

        with transaction.atomic():
            if replace:
                AvailabilityRule.objects.filter(user_id=target_user_id).delete()
            else:
                # upsert básico: borra coincidencias exactas que vamos a recrear
                for ru in to_create:
                    AvailabilityRule.objects.filter(
                        user_id=target_user_id,
                        weekday=ru.weekday,
                        start=ru.start,
                        end=ru.end,
                    ).delete()

            AvailabilityRule.objects.bulk_create(to_create, ignore_conflicts=False)

            if set_vacation is not None:
                sp, _ = StaffProfile.objects.get_or_create(user_id=target_user_id)
                sp.is_on_vacation = bool(set_vacation)
                sp.save(update_fields=["is_on_vacation"])

        rules = AvailabilityRule.objects.filter(user_id=target_user_id).order_by("weekday", "start")
        return Response({
            "detail": "Disponibilidad guardada correctamente.",
            "user_id": target_user_id,
            "count": rules.count(),
            "rules": AvailabilityRuleSerializer(rules, many=True).data
        }, status=200)


class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.select_related("user").all().order_by("-start")
    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get("user_id") or self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs


class TaskTimeEstimateViewSet(viewsets.ModelViewSet):
    queryset = TaskTimeEstimate.objects.all().order_by("room_category", "clean_type")
    serializer_class = TaskTimeEstimateSerializer
    permission_classes = [IsAuthenticated]


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.prefetch_related("members").all().order_by("name")
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = (
        Shift.objects.select_related("roster", "zone", "team")
        .prefetch_related("assignments__user", "task_assignments__task")
        .all()
        .order_by("date", "start")
    )
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        roster_id = self.request.query_params.get("roster")
        date_exact = self.request.query_params.get("date")          # YYYY-MM-DD
        date_from = self.request.query_params.get("date_from")      # YYYY-MM-DD
        date_to = self.request.query_params.get("date_to")          # YYYY-MM-DD
        zone_id = self.request.query_params.get("zone")
        team_id = self.request.query_params.get("team")
        my_only = self.request.query_params.get("my_only")

        if roster_id:
            qs = qs.filter(roster_id=roster_id)

        if date_exact:
            d = parse_date(date_exact)
            if d:
                qs = qs.filter(date=d)

        if date_from:
            d1 = parse_date(date_from)
            if d1:
                qs = qs.filter(date__gte=d1)

        if date_to:
            d2 = parse_date(date_to)
            if d2:
                qs = qs.filter(date__lte=d2)

        if zone_id:
            qs = qs.filter(zone_id=zone_id)

        if team_id:
            qs = qs.filter(team_id=team_id)

        if my_only and str(my_only).lower() in ("1", "true", "yes", "on"):
            qs = qs.filter(assignments__user=self.request.user)

        return qs


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ShiftAssignment.objects.select_related("shift", "user", "shift__team").all()
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get("user_id") or self.request.query_params.get("user")
        shift_id = self.request.query_params.get("shift")
        if user_id:
            qs = qs.filter(user_id=user_id)
        if shift_id:
            qs = qs.filter(shift_id=shift_id)
        return qs


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.select_related("task", "shift", "assignee", "team").all()
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        shift_id = self.request.query_params.get("shift")
        date_str = self.request.query_params.get("date")  # YYYY-MM-DD (por la fecha del shift)
        if shift_id:
            qs = qs.filter(shift_id=shift_id)
        if date_str:
            d = parse_date(date_str)
            if d:
                qs = qs.filter(shift__date=d)
        return qs


# ======================================================================
# Mi semana (tabla)
# ======================================================================
class MyWeekView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request):
        """
        Devuelve una tabla de 7 días para el usuario autenticado.
        Acepta monday o week_start como YYYY-MM-DD.
        """
        # Aceptar ambos nombres y limpiar espacios
        monday_str = (
            request.query_params.get("monday")
            or request.query_params.get("week_start")
            or ""
        )
        monday_str = monday_str.strip().strip('"').strip("'")

        # 1) intento con parse_date (tolerante)
        monday = parse_date(monday_str)

        # 2) fallback explícito ISO (OJO: usamos datetime.strptime directamente)
        if not monday:
            try:
                monday = datetime.strptime(monday_str[:10], "%Y-%m-%d").date()
            except Exception:
                return Response(
                    {"detail": "monday inválido", "got": monday_str},
                    status=400
                )

        # normaliza a lunes por si te pasan otro día
        monday = monday - timedelta(days=monday.weekday())

        week = [monday + timedelta(days=i) for i in range(7)]

        qs = (
            Shift.objects.filter(roster__week_start=monday)
            .filter(Q(assignments__user=request.user) | Q(team__members=request.user))
            .select_related("team", "zone")
            .prefetch_related("team__members", "task_assignments__task")
            .distinct()
        )

        daymap = {d: {"date": d.isoformat(), "shift": None, "team_members": [], "tasks": []} for d in week}

        for sh in qs:
            row = daymap.get(sh.date)
            if not row:
                continue
            team_name = sh.team.name if sh.team else None
            members = []
            if sh.team:
                members = list(sh.team.members.values("id", "first_name", "last_name", "username"))

            row["shift"] = {
                "start": sh.start.strftime("%H:%M"),
                "end": sh.end.strftime("%H:%M"),
                "zone": sh.zone.name if sh.zone else None,
                "team": team_name,
                "planned_minutes": sh.planned_minutes,
            }
            row["team_members"] = members

            for ta in sh.task_assignments.select_related("task"):
                t = ta.task
                row["tasks"].append({
                    "task_id": t.id,
                    "title": t.title,
                    "room": getattr(t, "room_id", None),
                    "planned_start": ta.planned_start.isoformat() if ta.planned_start else None,
                    "planned_end": ta.planned_end.isoformat() if ta.planned_end else None,
                })

        return Response({"monday": monday.isoformat(), "days": list(daymap.values())})


# ======================================================================
# Mi disponibilidad simple (7 días)
# ======================================================================
class AvailabilityDaySerializer(serializers.Serializer):
    weekday = serializers.IntegerField(min_value=0, max_value=6)
    start = serializers.CharField(allow_blank=True, required=False)  # "07:00" o ""
    end = serializers.CharField(allow_blank=True, required=False)
    unavailable = serializers.BooleanField(default=False)


class AvailabilityWeekSerializer(serializers.Serializer):
    days = AvailabilityDaySerializer(many=True)


class MyAvailabilityView(APIView):
    """
    GET  /scheduling/my_availability
    PUT  /scheduling/my_availability

    PUT body:
    {
      "days":[
        {"weekday":0,"start":"07:00","end":"15:00","unavailable":false},
        {"weekday":6,"unavailable":true}
      ]
    }
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request):
        rules = AvailabilityRule.objects.filter(user=request.user).order_by("weekday", "start")
        out = []
        for r in rules:
            out.append({
                "weekday": r.weekday,
                "start": r.start.strftime("%H:%M"),
                "end": r.end.strftime("%H:%M"),
                "unavailable": r.is_unavailable,
            })
        return Response({"days": out})

    def put(self, request):
        ser = AvailabilityWeekSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        days = ser.validated_data["days"]

        AvailabilityRule.objects.filter(user=request.user).delete()

        created = 0
        for d in days:
            wd = d["weekday"]
            unav = d.get("unavailable", False)
            start_str = d.get("start") or ""
            end_str = d.get("end") or ""

            if unav:
                AvailabilityRule.objects.create(
                    user=request.user,
                    weekday=wd,
                    start=dt_time(0, 0),
                    end=dt_time(23, 59),
                    is_unavailable=True,
                )
                created += 1
            else:
                if start_str and end_str:
                    try:
                        sh, sm = map(int, start_str.split(":"))
                        eh, em = map(int, end_str.split(":"))
                        AvailabilityRule.objects.create(
                            user=request.user,
                            weekday=wd,
                            start=dt_time(sh, sm),
                            end=dt_time(eh, em),
                            is_unavailable=False,
                        )
                        created += 1
                    except Exception:
                        return Response({"detail": f"Hora inválida en weekday={wd}"}, status=400)

        return Response({"ok": True, "rules_created": created}, status=200)


# ======================================================================
# Roster + Generación con ChatGPT
# ======================================================================
class RosterViewSet(viewsets.ModelViewSet):
    """
    /api/housekeeping/scheduling/rosters/
    Filtros: ?week_start=YYYY-MM-DD, ?published=true|false

    Acciones:
      POST /scheduling/rosters/ai/generate/   -> genera con ChatGPT (dry_run opcional)
      POST /scheduling/rosters/{id}/publish/
      POST /scheduling/rosters/{id}/unpublish/
    """
    queryset = Roster.objects.all().order_by("-week_start", "-version")
    serializer_class = RosterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        week_start = self.request.query_params.get("week_start")
        published = self.request.query_params.get("published")

        if week_start:
            d = parse_date(week_start)
            if d:
                qs = qs.filter(week_start=d)

        if published is not None:
            val = str(published).lower() in ("1", "true", "yes", "on")
            qs = qs.filter(is_published=val)

        return qs

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        roster = self.get_object()
        roster.is_published = True
        roster.save(update_fields=["is_published"])
        return Response({"detail": "Roster publicado", "id": roster.id})

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        roster = self.get_object()
        roster.is_published = False
        roster.save(update_fields=["is_published"])
        return Response({"detail": "Roster despublicado", "id": roster.id})

    @action(detail=False, methods=["post"], url_path="ai/generate")
    def ai_generate(self, request):
        """
        Body esperado:
        {
          "week_start": "2025-08-25",
          "rooms_summary": [
             {"date":"2025-08-25","vacant":8,"stayovers":5,"deep":1,"zone":"North"},
             ...
          ],
          "availability": [
             {"user_id": 3, "days":[{"weekday":0,"start":"07:00","end":"15:00"}, ...]},
             ...
          ],
          "rules": {
             "start_window":["07:00","10:00"],
             "team_size": 2,
             "shift_minutes": 480
          },
          "dry_run": false
        }
        """
        data = request.data or {}
        week_start_str = data.get("week_start")
        rooms_summary = data.get("rooms_summary", [])
        availability = data.get("availability", [])
        rules = data.get("rules", {}) or {}
        dry_run = bool(data.get("dry_run", False))

        # Validaciones mínimas
        if not week_start_str:
            return Response({"detail": "week_start requerido (YYYY-MM-DD)"}, status=400)
        week_start = parse_date(week_start_str)
        if not week_start:
            return Response({"detail": "week_start inválido, use YYYY-MM-DD"}, status=400)

        # Normaliza a lunes
        week_start = _monday_of(week_start)

        start_window = rules.get("start_window", ["07:00", "10:00"])
        if not isinstance(start_window, list) or len(start_window) != 2:
            return Response({"detail": "rules.start_window debe ser ['HH:MM','HH:MM']"}, status=400)
        try:
            sw_start = _parse_time_hhmm(start_window[0])
            sw_end = _parse_time_hhmm(start_window[1])
        except Exception:
            return Response({"detail": "rules.start_window con formato de hora inválido"}, status=400)

        team_size = int(rules.get("team_size", 2))
        shift_minutes = int(rules.get("shift_minutes", 480))  # 8h por defecto

        # —— 1) Construir prompt
        plan_request = {
            "week_start": week_start.isoformat(),
            "rooms_summary": rooms_summary,
            "availability": availability,
            "rules": {
                "start_window": [sw_start.strftime("%H:%M"), sw_end.strftime("%H:%M")],
                "team_size": team_size,
                "shift_minutes": shift_minutes,
            },
        }

        ai_plan: Dict[str, Any] = {}

        # —— 2) Llamar a OpenAI (si hay clave) con fallback heurístico
        try:
            if not (getattr(settings, "OPENAI_API_KEY", None) and OpenAI):
                raise RuntimeError("OPENAI_API_KEY o paquete openai no configurados")

            client = OpenAI(api_key=settings.OPENAI_API_KEY)

            system = (
                "Eres un planificador de turnos de limpieza hotelera. "
                "Genera turnos por día con ventana de entrada y tamaño de equipo, "
                "respetando disponibilidad. Responde SOLO JSON válido con estructura:\n"
                "{ 'week_start': 'YYYY-MM-DD', 'shifts': [\n"
                "  {'date':'YYYY-MM-DD','start':'HH:MM','end':'HH:MM',"
                "'zone':'NombreOpcional','team_name':'Team A','members':[user_id,...],'planned_minutes':N}\n"
                "]}"
            )
            user_prompt = (
                "Genera el roster semanal con estas entradas. "
                "Si faltan datos, usa heurística razonable. No incluyas comentarios fuera de JSON.\n"
                f"INPUT:\n{plan_request}"
            )

            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.2,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
            )
            raw = completion.choices[0].message.content
            import json as _json  # evitar sombra
            ai_plan = _json.loads(raw) if raw else {}
        except Exception:
            # Fallback simple: 1 turno por fecha encontrada en rooms_summary
            ai_plan = {
                "week_start": week_start.isoformat(),
                "shifts": []
            }
            # Fechas únicas presentes
            seen_dates = sorted({r.get("date") for r in rooms_summary if r.get("date")})
            for d in seen_dates:
                try:
                    start_t = sw_start
                    end_dt = (datetime.combine(datetime.min.date(), start_t) + timedelta(minutes=shift_minutes)).time()
                    zone_name = None
                    # intenta extraer zone de la fila de ese día
                    r_for_day = next((x for x in rooms_summary if x.get("date") == d), None)
                    if r_for_day:
                        zone_name = r_for_day.get("zone")

                    ai_plan["shifts"].append({
                        "date": d,
                        "start": start_t.strftime("%H:%M"),
                        "end": end_dt.strftime("%H:%M"),
                        "zone": zone_name,
                        "team_name": "Team A",
                        "members": [u.get("user_id") for u in availability[:team_size] if u.get("user_id")],
                        "planned_minutes": shift_minutes,
                    })
                except Exception:
                    continue

        # Validar salida mínima
        if "shifts" not in ai_plan or not isinstance(ai_plan["shifts"], list):
            return Response({"detail": "La respuesta de AI no contiene 'shifts' válidos", "ai_plan": ai_plan}, status=500)

        # Solo simulación
        if dry_run:
            return Response({"dry_run": True, "plan": ai_plan})

        # —— 3) Persistir: Roster nueva versión + Shifts + asignaciones
        with transaction.atomic():
            last = Roster.objects.filter(week_start=week_start).order_by("-version").first()
            version = (last.version + 1) if last else 1
            roster = Roster.objects.create(week_start=week_start, version=version, is_published=False)

            created_shifts: List[Shift] = []

            for s in ai_plan["shifts"]:
                dstr = s.get("date")
                start_str = s.get("start")
                end_str = s.get("end")
                pm = int(s.get("planned_minutes") or shift_minutes)
                team_name = s.get("team_name") or "Team A"
                zone_name = s.get("zone")

                if not dstr or not start_str or not end_str:
                    continue

                d = parse_date(dstr)
                if not d:
                    continue
                try:
                    st = _parse_time_hhmm(start_str)
                    en = _parse_time_hhmm(end_str)
                except Exception:
                    continue

                z = _ensure_zone(zone_name)
                t = _ensure_team(team_name)

                shift = Shift.objects.create(
                    roster=roster,
                    date=d,
                    start=st,
                    end=en,
                    zone=z,
                    team=t,
                    planned_minutes=pm,
                )
                created_shifts.append(shift)

                members = s.get("members") or []
                for uid in members:
                    if StaffProfile.objects.filter(user_id=uid).exists():
                        ShiftAssignment.objects.get_or_create(
                            shift=shift, user_id=uid, defaults={"role": "cleaner"}
                        )

            out = {
                "roster": RosterSerializer(roster).data,
                "shifts": ShiftSerializer(created_shifts, many=True).data,
            }
            return Response(out, status=status.HTTP_201_CREATED)