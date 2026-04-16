import logging
import logging.config


def configure_logging(debug: bool = False) -> None:
    level = "DEBUG" if debug else "INFO"
    sqlalchemy_level = "INFO" if debug else "WARNING"

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                },
                "access": {
                    "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": level,
                },
                "access_console": {
                    "class": "logging.StreamHandler",
                    "formatter": "access",
                    "level": "INFO",
                },
            },
            "root": {
                "handlers": ["console"],
                "level": level,
            },
            "loggers": {
                "uvicorn": {
                    "handlers": ["console"],
                    "level": level,
                    "propagate": False,
                },
                "uvicorn.error": {
                    "handlers": ["console"],
                    "level": level,
                    "propagate": False,
                },
                "uvicorn.access": {
                    "handlers": ["access_console"],
                    "level": "INFO",
                    "propagate": False,
                },
                "fastapi": {
                    "handlers": ["console"],
                    "level": level,
                    "propagate": False,
                },
                "sqlalchemy.engine": {
                    "handlers": ["console"],
                    "level": sqlalchemy_level,
                    "propagate": False,
                },
                "app.errors": {
                    "handlers": ["console"],
                    "level": level,
                    "propagate": False,
                },
                "tasks.training": {
                    "handlers": ["console"],
                    "level": level,
                    "propagate": False,
                },
                "tasks.inspection": {
                    "handlers": ["console"],
                    "level": level,
                    "propagate": False,
                },
                "procrastinate": {
                    "handlers": ["console"],
                    "level": level,
                    "propagate": False,
                },
            },
        }
    )
