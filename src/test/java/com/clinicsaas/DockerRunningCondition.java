package com.clinicsaas;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;

public class DockerRunningCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        boolean dockerRunning = false;
        try {
            dockerRunning = org.testcontainers.DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            // Testcontainers not on classpath or failed to load
        }

        if (dockerRunning) {
            return ConditionEvaluationResult.enabled("Docker daemon is running and available to Testcontainers. Proceeding.");
        } else {
            return ConditionEvaluationResult.disabled("Docker daemon is NOT running, not installed, or not accessible to Testcontainers. Skipping Testcontainers integration tests.");
        }
    }
}
