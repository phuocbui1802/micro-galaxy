FROM node:10.16.0-slim

MAINTAINER Le Hai Ninh "ninh@evania-media.com"

RUN apt-get update

RUN apt-get install -y git vim mysql-client

RUN nodejs -v

RUN mkdir -p /usr/src/galaxy
WORKDIR /usr/src/galaxy

COPY package.json .

RUN npm install
RUN npm install -g --unsafe-perm node-sass
RUN npm rebuild node-sass

COPY . .
