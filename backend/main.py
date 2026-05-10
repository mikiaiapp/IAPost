"""
IAPost - Main FastAPI Application
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.database import init_db
from core.scheduler import start_scheduler, shutdown_scheduler
from routers import auth, users, posts, sources, ai_config, scraper, health

# Configure logging - Console only for maximum compatibility with NAS
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting IAPost Backend...")
    try:
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        # We don't raise here so the app can at least start and respond to health checks / logs
    
    try:
        start_scheduler()
        logger.info(f"Scheduler started - Daily run at {settings.SCHEDULER_HOUR:02d}:{settings.SCHEDULER_MINUTE:02d}")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}", exc_info=True)
    
    yield
    shutdown_scheduler()
    logger.info("IAPost Backend stopped.")


app = FastAPI(
    title="IAPost API",
    description="API para generación automatizada de contenido LinkedIn con IA",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(sources.router, prefix="/api/sources", tags=["sources"])
app.include_router(ai_config.router, prefix="/api/ai", tags=["ai"])
app.include_router(scraper.router, prefix="/api/scraper", tags=["scraper"])


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
