import requests

SERVER_URL = "http://localhost:3000"

def login_and_upload(username, password, zip_path):
    with open(zip_path, 'rb') as file:
        response = requests.post(
            f"{SERVER_URL}/upload",
            files={"file": file},
            data={"username": username, "password": password}
        )
    return response.status_code == 200
