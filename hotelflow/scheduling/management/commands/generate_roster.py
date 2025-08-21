from django.core.management.base import BaseCommand
from django.utils import timezone
from scheduling.models import Roster
import datetime

class Command(BaseCommand):
    help = "Genera un roster semanal para el personal de limpieza"

    def add_arguments(self, parser):
        parser.add_argument(
            "--week-start",
            type=str,
            help="Fecha del lunes de la semana en formato YYYY-MM-DD",
        )
        parser.add_argument(
            "--publish",
            action="store_true",
            help="Si se pasa, marca el roster como publicado",
        )

    def handle(self, *args, **options):
        week_start_str = options.get("week_start")
        publish = options.get("publish", False)

        if not week_start_str:
            self.stderr.write(self.style.ERROR("Debes indicar --week-start YYYY-MM-DD"))
            return

        try:
            week_start = datetime.date.fromisoformat(week_start_str)
        except ValueError:
            self.stderr.write(self.style.ERROR("Formato inválido, usa YYYY-MM-DD"))
            return

        # Crear o recuperar roster
        roster, created = Roster.objects.get_or_create(
            week_start=week_start,
            version=1,
        )

        if publish:
            roster.is_published = True
            roster.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Roster generado para semana {week_start}"))
        else:
            self.stdout.write(self.style.WARNING(f"Roster ya existía para semana {week_start}"))

        if publish:
            self.stdout.write(self.style.SUCCESS("Roster publicado."))