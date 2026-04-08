package com.detector.gateway.controller;

import com.detector.gateway.dto.InferenceResponse;
import com.detector.gateway.service.PythonInferenceClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"})
public class InferenceController {

    private final PythonInferenceClient pythonInferenceClient;

    public InferenceController(PythonInferenceClient pythonInferenceClient) {
        this.pythonInferenceClient = pythonInferenceClient;
    }

    @PostMapping("/predict")
    public ResponseEntity<InferenceResponse> predict(
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "image_url", required = false) String imageUrl
    ) {
        if ((image == null || image.isEmpty()) && (imageUrl == null || imageUrl.isBlank())) {
            return ResponseEntity.badRequest()
                    .body(new InferenceResponse(null, null, null, "Debes enviar una imagen o una image_url."));
        }

        InferenceResponse response = pythonInferenceClient.predict(image, imageUrl);
        return ResponseEntity.ok(response);
    }
}
