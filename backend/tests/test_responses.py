"""Tests for app.responses envelope helpers."""

from app.responses import ok, fail


def test_ok_default_message() -> None:
    result = ok()
    assert result == {"status": "success", "message": "OK", "data": None}


def test_ok_with_data() -> None:
    result = ok(data={"id": "abc", "name": "Bob"})
    assert result == {"status": "success", "message": "OK", "data": {"id": "abc", "name": "Bob"}}


def test_ok_with_custom_message_and_data() -> None:
    result = ok(data=[1, 2, 3], message="Created")
    assert result == {"status": "success", "message": "Created", "data": [1, 2, 3]}


def test_fail_default_message() -> None:
    result = fail()
    assert result == {"status": "failure", "message": "Error", "data": None}


def test_fail_with_message() -> None:
    result = fail(message="Project not found")
    assert result == {"status": "failure", "message": "Project not found", "data": None}


def test_fail_with_data() -> None:
    """Failures may include error details in data."""
    result = fail(message="Validation failed", data={"field": "email", "issue": "invalid format"})
    assert result == {
        "status": "failure",
        "message": "Validation failed",
        "data": {"field": "email", "issue": "invalid format"},
    }
