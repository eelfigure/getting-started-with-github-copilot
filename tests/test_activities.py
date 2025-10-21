from fastapi.testclient import TestClient
import pytest

from src.app import app

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Expect some known activity keys
    assert "Chess Club" in data


def test_signup_and_remove_participant():
    activity = "Chess Club"
    email = "teststudent@example.com"

    # Ensure email not already present by checking the API and removing if needed
    resp0 = client.get("/activities")
    assert resp0.status_code == 200
    data0 = resp0.json()
    if email in data0[activity]["participants"]:
        del_resp = client.delete(f"/activities/{activity}/participants/{email}")
        # allow either 200 or 404 if concurrent
        assert del_resp.status_code in (200, 404)

    # Signup
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200

    # Verify via GET
    resp_after = client.get("/activities")
    assert resp_after.status_code == 200
    data_after = resp_after.json()
    assert email in data_after[activity]["participants"]

    # Duplicate signup should fail
    resp2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp2.status_code == 400

    # Remove participant
    resp3 = client.delete(f"/activities/{activity}/participants/{email}")
    assert resp3.status_code == 200

    # Verify removal via GET
    resp_final = client.get("/activities")
    data_final = resp_final.json()
    assert email not in data_final[activity]["participants"]


def test_remove_nonexistent_participant():
    activity = "Programming Class"
    email = "nonexistent@example.com"

    # Ensure it's not present
    resp0 = client.get("/activities")
    assert resp0.status_code == 200
    data0 = resp0.json()
    if email in data0[activity]["participants"]:
        # remove it first
        client.delete(f"/activities/{activity}/participants/{email}")

    resp = client.delete(f"/activities/{activity}/participants/{email}")
    assert resp.status_code == 404