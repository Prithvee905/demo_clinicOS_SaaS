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
ENV JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseG1GC -XX:TieredStopAtLevel=1 -Dspring.main.lazy-initialization=true"
EXPOSE 10000

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT} -Djava.security.egd=file:/dev/./urandom -jar app.jar"]
