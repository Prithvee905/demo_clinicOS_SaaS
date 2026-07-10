package com.clinicsaas.dashboard.dto;

public class DashboardMetricsDto {
    private long totalPatients;
    private long totalDoctors;
    private long activePrescriptions;
    private long invoicesGenerated;
    private long invoicesSent;

    public DashboardMetricsDto() {}

    public DashboardMetricsDto(long totalPatients, long totalDoctors, long activePrescriptions, long invoicesGenerated, long invoicesSent) {
        this.totalPatients = totalPatients;
        this.totalDoctors = totalDoctors;
        this.activePrescriptions = activePrescriptions;
        this.invoicesGenerated = invoicesGenerated;
        this.invoicesSent = invoicesSent;
    }

    public long getTotalPatients() {
        return totalPatients;
    }

    public void setTotalPatients(long totalPatients) {
        this.totalPatients = totalPatients;
    }

    public long getTotalDoctors() {
        return totalDoctors;
    }

    public void setTotalDoctors(long totalDoctors) {
        this.totalDoctors = totalDoctors;
    }

    public long getActivePrescriptions() {
        return activePrescriptions;
    }

    public void setActivePrescriptions(long activePrescriptions) {
        this.activePrescriptions = activePrescriptions;
    }

    public long getInvoicesGenerated() {
        return invoicesGenerated;
    }

    public void setInvoicesGenerated(long invoicesGenerated) {
        this.invoicesGenerated = invoicesGenerated;
    }

    public long getInvoicesSent() {
        return invoicesSent;
    }

    public void setInvoicesSent(long invoicesSent) {
        this.invoicesSent = invoicesSent;
    }
}
