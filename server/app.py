import os
from flask import Flask, flash, request, redirect, url_for, Response
from flask.templating import render_template
from werkzeug.utils import secure_filename

app = Flask(__name__, static_url_path="/static")
UPLOAD_FOLDER = "./collected_data"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024

@app.route("/", methods=["GET"])
def home():
    render_template("./templates/index.html")

@app.route("/upload_file", methods=["POST"])
def upload_file():
    # check if the post request has the file part
    if "file" not in request.files:
        flash("No file part")
        return Response(status=400)
    file = request.files["file"]
    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == "":
        flash("No selected file")
        return Response(status=400)
    if file:
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
        return Response(status=200)

if __name__ == "__main__":
    app.run(debug=True)