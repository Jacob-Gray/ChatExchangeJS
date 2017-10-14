FROM node:alpine

ADD . /cejs
WORKDIR /cejs

COPY package.json .

RUN npm install

CMD node src/demo