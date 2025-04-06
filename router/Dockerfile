FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    iproute2 \
    net-tools \
    iputils-ping \
    curl \
    cmake g++ libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app


# Dar permisos de ejecución a los scripts
RUN cmake . && make

EXPOSE 50051

# Comando por defecto para el contenedor
CMD ["./router"]
