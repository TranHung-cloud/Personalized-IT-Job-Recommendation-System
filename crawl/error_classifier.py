"""Shared error types and classification helpers for job crawlers."""

import json
import socket

import requests


class CrawlerError(Exception):
    """Base class that keeps the exception that caused the classification."""

    def __init__(self, message=None, *, original_error=None):
        self.original_error = original_error
        detail = message or str(original_error) if original_error else message
        super().__init__(detail or self.__class__.__name__)


class JobNotFoundError(CrawlerError):
    pass


class NetworkError(CrawlerError):
    pass


class ServerError(CrawlerError):
    pass


class RateLimitError(CrawlerError):
    pass


class AccessDeniedError(CrawlerError):
    pass


class ParserError(CrawlerError):
    pass


class BrowserError(CrawlerError):
    pass


class DatabaseError(CrawlerError):
    pass


class UnknownError(CrawlerError):
    pass


class HTTPStatusError(Exception):
    """Status failure created when a browser response has no raise_for_status."""

    def __init__(self, status_code, url=None):
        self.status_code = status_code
        self.url = url
        super().__init__(f"HTTP {status_code}" + (f" for {url}" if url else ""))


def _http_error_type(status_code):
    if status_code in (404, 410):
        return JobNotFoundError
    if status_code == 429:
        return RateLimitError
    if status_code in (401, 403):
        return AccessDeniedError
    if status_code is not None and 500 <= status_code <= 599:
        return ServerError
    return None


def classify_error(exc):
    """Return a categorized error, retaining ``exc`` as its cause."""
    if isinstance(exc, CrawlerError):
        return exc

    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    error_type = _http_error_type(status_code)
    if error_type:
        return error_type(str(exc), original_error=exc)

    if (exc.__class__.__name__ == "TimeoutError" and
            exc.__class__.__module__.startswith("playwright")):
        return NetworkError(str(exc), original_error=exc)
    if isinstance(exc, (requests.Timeout, TimeoutError, socket.gaierror,
                        ConnectionResetError, requests.ConnectionError)):
        return NetworkError(str(exc), original_error=exc)

    if isinstance(exc, json.JSONDecodeError):
        return ParserError(str(exc), original_error=exc)

    # Avoid requiring psycopg or Playwright just to import this module.
    module = exc.__class__.__module__
    message = str(exc).lower()
    network_markers = (
        "err_name_not_resolved",
        "err_connection_reset",
        "err_connection_refused",
        "err_timed_out",
        "name or service not known",
        "temporary failure in name resolution",
    )
    if module.startswith("playwright") and any(
        marker in message for marker in network_markers
    ):
        return NetworkError(str(exc), original_error=exc)
    if module.startswith("psycopg"):
        return DatabaseError(str(exc), original_error=exc)
    if module.startswith("playwright"):
        return BrowserError(str(exc), original_error=exc)

    return UnknownError(str(exc), original_error=exc)


def raise_for_http_status(response):
    """Raise the crawler error matching a non-success browser response."""
    if response is None:
        return
    status_code = getattr(response, "status", None)
    error_type = _http_error_type(status_code)
    if error_type:
        original_error = HTTPStatusError(status_code, getattr(response, "url", None))
        raise error_type(str(original_error), original_error=original_error) from original_error
