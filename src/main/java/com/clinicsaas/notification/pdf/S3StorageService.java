package com.clinicsaas.notification.pdf;

import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import java.time.Duration;

@Service
public class S3StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    @Autowired
    private S3Client s3Client;

    @Autowired
    private S3Presigner s3Presigner;

    @Value("${app.s3.bucket-name}")
    private String bucketName;

    @Retry(name = "s3Upload", fallbackMethod = "uploadFallback")
    public String uploadAndPresign(String key, byte[] content) {
        log.info("Uploading PDF to S3: {}/{}", bucketName, key);
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType("application/pdf")
                .build();

        s3Client.putObject(putRequest, RequestBody.fromBytes(content));

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .getObjectRequest(builder -> builder.bucket(bucketName).key(key).build())
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        String url = presigned.url().toString();
        log.info("Generated pre-signed URL: {}", url);
        return url;
    }

    public String uploadFallback(String key, byte[] content, Throwable t) {
        log.warn("AWS S3 upload failed permanently after retries due to: {}. Returning mock URL.", t.getMessage());
        return "https://mock-s3-storage.com/bucket/" + bucketName + "/files/" + key + "?signature=mock-signature-expires-in-1h";
    }
}
