# 🤖 IAPost - Generador de Contenido para LinkedIn

IAPost es una aplicación web (PWA) autohospedada diseñada para profesionales que buscan automatizar su presencia en LinkedIn con contenido de alta calidad sobre economía, tecnología e Inteligencia Artificial.

![IAPost Dashboard](https://raw.githubusercontent.com/mikiaiapp/IAPost/main/screenshot.png)

## ✨ Características

- **Extracción Inteligente**: Scraping automático de noticias económicas y de IA a las 06:30 AM.
- **Análisis de URL**: Pega cualquier noticia y obtén un post analítico y un prompt visual en segundos.
- **BYO-AI (Bring Your Own AI)**: Configura tus propias claves de Gemini, Groq o OpenRouter.
- **Infografías de Impacto**: Generación de prompts técnicos optimizados para Nano Banana 2 (formato 3:4).
- **Seguridad Senior**: Autenticación completa, 2FA (TOTP), cifrado de API Keys y gestión de usuarios.
- **PWA Ready**: Instálalo en tu móvil (iOS/Android) con soporte para notificaciones y experiencia nativa.
- **Integración con "Cartero"**: Sistema de notificaciones por email integrado.

## 🛠️ Stack Tecnológico

- **Backend**: FastAPI (Python 3.11) + SQLAlchemy + SQLite/PostgreSQL.
- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion.
- **Automatización**: APScheduler para tareas programadas.
- **Despliegue**: Docker & Docker Compose.

## 🚀 Despliegue en NAS (Synology/Docker)

### 1. Preparación de carpetas en el NAS
Para un correcto despliegue, debes crear la estructura de carpetas necesaria en el **volumen 1** de tu NAS (o el que corresponda):

1. Abre **File Station**.
2. Navega a `docker/iapost` (o la ruta que hayas definido).
3. Crea las siguientes carpetas:
   - `/volume1/docker/iapost/data` (Para la base de datos SQLite).
   - `/volume1/docker/iapost/logs` (Para los logs del sistema).

### 2. Requisitos previos
- Docker y Docker Compose instalados en el NAS (Container Manager).
- Un contenedor ["Cartero"](https://github.com/mikiaiapp/cartero) ejecutándose en la misma red o accesible vía IP.

### 3. Instalación

1. **Subir los archivos:**
   Sube todo el contenido de este repositorio a tu carpeta del NAS (ej: `/volume1/docker/iapost`).

2. **Configurar variables de entorno:**
   Edita el archivo `.env` en la raíz (puedes usar el Editor de Texto del NAS):
   ```bash
   cp .env.example .env
   ```
   *Nota: Asegúrate de que `DATABASE_URL` apunte a `/app/data/iapost.db` y las rutas de volúmenes en `docker-compose.yml` coincidan con tu NAS.*

3. **Levantar el Stack:**
   Desde SSH o usando Container Manager de Synology:
   ```bash
   docker-compose up -d --build
   ```

4. **Acceder a la aplicación:**
   - Frontend: `http://[IP-DEL-NAS]:3333`
   - API Backend: `http://[IP-DEL-NAS]:8008/docs`

## ⚙️ Configuración de IA

Una vez dentro, ve a la sección de **IA Config** para añadir tus proveedores:
- **Google Gemini**: Obtén tu clave en [AI Studio](https://aistudio.google.com/app/apikey).
- **Groq**: Obtén tu clave en [Groq Console](https://console.groq.com/keys).
- **OpenRouter**: Accede a Claude 3, GPT-4 y más en [OpenRouter](https://openrouter.ai/keys).

## 📅 Automatización

La aplicación está configurada para ejecutarse diariamente a las **06:30 AM (TZ: Europe/Madrid)**. Puedes cambiar esta hora editando las variables `SCHEDULER_HOUR` y `SCHEDULER_MINUTE` en tu archivo `.env`.

## 🔒 Seguridad

IAPost utiliza **Fernet** para cifrar tus API Keys en la base de datos. La `ENCRYPTION_KEY` generada es vital; si la pierdes, no podrás recuperar las claves guardadas.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
