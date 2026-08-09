# HotelFlow — Arrancar con Docker y desplegar en el hotel

Este documento cubre dos cosas distintas: cómo levantar el proyecto en tu
máquina para desarrollar, y cómo llevarlo a producción en el servidor del
primer hotel cliente.

## 0. Requisitos

- Docker y Docker Compose v2 instalados (`docker --version`, `docker compose version`).
- Para producción: un dominio propio (ej. `app.hotelnombre.com`) y un VPS con
  ese dominio apuntando a su IP por DNS.

## 1. Arrancar en local (desarrollo)

```bash
# 1. Clonar y entrar al repo
git clone <url-del-repo>
cd HotelApp

# 2. Crear tu archivo de variables de entorno
cp .env.example .env
```

Edita `.env` y, como mínimo para desarrollo local, cambia:

- `POSTGRES_PASSWORD` — cualquier valor, es solo para tu Postgres local.
- `SECRET_KEY` — genera uno con:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(50))"
  ```
- `DEBUG=True` (en local está bien; en producción debe quedar en `False`).

```bash
# 3. Levantar todo (Postgres + Redis + Django)
docker compose up -d --build

# 4. Crear un usuario administrador
docker compose exec web python manage.py createsuperuser

# 5. Verificar que responde
curl http://127.0.0.1:8000/api/health/
# -> {"status": "ok", "service": "HotelFlow API", "version": "0.1.0"}
```

Puntos útiles mientras desarrollas:

- Panel de administración: http://127.0.0.1:8000/admin/
- Documentación interactiva de la API: http://127.0.0.1:8000/api/docs/
- Logs en vivo: `docker compose logs -f web`
- Parar todo: `docker compose down` (los datos de Postgres/Redis persisten
  en volúmenes; para borrarlos también: `docker compose down -v`).

### Conectar la app móvil (Expo) a este backend

En `hotelflow/hotelflow-mobile/src/config.ts` o vía variable de entorno
`API_BASE_URL` (ver `@env` / `react-native-dotenv`), apunta a la IP de tu
máquina en la red local, no a `127.0.0.1` (el emulador/dispositivo no es la
misma máquina):

```
API_BASE_URL=http://192.168.1.50:8000/api/housekeeping
```

## 2. Desplegar en el servidor del hotel (producción)

### 2.1 Elegir y preparar el servidor

Un VPS pequeño alcanza para un hotel individual: 2 vCPU / 4 GB RAM es un
punto de partida razonable (DigitalOcean, Hetzner, AWS Lightsail, etc.).
Instala Docker siguiendo la guía oficial del proveedor del sistema operativo
que elijas.

### 2.2 DNS

Antes de continuar, el dominio del hotel (ej. `app.hotelnombre.com`) debe
apuntar por un registro `A` a la IP pública del servidor. Caddy (el proxy
que incluye este repo) no puede emitir certificado TLS hasta que el DNS
resuelva correctamente.

### 2.3 Clonar y configurar

```bash
git clone <url-del-repo>
cd HotelApp
cp .env.example .env
```

Edita `.env` con valores **reales de producción**:

| Variable | Valor |
|---|---|
| `SECRET_KEY` | Genera uno nuevo (nunca reutilices el de desarrollo). |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `app.hotelnombre.com` |
| `POSTGRES_PASSWORD` | Contraseña fuerte, generada aleatoriamente. |
| `CORS_ALLOWED_ORIGINS` | `https://app.hotelnombre.com` (y el origen del panel web si existe). |
| `DOMAIN` | `app.hotelnombre.com` (la usa Caddy para el certificado TLS). |
| `OPENAI_API_KEY` | Opcional — solo si vas a usar la generación de turnos con IA. |

### 2.4 Levantar el stack de producción

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Esto levanta Postgres, Redis, Django (sirviendo por Daphne, con soporte para
el chat en tiempo real vía Channels/Redis) y Caddy, que obtiene y renueva el
certificado TLS de Let's Encrypt automáticamente para `DOMAIN`.

```bash
# Crear el primer usuario administrador en producción
docker compose exec web python manage.py createsuperuser

# Verificar que responde por HTTPS
curl https://app.hotelnombre.com/api/health/
```

### 2.5 Backups de la base de datos

No hay backup automático incluido — configúralo antes de dar acceso al
cliente. Ejemplo mínimo con `pg_dump` y un cron diario:

```bash
docker compose exec -T db pg_dump -U hotelflow hotelflow | gzip > backup-$(date +%F).sql.gz
```

Sube esos archivos a almacenamiento externo (S3, Backblaze, etc.); un backup
que vive solo en el mismo servidor no protege contra la pérdida del servidor.

### 2.6 Actualizar la app móvil para producción

Antes de compilar el build de la app para el hotel, actualiza
`API_BASE_URL` a `https://app.hotelnombre.com/api/housekeeping` y genera el
build con EAS (`eas build`) según la plataforma del personal del hotel
(Android/iOS).

### 2.7 Checklist antes de dar acceso al cliente

- [ ] `docker compose exec web python manage.py check --deploy` no reporta
      advertencias de seguridad.
- [ ] `https://app.hotelnombre.com/api/docs/` carga con candado válido.
- [ ] Login funciona desde la app móvil apuntando al dominio real.
- [ ] Backup de base de datos probado (no solo configurado — restaurado
      una vez en un entorno de prueba).
- [ ] Contraseñas de todos los usuarios de prueba/desarrollo rotadas o
      eliminadas antes de crear las cuentas reales del personal del hotel.

## 3. Lo que Docker resuelve — y lo que sigue pendiente

Levantar esto con Docker soluciona directamente varios de los bloqueantes
críticos de la auditoría: dependencias que antes faltaban en
`requirements.txt`, base de datos en SQLite sin backups, `ALLOWED_HOSTS`/
`DEBUG` mal configurados, CORS abierto a cualquier origen, y HTTPS ausente
(Caddy lo resuelve automáticamente).

Sigue pendiente, y no lo resuelve Docker por sí solo:

- Reemplazar la autenticación HTTP Basic de la app móvil por JWT
  (`djangorestframework_simplejwt` ya está instalado).
- Límite de intentos (throttling) en la API.
- Pruebas automatizadas y un pipeline de CI.
- Purgar `db.sqlite3` del historial de Git y rotar credenciales expuestas.
- Decisión de arquitectura multi-hotel antes de vender a un segundo cliente.

Ver la auditoría completa para el detalle de cada punto.
