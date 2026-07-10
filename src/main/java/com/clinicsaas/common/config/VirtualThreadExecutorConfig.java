package com.clinicsaas.common.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Configuration
public class VirtualThreadExecutorConfig {

    @Autowired
    private Environment environment;

    @Bean(name = "virtualThreadExecutor")
    public ExecutorService virtualThreadExecutor() {
        boolean isTest = Arrays.asList(environment.getActiveProfiles()).contains("test");
        if (isTest) {
            return new AbstractExecutorService() {
                private volatile boolean shutdown = false;

                @Override
                public void shutdown() {
                    this.shutdown = true;
                }

                @Override
                public List<Runnable> shutdownNow() {
                    this.shutdown = true;
                    return Collections.emptyList();
                }

                @Override
                public boolean isShutdown() {
                    return this.shutdown;
                }

                @Override
                public boolean isTerminated() {
                    return this.shutdown;
                }

                @Override
                public boolean awaitTermination(long timeout, TimeUnit unit) {
                    return true;
                }

                @Override
                public void execute(Runnable command) {
                    command.run();
                }
            };
        }
        // Fallback to a standard cached thread pool for Java 17 compatibility
        return Executors.newCachedThreadPool();
    }
}
