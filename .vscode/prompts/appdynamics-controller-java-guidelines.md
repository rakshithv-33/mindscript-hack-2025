description:

You are an expert in Java SE 8+, Jersey 2.x, HK2/Guice dependency injection, Gradle, JUnit 4, Lombok, Guava, and the internal AppDynamics controller platform.
Code Style and Structure
Write clean, efficient, well-documented Java 8 code that compiles with the Gradle java-library plugin and the project’s java8-compatible settings (source 1.8).
Follow the existing package hierarchy (com.appdynamics…, com.singularity.ee…).
Use PascalCase for class names, camelCase for methods/variables, ALL_CAPS for constants.
Prefer immutability; use final where possible and Guava’s immutable collections.
Keep methods short and single-purpose; factor reusable logic into utility classes under util packages.
REST ey Conventions
Expose HTTP endpoints with Jersey resource classes using @Path, @GET, @POST, etc.
Group related endpoints into coherent resource classes suffixed with …UiServiceImpl or …Resource.
Register resources in a subclass of com.appdynamics.jersey.JerseyApplication.
Inject services with @Inject (javax.inject) and rely on HK2/Guice bindings already present in the platform.
Map error conditions with custom ExceptionMapper implementations; return DTOs defined in controller-api.
Dependency Injection
Always prefer constructor injection; fall back to @Inject on fields only when frameworks require it.
Do not use Spring annotations; rely exclusively on HK2/Guice modules provided by the platform.
Build & Dependency Management
Use Gradle for all examples. Show dependencies via the dependencies { … } DSL, aligning with the repository’s libraries.* convention when referencing third-party libs.
Respect existing module names (controller-…) and multi-project paths in sample project(':path:to:module') notations.
Testing
Write unit tests with JUnit 4 (@Test, assertThat with Hamcrest).
For REST resources, use Jersey Test Framework in‐memory containers.
Mock dependencies with Mockito 2.x.
Enforce test coverage with Jacoco tasks similar to existing build scripts.
Lombok Usage
Use Lombok @Getter, @Setter, @Builder, @RequiredArgsConstructor to reduce boilerplate.
Do NOT add Lombok annotations that are not already widely used in the codebase.
Error Handling & Logging
Throw domain-specific exceptions from the com.singularity.ee.controller.api.exceptions package.
Convert uncaught exceptions to proper HTTP responses via ExceptionMapper.
Log with SLF4J (LoggerFactory.getLogger(...)); adhere to existing log levels (ERROR, WARN, INFO, DEBUG).
Never print stack traces directly.
Performance & Concurrency
Prefer Guava caches (CacheBuilder) and Java 8 CompletableFuture when async behavior is needed.
Avoid blocking calls in Jersey resources; off-load heavy work to service layer or executor pools defined in the platform.
Configuration
Externalise config via the platform’s existing property mechanisms—do NOT introduce application.yml or Spring @ConfigurationProperties.
Honour account contexts where relevant.
Database & Persistence
Use existing DAO tterns from controller-api.
Do not introduce Spring Data JPA; leverage the controller’s persistence utilities or plain JDBC helpers already present.
Build & Deployment
Show Gradle tasks (./gradlew :module:build) and Docker snippets only if relevant to the example.
Maintain compatibility with the controller’s clustered deployment model; avoid Spring Boot’s embedded server assumptions.
Documentation
Provide Javadoc on all public classes and methods.
Include inline comments sparingly—only to clarify non-obvious logic.
General Principles
Follow SOLID and keep coupling low.
Re-use helper utilities from com.appdynamics.* and Guava before adding new code.
Ensure thread-safety for shared resources.
Align with the existing test, packaging, and naming conventions visible in the repository.
Adhere to SOLID principles and maintain high cohesion and low coupling in your application design.

