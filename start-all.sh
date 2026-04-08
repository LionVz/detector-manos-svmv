#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_DIR="$ROOT_DIR/backend/src/main/python-service"
SPRING_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

find_command() {
  for candidate in "$@"; do
    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

start_service() {
  local name="$1"
  local working_dir="$2"
  local command_line="$3"

  (
    cd "$working_dir"
    echo "[$name] iniciando..."
    eval "$command_line"
  ) &
}

PYTHON_EXE="$(find_command python3 python py || true)"
NPM_EXE="$(find_command npm || true)"

if [[ -x "$SPRING_DIR/mvnw" ]]; then
  MAVEN_EXE="$SPRING_DIR/mvnw"
else
  MAVEN_EXE="$(find_command mvn || true)"
fi

missing=()
[[ -z "$PYTHON_EXE" ]] && missing+=("Python (python3 o python)")
[[ -z "$MAVEN_EXE" ]] && missing+=("Maven (mvn o ./mvnw)")
[[ -z "$NPM_EXE" ]] && missing+=("npm")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo
  echo "Faltan herramientas para iniciar todo:"
  for item in "${missing[@]}"; do
    echo "- $item"
  done
  echo
  echo "Cuando esten instaladas, ejecuta de nuevo:"
  echo "./start-all.sh"
  exit 1
fi

[[ -f "$PYTHON_DIR/app.py" ]] || { echo "No se encontro backend/src/main/python-service/app.py"; exit 1; }
[[ -f "$SPRING_DIR/pom.xml" ]] || { echo "No se encontro backend/pom.xml"; exit 1; }
[[ -f "$FRONTEND_DIR/package.json" ]] || { echo "No se encontro frontend/package.json"; exit 1; }

echo "Levantando servicios..."

start_service "Python Service" "$PYTHON_DIR" "\"$PYTHON_EXE\" app.py"
start_service "Spring Boot" "$SPRING_DIR" "\"$MAVEN_EXE\" spring-boot:run"
start_service "Angular Frontend" "$FRONTEND_DIR" "\"$NPM_EXE\" start"

echo
echo "Servicios lanzados en segundo plano:"
echo "- Python: http://localhost:5000"
echo "- Spring Boot: http://localhost:8080"
echo "- Angular: http://localhost:4200"
echo
echo "Para ver logs, deja esta terminal abierta."

wait
