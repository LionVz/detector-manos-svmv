package com.detector.gateway.service;

import com.detector.gateway.dto.InferenceResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class PythonInferenceClient {

    private final WebClient webClient;

    public PythonInferenceClient(
            WebClient.Builder webClientBuilder,
            @Value("${python.inference.base-url}") String pythonBaseUrl
    ) {
        this.webClient = webClientBuilder.baseUrl(pythonBaseUrl).build();
    }

    public InferenceResponse predict(MultipartFile image, String imageUrl) {
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

        if (image != null && !image.isEmpty()) {
            try {
                bodyBuilder.part("image", new NamedByteArrayResource(image.getBytes(), image.getOriginalFilename()))
                        .contentType(MediaType.parseMediaType(
                                image.getContentType() != null ? image.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE
                        ));
            } catch (Exception ex) {
                throw new IllegalStateException("No se pudo leer la imagen enviada.", ex);
            }
        }

        if (imageUrl != null && !imageUrl.isBlank()) {
            bodyBuilder.part("image_url", imageUrl);
        }

        return webClient.post()
                .uri("/api/v1/inference/predict")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .bodyValue(bodyBuilder.build())
                .retrieve()
                .bodyToMono(InferenceResponse.class)
                .block();
    }

    private static final class NamedByteArrayResource extends ByteArrayResource {
        private final String filename;

        private NamedByteArrayResource(byte[] byteArray, String filename) {
            super(byteArray);
            this.filename = filename != null ? filename : "image";
        }

        @Override
        public String getFilename() {
            return filename;
        }
    }
}
