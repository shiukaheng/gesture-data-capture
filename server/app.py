import os
from flask import Flask, request, Response, request, send_from_directory, send_file
from flask_cors import CORS
import time
import json

app = Flask(__name__, static_url_path="/static")
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024
upload_directory = "./collected_data/"

@app.route("/upload", methods=["POST"])
def upload():
    data = request.json
    data["ip"] = request.remote_addr
    data["time_received_ns"] = time.time_ns()
    suffix = ""
    suffix_number = 0
    filename = f"{data['ip']}-{data['time_received_ns']}{suffix}"
    while os.path.isfile(upload_directory+filename):
        suffix_number += 1
        suffix = f"-{suffix_number}"
        filename = f"{data['ip']}-{data['time_received_ns']}{suffix}"
    serialized_json = json.dumps(data)
    with open(upload_directory+filename+".json", "w") as outfile:
        outfile.write(serialized_json)
    return Response(status=200)

@app.route("/")
def home():
    return send_file("../client/dist/index.html")

@app.route('/<path:path>')
def fetch_file(path):
    print(path)
    return send_from_directory('../client/dist', path)

if __name__ == "__main__":
    app.run(ssl_context="adhoc", threaded=True, host="0.0.0.0")