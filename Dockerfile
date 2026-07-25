# Stage 1: Build the Maven application
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the packaged jar
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/clinic-saas-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=10000
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 10000

# JVM flags tuned for Render free tier (512MB RAM):
# -Xms64m  : start heap at 64MB (don't pre-allocate)
# -Xmx350m : cap heap at 350MB (leaves room for OS + metaspace)
# -XX:+UseG1GC : G1 garbage collector is efficient on low memory
# -XX:MaxMetaspaceSize=128m : cap metaspace so total stays under 512MB
# -XX:+ExitOnOutOfMemoryError : crash fast so Render can restart cleanly
ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Xms64m", \
  "-Xmx350m", \
  "-XX:+UseG1GC", \
  "-XX:MaxMetaspaceSize=128m", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-Dspring.profiles.active=prod", \
  "-jar", "app.jar"]

