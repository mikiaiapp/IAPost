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

## 🚀 Despliegue Rápido

### Requisitos previos
- Docker y Docker Compose instalados.
- Un contenedor ["Cartero"](https://github.com/mikiaiapp/cartero) ejecutándose (opcional, pero recomendado para emails).

### Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/mikiaiapp/IAPost.git
   cd IAPost
   ```

2. **Configurar variables de entorno:**
   Copia el archivo de ejemplo y edítalo con tus claves:
   ```bash
   cp .env.example .env
   ```
   *Nota: Asegúrate de configurar `SECRET_KEY`, `ENCRYPTION_KEY` y las URLs de los servicios.*

3. **Levantar con Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

4. **Acceder a la aplicación:**
   - Frontend: `http://localhost:3000`
   - API Backend: `http://localhost:8000/docs`

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
