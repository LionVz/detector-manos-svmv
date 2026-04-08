from flask import Flask, render_template, request, jsonify
import os
import uuid
import pickle
import cv2
import numpy as np
import urllib.request
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# Cargar el modelo MobileNet .p
with open("mobilenet_manos_model.p", "rb") as f:
    modelo = pickle.load(f)

# Inicializar un dummy predict para forzar la carga del grafo en el hilo principal
try:
    _ = modelo.predict(np.zeros((1, 224, 224, 3)))
except Exception as e:
    print("Dummy predict failed, no problem:", e)


# Preprocesamiento EXACTO para MobileNet
def extract_features(image_path: str) -> np.ndarray:
    # 1. Leer imagen en color BGR
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("No se pudo leer la imagen. Usa JPG/PNG/WEBP/BMP.")

    # 2. Convertir BGR a RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # 3. Redimensionar a (224, 224) para MobileNet
    img = cv2.resize(img, (224, 224))

    # 4. Preprocesamiento específico de MobileNetV2 (-1 a 1)
    img_array = np.expand_dims(img, axis=0)  # Shape: (1, 224, 224, 3)
    img_preprocessed = preprocess_input(img_array)

    return img_preprocessed


def save_incoming_image() -> str:
    # 1. Comprobar si se envió una URL
    if "image_url" in request.form and request.form["image_url"].strip() != "":
        image_url = request.form["image_url"].strip()
        try:
            # Añadir headers para simular un navegador real y evitar errores 403 Forbidden
            req = urllib.request.Request(
                image_url,
                data=None,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
            )

            # Obtener extensión de la URL o usar .jpg por defecto
            ext = os.path.splitext(image_url)[1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
                ext = ".jpg"  # Asumir jpg si no tiene extensión clara en la url

            filename = f"{uuid.uuid4().hex}{ext}"
            path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

            with urllib.request.urlopen(req, timeout=10) as response, open(path, "wb") as out_file:
                data = response.read()
                out_file.write(data)

            return path

        except Exception as e:
            print("ERROR DESCARGANDO URL:", e)
            raise ValueError("No se pudo descargar la imagen desde la URL proporcionada.") from e

    # 2. Comprobar si se envió un archivo local
    if "image" in request.files and request.files["image"].filename.strip() != "":
        file = request.files["image"]
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            raise ValueError("Formato no soportado. Usa JPG/PNG/WEBP/BMP.")

        filename = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(path)
        return path

    raise ValueError("No se envió ninguna imagen ni URL.")


def predict_from_path(path: str):
    img_preprocessed = extract_features(path)

    # Hacer predicción con Keras
    proba = modelo.predict(img_preprocessed)[0]  # Shape: (2,)

    # Obtener clase con mayor probabilidad
    idx = int(np.argmax(proba))
    conf = float(np.max(proba))

    # ✅ Mapeo correcto asumiendo que el output 0 es ManoAbierta y 1 es ManoCerrada
    classification = "Abierta" if idx == 0 else "Cerrada"

    # Umbral (ajústalo según tus pruebas)
    threshold = 0.60
    if conf < threshold:
        return {
            "classification": "No seguro",
            "confidence": conf,
            "message": "Toma otra foto con mejor luz y fondo simple.",
        }

    return {"classification": classification, "confidence": conf}


@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "python-inference"}), 200


@app.route("/predict", methods=["POST"])
@app.route("/api/v1/inference/predict", methods=["POST"])
def predict():
    try:
        path = save_incoming_image()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = predict_from_path(path)
        return jsonify(result)
    except Exception as e:
        print("ERROR EN /predict:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
