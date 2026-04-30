# syntax=docker/dockerfile:1.6

# Stage 1: установка зависимостей (кэшируется отдельно от исходного кода)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: сборка production-бандла Vite
FROM node:20-alpine AS build
WORKDIR /app

# Build-time переменные Vite. Coolify передаёт их через --build-arg,
# затем переводим в ENV, чтобы Vite видел их через import.meta.env при сборке.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: раздача статики через nginx
FROM nginx:stable-alpine AS runtime

# Заменяем дефолтный конфиг nginx на наш (SPA-роутинг, gzip, кэш assets)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранную статику
COPY --from=build /app/dist /usr/share/nginx/html

# Порт 3000 внутри контейнера (порт 80 на хосте занят reverse proxy Coolify)
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
