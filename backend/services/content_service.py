"""
Content generation service - LinkedIn post + infographic prompt
"""
import logging
from datetime import date

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un experto en comunicación económica y tecnológica para LinkedIn en España.
Tu estilo es profesional, directo, riguroso y con autoridad. Escribes en español de España formal.
Usas emojis estratégicamente (no en exceso). Cada post que generas es único y valioso para la audiencia.
Tienes expertise en economía, mercados financieros, inteligencia artificial y productividad digital."""


def build_linkedin_post_prompt(
    economic_news: dict,
    ai_news: dict,
    ephemeris: str,
    today: date,
) -> str:
    return f"""Genera un post COMPLETO para LinkedIn siguiendo EXACTAMENTE esta estructura:

**FECHA:** {today.strftime('%d de %B de %Y')}

**DATOS DE ENTRADA:**
- Noticia económica: {economic_news.get('title', '')}
  Resumen: {economic_news.get('content', '')[:800]}
  Fuente: {economic_news.get('url', '')}

- Noticia/Tip de IA: {ai_news.get('title', '')}
  Resumen: {ai_news.get('content', '')[:600]}

- Efeméride del día: {ephemeris}

**ESTRUCTURA DEL POST (usa exactamente estos emojis y secciones):**

🔔 [HOOK IMPACTANTE - 1-2 líneas que enganchen inmediatamente relacionadas con la noticia económica]

━━━━━━━━━━━━━━━━

📊 CONTEXTO ECONÓMICO
[Análisis de la noticia económica en 3-4 párrafos cortos. Datos, causas, consecuencias para España/Europa. Máx. 200 palabras]

━━━━━━━━━━━━━━━━

🤖 INTELIGENCIA ARTIFICIAL HOY
[Noticia o tip de IA en 2-3 párrafos. Conectar con aplicación práctica para profesionales. Máx. 150 palabras]

━━━━━━━━━━━━━━━━

📅 HOY EN LA HISTORIA
[Efeméride desarrollada en 2-3 líneas con reflexión económica o de innovación relevante]

━━━━━━━━━━━━━━━━

💡 PARA REFLEXIONAR
[1 pregunta potente para generar debate o 1 insight accionable]

━━━━━━━━━━━━━━━━

#economía #inteligenciaartificial #innovación #finanzas #España [añade 3-5 hashtags más relevantes]

**IMPORTANTE:**
- Longitud total: 1.200-1.800 caracteres
- Tono: profesional, riguroso pero accesible
- NO usar lenguaje clickbait
- Párrafos cortos (máx. 3-4 líneas cada uno)
- En español de España (usad, vosotros, etc.)"""


def build_infographic_prompt(
    economic_news: dict,
    ai_news: dict,
    ephemeris: str,
    today: date,
) -> str:
    return f"""Genera un prompt técnico detallado para crear una infografía LinkedIn (formato 3:4, 1080x1440px).

**CONTENIDO A VISUALIZAR:**
- Tema principal: {economic_news.get('title', 'Análisis económico diario')}
- Subtema IA: {ai_news.get('title', 'Inteligencia Artificial')}
- Fecha: {today.strftime('%d/%m/%Y')}
- Efeméride: {ephemeris[:200]}

**GENERA EL PROMPT para Nano Banana 2 / imagen IA con estas especificaciones:**

El prompt DEBE incluir:
1. Composición visual detallada (qué elementos hay y dónde)
2. Paleta de colores específica (códigos hex o descripciones precisas)
3. Tipografía y jerarquía visual
4. Estilo artístico preciso (NO "futurista genérico")
5. Iluminación y atmósfera
6. Textos a incluir en la imagen

Responde ÚNICAMENTE con el prompt para el generador de imágenes, sin explicaciones adicionales."""


def build_url_analysis_prompt(article: dict) -> str:
    return f"""Analiza este artículo y genera contenido completo para LinkedIn.

**ARTÍCULO:**
Título: {article.get('title', '')}
Descripción: {article.get('description', '')}
Contenido: {article.get('content', '')[:2000]}
Fuente: {article.get('url', '')}
Dominio: {article.get('domain', '')}

Genera:
1. Un post LinkedIn profesional de 1.200-1.800 caracteres con:
   - Hook inicial impactante
   - Análisis profundo del artículo (causas, consecuencias, oportunidades)
   - Aplicación práctica para profesionales
   - 1 pregunta de reflexión o CTA
   - Hashtags relevantes (mínimo 8)
   
2. Después escribe "---PROMPT_INFOGRAFIA---" y genera un prompt técnico para crear una infografía 3:4 sobre el artículo.

Escribe en español de España, tono profesional y riguroso."""


async def generate_ephemeris(today: date, ai_provider: str, api_key: str, model: str = None) -> str:
    """Generate a historical ephemeris for today using AI."""
    from services.ai_service import generate_text

    prompt = f"""Busca una efeméride histórica relevante para el {today.strftime('%d de %B')} relacionada con:
- Economía, finanzas o mercados
- Ciencia, tecnología o innovación
- Historia empresarial o industrial

Formato de respuesta (máx. 150 caracteres):
"[AÑO]: [Hecho histórico breve y su relevancia actual]"

Solo responde con la efeméride, sin introducción ni explicación."""

    try:
        return await generate_text(
            provider=ai_provider,
            api_key=api_key,
            prompt=prompt,
            model=model,
            temperature=0.5,
            max_tokens=200,
        )
    except Exception as e:
        logger.error(f"Could not generate ephemeris: {e}")
        return f"{today.strftime('%d/%m')}: Efeméride no disponible hoy."
