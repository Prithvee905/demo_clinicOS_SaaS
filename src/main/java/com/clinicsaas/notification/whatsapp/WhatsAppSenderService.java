package com.clinicsaas.notification.whatsapp;

import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WhatsAppSenderService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppSenderService.class);

    private final RestClient restClient = RestClient.create();

    @Value("${app.whatsapp.phone-number-id}")
    private String phoneNumberId;

    @Value("${app.whatsapp.api-token}")
    private String apiToken;

    @Value("${app.whatsapp.template-name}")
    private String templateName;

    @Retry(name = "whatsappApi")
    public void sendInvoiceNotification(String patientPhone, String patientName, String invoiceNumber, String presignedUrl) {
        log.info("Attempting to send WhatsApp notification to {}. Invoice: {}", patientPhone, invoiceNumber);

        if ("mock-token".equals(apiToken) || "test-api-token".equals(apiToken) || apiToken.isBlank()) {
            log.info("[MOCK WHATSAPP] To: {}, Template: {}, Header Document Link: {}, Body Params: [Name: {}, Invoice: {}]", 
                    patientPhone, templateName, presignedUrl, patientName, invoiceNumber);
            return;
        }

        String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";

        Map<String, Object> payload = new HashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("to", patientPhone);
        payload.put("type", "template");

        Map<String, Object> template = new HashMap<>();
        template.put("name", templateName);
        
        Map<String, String> language = new HashMap<>();
        language.put("code", "en_US");
        template.put("language", language);

        Map<String, Object> headerDoc = new HashMap<>();
        headerDoc.put("type", "document");
        Map<String, String> docDetails = new HashMap<>();
        docDetails.put("link", presignedUrl);
        docDetails.put("filename", "Invoice-" + invoiceNumber + ".pdf");
        headerDoc.put("document", docDetails);

        Map<String, Object> bodyParam1 = new HashMap<>();
        bodyParam1.put("type", "text");
        bodyParam1.put("text", patientName);

        Map<String, Object> bodyParam2 = new HashMap<>();
        bodyParam2.put("type", "text");
        bodyParam2.put("text", invoiceNumber);

        Map<String, Object> headerComponent = new HashMap<>();
        headerComponent.put("type", "header");
        headerComponent.put("parameters", List.of(headerDoc));

        Map<String, Object> bodyComponent = new HashMap<>();
        bodyComponent.put("type", "body");
        bodyComponent.put("parameters", List.of(bodyParam1, bodyParam2));

        template.put("components", List.of(headerComponent, bodyComponent));
        payload.put("template", template);

        restClient.post()
                .uri(url)
                .headers(headers -> {
                    headers.setBearerAuth(apiToken);
                    headers.setContentType(MediaType.APPLICATION_JSON);
                })
                .body(payload)
                .retrieve()
                .toBodilessEntity();

        log.info("WhatsApp notification successfully delivered to API for {}", patientPhone);
    }
}
