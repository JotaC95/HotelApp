from rest_framework.permissions import BasePermission

ALLOWED_GROUPS = {"housekeepers", "supervisor", "maintenance", "frontdesk"}

class IsHKStaffOrHasModelView(BasePermission):
    """
    Permite acceso si el usuario pertenece a alguno de los grupos permitidos
    o si tiene permiso de modelo 'view_*' sobre Room.
    """
    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        # grupos
        user_groups = {g.name.lower() for g in u.groups.all()}
        if user_groups & ALLOWED_GROUPS:
            return True
        # permiso de modelo
        return u.has_perm("housekeeping.view_room")