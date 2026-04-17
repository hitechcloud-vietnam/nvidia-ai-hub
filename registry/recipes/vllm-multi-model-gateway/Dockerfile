FROM python:3.11-slim

WORKDIR /app

COPY gateway-requirements.txt ./
RUN pip install --no-cache-dir -r gateway-requirements.txt

COPY gateway_app.py ./

EXPOSE 9010

CMD ["uvicorn", "gateway_app:app", "--host", "0.0.0.0", "--port", "9010"]
