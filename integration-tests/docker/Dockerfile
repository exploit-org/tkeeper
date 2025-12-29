FROM eclipse-temurin:21-jdk-jammy AS native-build

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git wget xz-utils \
    build-essential autoconf automake libtool pkg-config m4 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp

RUN git clone https://github.com/jedisct1/libsodium.git \
 && cd libsodium \
 && git checkout 9511c982fb1d046470a8b42aa36556cdb7da15de \
 && ./autogen.sh \
 && ./configure --enable-shared --disable-static --disable-minimal --with-pic \
 && make -j"$(nproc)" \
 && make install

RUN git clone https://github.com/bitcoin-core/secp256k1.git \
 && cd secp256k1 \
 && git checkout 0cdc758a56360bf58a851fe91085a327ec97685a \
 && ./autogen.sh \
 && ./configure --enable-experimental \
                --enable-module-extrakeys \
                --enable-module-schnorrsig \
                --enable-module-recovery \
                --enable-shared \
                --disable-static \
 && make -j"$(nproc)" \
 && make install

RUN wget -O gmp.tar.xz https://ftp.gnu.org/gnu/gmp/gmp-6.3.0.tar.xz \
 && tar -xf gmp.tar.xz \
 && cd gmp-6.3.0 \
 && ./configure --enable-shared --disable-static --enable-fat \
 && make -j"$(nproc)" \
 && make install

RUN ldconfig


FROM eclipse-temurin:21-jre-jammy AS runtime

RUN useradd -r -u 10001 -g root -m -d /var/lib/tkeeper tkeeper \
 && mkdir -p /opt/tkeeper/app /etc/tkeeper /var/lib/tkeeper \
 && chown -R tkeeper:root /opt/tkeeper /etc/tkeeper /var/lib/tkeeper

COPY --from=native-build /usr/local/lib/ /usr/local/lib/
RUN ldconfig

COPY build/docker/tkeeper.jar /opt/tkeeper/app/tkeeper.jar
COPY integration-tests/docker/entrypoint.sh /opt/tkeeper/entrypoint.sh
RUN chmod +x /opt/tkeeper/entrypoint.sh

USER tkeeper
WORKDIR /var/lib/tkeeper

EXPOSE 8080 9090

ENV KEEPER_CONFIG_LOCATION=/etc/tkeeper
ENTRYPOINT ["/opt/tkeeper/entrypoint.sh"]