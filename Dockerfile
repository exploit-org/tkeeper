FROM eclipse-temurin:21-jre-jammy

ARG APP_USER=tkeeper
ARG APP_UID=10001
ARG APP_HOME=/var/lib/tkeeper

RUN useradd -r -u ${APP_UID} -g root -m -d ${APP_HOME} ${APP_USER} \
 && mkdir -p /opt/tkeeper/app ${APP_HOME} \
 && chown -R ${APP_USER}:root /opt/tkeeper ${APP_HOME}

COPY build/docker/tkeeper.jar /opt/tkeeper/app/tkeeper.jar

USER ${APP_USER}
WORKDIR ${APP_HOME}

EXPOSE 8080 9090

CMD ["java", "-jar", "/opt/tkeeper/app/tkeeper.jar"]