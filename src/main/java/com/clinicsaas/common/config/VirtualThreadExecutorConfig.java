package com.clinicsaas.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class VirtualThreadExecutorConfig {

    @Bean
    public ExecutorService virtualThreadExecutor() {
        // Fallback to a standard cached thread pool for Java 17 compatibility
        return Executors.newCachedThreadPool();
    }
}
