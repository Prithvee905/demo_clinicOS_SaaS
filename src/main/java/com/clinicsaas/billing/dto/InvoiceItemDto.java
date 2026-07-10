package com.clinicsaas.billing.dto;

import java.math.BigDecimal;

public class InvoiceItemDto {

    private String itemName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal tax;
    private BigDecimal totalPrice;

    public InvoiceItemDto() {}

    public InvoiceItemDto(String itemName, Integer quantity, BigDecimal unitPrice, BigDecimal tax, BigDecimal totalPrice) {
        this.itemName = itemName;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.tax = tax;
        this.totalPrice = totalPrice;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getTax() {
        return tax;
    }

    public void setTax(BigDecimal tax) {
        this.tax = tax;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }
}
