"""Response envelope helpers — enforce the {status, message, data} shape."""

from typing import Any


def ok(*, data: Any = None, message: str = "OK") -> dict[str, Any]:
    """Successful response envelope."""
    return {"status": "success", "message": message, "data": data}


def fail(*, message: str = "Error", data: Any = None) -> dict[str, Any]:
    """Failure response envelope. data may carry validation details."""
    return {"status": "failure", "message": message, "data": data}
