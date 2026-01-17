from flask import Flask, render_template, request, jsonify
import os
import uuid
import pickle
import cv2
import numpy as np
from skimage.feature import hog

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# Cargar tu modelo .p
with open("modelo_manos_svm.p", "rb") as f:
    modelo = pickle.load(f)

# Preprocesamiento EXACTO (como entrenaste)
def extract_features(image_path: str) -> np.ndarray:
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("No se pudo leer la imagen. Usa JPG/PNG/WEBP/BMP.")

    img = cv2.resize(img, (128, 128))   
    img = img.astype(np.float32) / 255.0

    feat = hog(
        img,
        orientations=16,
        pixels_per_cell=(5, 5),
        cells_per_block=(2, 2),
        block_norm="L2-Hys"
    )
    return feat

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No se envió el archivo (campo 'image')."}), 400

    file = request.files["image"]
    if not file or file.filename.strip() == "":
        return jsonify({"error": "No seleccionaste ningún archivo."}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
        return jsonify({"error": "Formato no soportado. Usa JPG/PNG/WEBP/BMP."}), 400

    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(path)

    try:
        feat = extract_features(path)

        # ✅ Si el modelo tiene probas, úsalo (mejor)
        if hasattr(modelo, "predict_proba"):
            proba = modelo.predict_proba([feat])[0]
            idx = int(np.argmax(proba))
            conf = float(np.max(proba))
            pred_class = int(modelo.classes_[idx])

        else:
            # ✅ fallback: decision_function -> prob aproximada
            decision = float(modelo.decision_function([feat])[0])
            pred_class = int(modelo.predict([feat])[0])
            conf = float(1.0 / (1.0 + np.exp(-abs(decision))))  # 0..1

        # ✅ Mapeo correcto según tu entrenamiento
        # 0 = ManoAbierta, 1 = ManoCerrada
        classification = "Abierta" if pred_class == 0 else "Cerrada"

        # Umbral (ajústalo según tus pruebas)
        threshold = 0.60
        if conf < threshold:
            return jsonify({
                "classification": "No seguro",
                "confidence": conf,
                "message": "Toma otra foto con mejor luz y fondo simple."
            })

        return jsonify({
            "classification": classification,
            "confidence": conf
        })

    except Exception as e:
        print("ERROR EN /predict:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
