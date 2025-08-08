import json
import os

USER_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "users.json")

def validate_user(username, password):
    try:
        with open(USER_FILE, "r") as f:
            users = json.load(f)
        return users.get(username) == password
    except:
        return False
