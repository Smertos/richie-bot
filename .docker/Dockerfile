ARG IMAGE_NAME=keymetrics/pm2
ARG IMAGE_VERSION=12-alpine
FROM ${IMAGE_NAME}:${IMAGE_VERSION}

RUN apk add --no-cache bash git

RUN pm2 install pm2-server-monit

WORKDIR /

RUN git clone https://github.com/Smertos/richie-bot.git app

WORKDIR /app

RUN yarn
RUN yarn build

RUN cp config.example.json config.json

CMD yarn start.docker
