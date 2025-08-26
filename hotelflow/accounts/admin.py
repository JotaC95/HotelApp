from django.contrib import admindocs
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

# Register your models here.

from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("username", "email")
    
    
User = get_user_model()

# Si ya estaba registrado con otro admin, desregístralo primero
try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """
    Usa el admin nativo de Django para User:
    - Muestra el hash del password (no editable directamente)
    - Agrega el link 'Change password' correcto
    - Maneja permisos/grupos de forma segura
    """
    pass