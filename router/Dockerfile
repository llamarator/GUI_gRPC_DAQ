FROM ubuntu:latest

# Actualizar el sistema e instalar dependencias necesarias
RUN apt-get update && apt-get install -y \
    iproute2 \
    net-tools \
    iputils-ping \
    curl \
    cmake \
    g++ \
    libboost-all-dev && \
    rm -rf /var/lib/apt/lists/*

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar todo el contenido al contenedor
COPY . /app

# Ejecutar cmake y make para compilar el código
RUN cmake . && make

# Exponer el puerto necesario
EXPOSE 80
#EXPOSE 50051

# Comando por defecto para el contenedor
CMD ["./router"]
