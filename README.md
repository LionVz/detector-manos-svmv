Acceso desde el terminal con el archivo .pem
ssh -i "ResearchLeonardo.pem" ubuntu@13.220.13.227

Comandos ya dentro de la instancia:
# 1. Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias del sistema
sudo apt install git python3 python3-pip python3-venv -y

# 3. Clonar el repositorio
git clone https://github.com/LionVz/detector-manos-svmv.git

# 4. Entrar al proyecto
cd detector-manos-svmv

# 5. Crear entorno virtual
python3 -m venv venv

# 6. Activar entorno virtual
source venv/bin/activate

# 7. Instalar dependencias Python
pip install flask flask-cors opencv-python-headless numpy tensorflow scikit-learn

# 8. Correr la app
python app.py

# 9. Instalar gunicorn
pip install gunicorn

# 10. Correr con gunicorn en segundo plano
gunicorn -w 4 -b 0.0.0.0:5000 app:app --daemon


URL
http://34.239.175.87:5000/
