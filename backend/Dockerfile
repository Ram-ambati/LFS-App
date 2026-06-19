# Stage 1: Build stage
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app

# Copy pom.xml and download dependencies to leverage Docker cache
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build the application
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring

# Create uploads directory and give ownership to spring user
RUN mkdir -p uploads && chown -R spring:spring uploads

USER spring:spring

# Copy built jar from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose port and configure entrypoint
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
