import os
from flask import Flask, flash, request, Response, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
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
    serialized_json = json.dumps(data, ident=4)
    with open(upload_directory+filename+".json", "w") as outfile:
        outfile.write(serialized_json)
    return Response(status=200)

if __name__ == "__main__":
    app.run(debug=True, ssl_context="adhoc", threaded=True)