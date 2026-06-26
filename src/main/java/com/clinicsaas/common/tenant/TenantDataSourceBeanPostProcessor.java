package com.clinicsaas.common.tenant;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;

@Component
public class TenantDataSourceBeanPostProcessor implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof DataSource && !(bean instanceof TenantAwareDataSource)) {
            return new TenantAwareDataSource((DataSource) bean);
        }
        return bean;
    }
}
