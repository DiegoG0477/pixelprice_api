# Usa una imagen base de Node.js LTS (Long Term Support) sobre Debian Bullseye Slim
FROM node:lts-bullseye-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia primero package.json y package-lock.json (o pnpm-lock.yaml si usas pnpm)
# Esto aprovecha el cache de capas de Docker. Si estos archivos no cambian,
# no se reinstalarán las dependencias en cada build.
COPY package*.json ./
# Si usas pnpm:
COPY pnpm-lock.yaml ./
COPY package.json ./

#RUN npm install

RUN npm install -g pnpm # Instala pnpm globalmente si no está en la imagen base
RUN pnpm install --frozen-lockfile

COPY diagnow-firebase-admin.json ./

ENV GOOGLE_APPLICATION_CREDENTIALS=/app/diagnow-firebase-admin.json

COPY . .

EXPOSE 8080

CMD [ "npm", "run", "dev" ]