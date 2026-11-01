FROM node:22-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home haske && mkdir /data && chown haske /data
COPY server.py index.html app.js style.css dynamic.js dynamic.css admin.html admin.js confidentialite.html ./
COPY assets ./assets
COPY --from=frontend /build/dist ./frontend/dist
ENV APP_ENV=production HOST=0.0.0.0 PORT=8000 DATA_DIR=/data
USER haske
EXPOSE 8000
CMD ["python", "server.py"]
