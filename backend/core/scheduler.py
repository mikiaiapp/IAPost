"""
APScheduler - Daily content generation at 06:30
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

from core.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone=pytz.timezone(settings.TZ))


async def daily_content_job():
    """Main daily job: scrape news and generate posts for all active users."""
    from services.content_pipeline import run_daily_pipeline
    logger.info("Starting daily content generation job...")
    try:
        await run_daily_pipeline()
        logger.info("Daily content generation completed successfully.")
    except Exception as e:
        logger.error(f"Daily job failed: {e}", exc_info=True)


def start_scheduler():
    scheduler.add_job(
        daily_content_job,
        trigger=CronTrigger(
            hour=settings.SCHEDULER_HOUR,
            minute=settings.SCHEDULER_MINUTE,
            timezone=pytz.timezone(settings.TZ),
        ),
        id="daily_content",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        f"Scheduler started. Next run at {settings.SCHEDULER_HOUR:02d}:{settings.SCHEDULER_MINUTE:02d} {settings.TZ}"
    )


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped.")
