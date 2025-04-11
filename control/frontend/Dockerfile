# Usar una imagen base de Node.js
FROM node:18-slim

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos del frontend al contenedor
COPY . .

# Instalar dependencias de Node.js
RUN npm install

# Exponer el puerto 3000 para servir el frontend
EXPOSE 3000

# Iniciar el servidor de desarrollo de vite
CMD ["npm", "run", "dev"]
