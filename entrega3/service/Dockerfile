FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app/entrega3/service

COPY service/pyproject.toml ./pyproject.toml
COPY service/mira_cu1 ./mira_cu1
RUN pip install --no-cache-dir .

COPY insumos /app/entrega3/insumos
COPY evaluacion /app/entrega3/evaluacion

EXPOSE 8001 8002

