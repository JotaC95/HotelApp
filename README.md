# 🏨 HotelFlow

Aplicación para la **gestión logística de hoteles**, optimizada para mejorar la eficiencia del personal en limpieza, mantenimiento y administración de habitaciones.

---

## 🚀 Características

- 📋 **Listado de habitaciones** con información clave (estado, tamaño, notas).
- 🔍 **Pantalla de detalles** de cada habitación con conexión a un endpoint backend real.
- ✅ **Gestión de estados**: limpieza, mantenimiento, disponible, ocupada.
- 📲 **Interfaz intuitiva** construida en React Native con Expo.
- 🌐 **Conexión a backend (Django/Flask/otro)** para obtener datos en tiempo real.
- 🔔 **Notificaciones y alertas** para el personal (pendiente).

---

## 📂 Estructura del proyecto

```bash
HotelFlow/
│── src/
│   ├── screens/
│   │   ├── RoomListScreen.tsx
│   │   ├── RoomDetailScreen.tsx
│   ├── components/
│   ├── services/
│   │   └── api.ts   # Conexión al backend
│── package.json
│── App.tsx
│── README.md


🛠️ Tecnologías utilizadas
	•	Frontend: React Native + Expo
	•	Backend (ejemplo): Django REST Framework o Flask API
	•	Gestión de estado: Context API / Redux (dependiendo de implementación)
	•	Lenguaje: TypeScript

▶️ Instrucciones de instalación
	1.	Clonar el repositorio:
    git clone https://github.com/usuario/HotelFlow.git
    cd HotelFlow
	2.	Instalar dependencias:
    npm install
	3.	Iniciar el proyecto con Expo:
    npx expo start

	4.	Abrir en simulador o dispositivo físico escaneando el QR.


🔌 Conexión al backend

En src/services/api.ts configura la URL de tu servidor:
const API_URL = "http://TU_BACKEND:8000/api";

📌 Futuras mejoras
	•	🧾 Generar reportes automáticos de habitaciones.
	•	🔔 Integración con WhatsApp o email para notificaciones.
	•	📊 Panel de estadísticas para administración.
	•	🧹 Checklists dinámicos para housekeeping.

⸻

👨‍💻 Autores
	•	Jaime Crow – Ingeniería y desarrollo
	•	Colaboradores del proyecto HotelApp

⸻

📜 Licencia

Este proyecto está bajo la licencia MIT.
