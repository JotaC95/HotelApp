import math
from django.db.models import Count, Q
from .models import StaffAvailability, HousekeepingTask, Room

# Roles permitidos para recibir tareas de housekeeping
ALLOWED_ROLES = {"HOUSEKEEPER", "SUPERVISOR"}

# Distancia Haversine (metros). Lista para cuando agreguemos lat/lon a Room.
def haversine_m(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None
    R = 6371000.0
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lon2) - float(lon1))
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def pick_best_staff_for_task(task: HousekeepingTask):
    """Selecciona el mejor candidato según disponibilidad, rol y carga activa.
    Devuelve (StaffAvailability|None, info:dict)
    """
    room: Room = task.room

    qs = (
        StaffAvailability.objects
        .select_related("user")
        .filter(is_available=True, user__role__in=ALLOWED_ROLES)
        .annotate(
            active_load=Count(
                "user__assigned_tasks",
                filter=Q(user__assigned_tasks__status__in=["ASSIGNED", "IN_PROGRESS"])  # ruta completa desde SA
            )
        )
    )

    candidates = []
    for sa in qs:
        # Desempate simple por zona/piso (cuando añadamos coords de Room, usaremos haversine)
        same_zone_or_floor = 1 if (getattr(room, "zone", None) or getattr(room, "floor", None)) else 0
        dist = None  # placeholder hasta tener coords en Room
        score = (
            getattr(sa, "active_load", 0),
            dist if dist is not None else 10_000_000,
            0 if same_zone_or_floor else 1,
        )
        candidates.append((score, sa))

    if not candidates:
        return None, {"reason": "NO_STAFF_AVAILABLE"}

    candidates.sort(key=lambda x: x[0])
    best = candidates[0][1]
    return best, {
        "user_id": best.user_id,
        "username": best.user.username,
        "active_load": getattr(best, "active_load", 0),
        "criteria": "availability, role, lowest active load; zone/floor tie-break",
    }