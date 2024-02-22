FROM ubuntu:latest

MAINTAINER hqnghi88 <https://github.com/hqnghi88>

LABEL org.label-schema.name="GAMA Headless Docker (1.9.0)" \
		org.label-schema.description="Docker image of GAMA headless" \
		org.label-schema.url="http://gama-platform.org" \
		org.label-schema.vcs-ref=$VCS_REF \
		org.label-schema.vcs-url="https://github.com/gama-platform/gama.docker" \
		org.label-schema.vendor="GAMA Platform" \
		org.label-schema.license="GPL-3.0" 

# Update Ubuntu mirror && install needed software
RUN apt update && \
	apt install -y --no-install-recommends curl ca-certificates unzip 

# Create GAMA workspace
RUN mkdir -p /opt/gama-platform
RUN cd /opt/gama-platform

# Install GAMA v1.9.0 w/o JDK
# RUN curl -o gama.zip -fSL $(curl -s https://api.github.com/repos/gama-platform/gama/releases/tags/1.9.0 | grep "1.9.0/GAMA.*Linux.*.zip" | cut -d ':' -f 2,3 | tr -d \") && \
# 	unzip gama.zip -d /opt/gama-platform
# COPY /mnt/c/git/gama/ummisco.gama.product/target/products/Gama1.7-linux.gtk.x86_64.tar.gz gama.tar.gz

# COPY gama.tar.gz /opt/gama-platform 
# RUN tar -zxf /opt/gama-platform/gama.tar.gz -C /opt/gama-platform


COPY cert.jks /opt/gama-platform 
COPY gama.zip /opt/gama-platform 
RUN unzip /opt/gama-platform/gama.zip -d /opt/gama-platform
# Set absolute path
RUN sed -i 's/$( dirname "${BASH_SOURCE\[0\]}" )/\/opt\/gama-platform\/headless/g' /opt/gama-platform/headless/gama-headless.sh

# Make script executable
RUN chmod +x /opt/gama-platform/Gama /opt/gama-platform/headless/gama-headless.sh

# Release image 
FROM openjdk:17-jdk-alpine
COPY --from=0 /opt/gama-platform /opt/gama-platform

RUN apk --no-cache add bash ttf-dejavu libstdc++ libc6-compat \
	&& ln -s /opt/gama-platform/headless/gama-headless.sh /usr/sbin/gama-headless

# Docker env
WORKDIR /opt/gama-platform/headless

ENTRYPOINT ["gama-headless"]
CMD ["-validate"]
# CMD ["/bin/bash","-c","/opt/gama-platform/headless/gama-headless.sh"]

# export DOCKER_BUILDKIT=0 &&  docker build . --file Dockerfile --tag gamaplatform/mini:alpha && docker-compose up

#docker run --name=gamamini1 gamaplatform/mini:alpha -validate

#wget -o gama.zip https://github.com/gama-platform/gama/releases/download/1.9.0/GAMA_1.9.0_Linux_03.14.23_7f9c33dd.zip
#$ sudo journalctl -f -u nodeserver
#gama-headless.bat -ssocket 6868 -jks C:\git\gama.client\server\.cert\cert.jks -kpwd abcdef -spwd abcdef -v