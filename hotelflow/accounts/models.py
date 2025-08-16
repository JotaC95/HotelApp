from django.db import models

# Create your models here.

from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        SUPERVISOR = "SUPERVISOR", "Supervisor"
        HOUSEKEEPER = "HOUSEKEEPER", "Housekeeper"
        MAINTENANCE = "MAINTENANCE", "Maintenance"

    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.HOUSEKEEPER)

    def __str__(self):
        return f"{self.username} ({self.role})"