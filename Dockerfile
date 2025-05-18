FROM node:slim

RUN apt-get update
RUN mkdir -p /webtorrent
RUN mkdir -p /var/app
WORKDIR /var/app/
COPY . .
RUN yarn
EXPOSE 7071
ENTRYPOINT ["node", "/var/app/webtorrent-nest.js"]
