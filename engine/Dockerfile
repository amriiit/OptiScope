FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends g++ python3 flex bison make && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/optiscope
COPY engine /opt/optiscope/engine
COPY Makefile /opt/optiscope/Makefile
RUN make engine
COPY backend/src/services/sandbox.py /opt/optiscope/sandbox.py
ENV PYTHONDONTWRITEBYTECODE=1
USER 65534:65534
WORKDIR /work
ENTRYPOINT ["python3", "/opt/optiscope/sandbox.py"]
