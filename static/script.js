// Elementos del DOM
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewImage = document.getElementById('previewImage');
const previewSection = document.getElementById('previewSection');
const clearButton = document.getElementById('clearButton');
const predictButton = document.getElementById('predictButton');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const buttonText = document.getElementById('buttonText');
const spinner = document.getElementById('spinner');

// Elementos de Feedback
const feedbackSection = document.getElementById('feedbackSection');
const btnCorrect = document.getElementById('btnCorrect');
const btnIncorrect = document.getElementById('btnIncorrect');
const correctionContainer = document.getElementById('correctionContainer');
const manualLabelInput = document.getElementById('manualLabelInput');
const btnSubmitCorrection = document.getElementById('btnSubmitCorrection');
const feedbackMessage = document.getElementById('feedbackMessage');

// Elementos Sidebar
const btnShowInstructions = document.getElementById('btnShowInstructions');
const btnShowStats = document.getElementById('btnShowStats');
const instructionsContent = document.getElementById('instructionsContent');
const statsContent = document.getElementById('statsContent');
const statCount = document.getElementById('statCount');
const statConfidence = document.getElementById('statConfidence');

let selectedFile = null;
let processedCount = 0;

// Drag & drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) handleFileSelect(files[0]);
});

uploadArea.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
});

// Validación + preview
function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    showError('Por favor selecciona una imagen válida (JPG, PNG, etc.)');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showError('La imagen debe ser menor a 5MB');
    return;
  }

  selectedFile = file;
  displayPreview(file);
  hideError();
  predictButton.disabled = false;
}

function displayPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    previewSection.style.display = 'block';
    resultSection.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// Limpiar
clearButton.addEventListener('click', () => {
  selectedFile = null;
  imageInput.value = '';
  previewSection.style.display = 'none';
  resultSection.style.display = 'none';
  errorSection.style.display = 'none';
  resetFeedback();
  predictButton.disabled = true;
});

// Predict
predictButton.addEventListener('click', async () => {
  if (!selectedFile) {
    showError('Por favor selecciona una imagen');
    return;
  }

  setLoadingState(true);
  hideError();

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);

    const response = await fetch('/predict', { method: 'POST', body: formData });
    const result = await response.json();

    //  Si backend devolvió error
    if (!response.ok) {
      showError(result.error || 'Error en la predicción');
      return;
    }
    if (result.error) {
      showError(result.error);
      return;
    }

    // Caso "No seguro"
   if (result.classification === "No seguro") {
  displayResult({
    classification: "No seguro",
    confidence: result.confidence || 0,
  });
  // y aparte muestra el mensaje dentro de detalles:
  const resultDetails = document.getElementById('resultDetails');
  resultDetails.innerHTML += `<p><strong>Nota:</strong> ${result.message || "Intenta con mejor luz."}</p>`;
  return;
}


    displayResult(result);

  } catch (error) {
    console.error('Error:', error);
    showError('Error al procesar la imagen. Intenta de nuevo.');
  } finally {
    setLoadingState(false);
  }
});

// Render de resultado
function displayResult(result) {
  const confidence = Math.round(result.confidence * 100);

  const confidenceLevel = document.getElementById('confidenceLevel');
  confidenceLevel.style.width = confidence + '%';
  confidenceLevel.textContent = confidence + '%';

  const resultText = document.getElementById('resultText');
  resultText.textContent = `Mano: ${result.classification}`;

  processedCount++;
  if (statCount) statCount.textContent = processedCount;
  if (statConfidence) statConfidence.textContent = confidence + '%';

  const resultDetails = document.getElementById('resultDetails');
  resultDetails.innerHTML = `
    <p><strong>Clasificación:</strong> ${result.classification}</p>
    <p><strong>Confianza:</strong> ${confidence}%</p>
    <p><strong>Archivo:</strong> ${selectedFile.name}</p>
    <p><strong>Procesado:</strong> ${new Date().toLocaleTimeString('es-ES')}</p>
  `;

  resultSection.style.display = 'block';
  resetFeedback();
  feedbackSection.style.display = 'block';
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

// Errores
function showError(message) {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorSection.style.display = 'block';
  resultSection.style.display = 'none';
}

function hideError() {
  errorSection.style.display = 'none';
}

// Loading
function setLoadingState(isLoading) {
  predictButton.disabled = isLoading;
  if (isLoading) {
    buttonText.textContent = 'Procesando...';
    spinner.style.display = 'inline-block';
  } else {
    buttonText.textContent = 'Realizar Predicción';
    spinner.style.display = 'none';
  }
}

// Feedback (igual que tú)
function resetFeedback() {
  feedbackSection.style.display = 'none';
  correctionContainer.style.display = 'none';
  feedbackMessage.style.display = 'none';
  feedbackMessage.textContent = '';
  manualLabelInput.value = '';
  btnCorrect.disabled = false;
  btnIncorrect.disabled = false;
}

btnCorrect.addEventListener('click', () => handleFeedback(true));
btnIncorrect.addEventListener('click', () => {
  correctionContainer.style.display = 'flex';
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;
  manualLabelInput.focus();
});

btnSubmitCorrection.addEventListener('click', () => {
  const manualLabel = manualLabelInput.value.trim();
  if (manualLabel) handleFeedback(false, manualLabel);
  else alert('Por favor ingresa la clasificación correcta');
});

async function handleFeedback(isCorrect, manualLabel = null) {
  console.log('Feedback enviado:', {
    isCorrect, manualLabel, file: selectedFile ? selectedFile.name : 'unknown'
  });

  correctionContainer.style.display = 'none';
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;

  feedbackMessage.textContent = '¡Gracias por tu retroalimentación!';
  feedbackMessage.style.display = 'block';
}

// Sidebar tabs
document.addEventListener('DOMContentLoaded', () => {
  predictButton.disabled = true;

  if (btnShowInstructions && btnShowStats) {
    btnShowInstructions.addEventListener('click', () => {
      instructionsContent.style.display = 'block';
      statsContent.style.display = 'none';
      btnShowInstructions.classList.add('active');
      btnShowStats.classList.remove('active');
    });

    btnShowStats.addEventListener('click', () => {
      instructionsContent.style.display = 'none';
      statsContent.style.display = 'block';
      btnShowInstructions.classList.remove('active');
      btnShowStats.classList.add('active');
    });
  }
});
